import { Component } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TextFieldModule } from '@angular/cdk/text-field';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SupplierSelectorComponent } from '../../../../components/supplier-selector/supplier-selector.component';
import { HeaderTitleComponent } from '../../../../components/header-title/header-title.component';
import { WysiwygComponent } from '../../../../components/wysiwyg/wysiwyg.component';
import { ApiService } from '../../../../services/api.service';
import { PURCHASE_TYPE_LABELS } from '../../../../constants/purchase-type-label';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * 6.4.1 Legal Document (Akta, SBU, ...).
 * Document type is picked from a fixed list (with a "Lainnya" escape hatch) so
 * the data stays consistent, and each line carries a validity window because
 * most legal documents expire and need renewal tracking.
 */
@Component({
  selector: 'app-purchase-order-create-641',
  standalone: true,
  providers: [provideNgxMask()],
  imports: [
    TranslatePipe,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule,
    MatSlideToggleModule,
    TextFieldModule,
    NgxMaskDirective,
    HeaderTitleComponent,
    WysiwygComponent,
  ],
  templateUrl: './purchase-order-create-641.component.html',
  styleUrl: './purchase-order-create-641.component.scss',
})
export class PurchaseOrderCreate641Component {
  constructor(
    private dialog: MatDialog,
    private formBuilder: FormBuilder,
    private apiService: ApiService,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {}

  isSubmitting = false;
  /** common legal documents for an Indonesian construction company */
  documentTypes: string[] = [
    'Akta Pendirian',
    'Akta Perubahan',
    'SBU (Sertifikat Badan Usaha)',
    'SKK Konstruksi',
    'SKA / SKT',
    'ISO 9001',
    'ISO 14001',
    'ISO 45001',
    'KTA Asosiasi (GAPENSI, AKI, dll)',
    'NIB / Perizinan OSS',
    'Legalisir / Waarmerking Notaris',
    'Lainnya',
  ];

  units: string[] = ['dokumen', 'LS', 'set', 'tahun', 'paket'];

  get typeLabel(): string {
    return PURCHASE_TYPE_LABELS['6.4.1'] || 'Legal Document';
  }

  isOther(i: number): boolean {
    return this.getFormGroupAt(i).value.documentType === 'Lainnya';
  }

  /** what actually gets written to the `task` column */
  resolvedType(i: number): string {
    const v = this.getFormGroupAt(i).value;
    return v.documentType === 'Lainnya'
      ? v.customType || 'Lainnya'
      : v.documentType || '';
  }

  formGroup: FormGroup = new FormGroup({
    date: new FormControl('', Validators.required),
    purchaseType: new FormControl('6.4.1'),
    supplierID: new FormControl('', Validators.required),
    supplierName: new FormControl('', Validators.required),
    supplierAddress: new FormControl('', Validators.required),
    projectName: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[A-Z0-9]{4,5}$/),
    ]),
    paymentTerm: new FormControl('', Validators.required),
    creditTerm: new FormControl(0, Validators.required),
    prepaidTerm: new FormControl(0, [
      Validators.required,
      Validators.min(0),
      Validators.max(100),
    ]),
    notes: new FormControl(''),
    lines: new FormArray([]),
    includePPN: new FormControl(true),
  });

  ngOnInit(): void {
    if (this.t.length === 0) this.addLine();
  }

  get f() {
    return this.formGroup.controls;
  }
  get t() {
    return this.formGroup.get('lines') as FormArray;
  }
  getFormGroupAt(i: number) {
    return this.t.at(i) as FormGroup;
  }
  removeAt(i: number) {
    this.t.removeAt(i);
  }

  private buildLine(): FormGroup {
    return this.formBuilder.group({
      documentType: ['', Validators.required],
      customType: [''], // used when documentType === 'Lainnya'
      documentNumber: [''],
      validFrom: [''],
      validUntil: [''],
      quantity: [1, [Validators.required, Validators.min(0.01)]],
      unit: ['dokumen', Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
    });
  }

  /** "Lainnya" makes the free-text name mandatory */
  onDocumentTypeChange(i: number) {
    const g = this.getFormGroupAt(i);
    const custom = g.get('customType');
    if (g.get('documentType')?.value === 'Lainnya') {
      custom?.setValidators([Validators.required, Validators.maxLength(100)]);
    } else {
      custom?.clearValidators();
    }
    custom?.updateValueAndValidity();
  }
  addLine() {
    this.t.push(this.buildLine());
  }

  /** LS (lump sum) locks the volume to 1 */
  onUnitChange(i: number) {
    const g = this.getFormGroupAt(i);
    const qty = g.get('quantity');
    if (g.get('unit')?.value === 'LS') {
      qty?.setValue(1);
      qty?.disable();
    } else {
      qty?.enable();
    }
  }

  lineTotal(i: number): number {
    const g = this.getFormGroupAt(i).getRawValue();
    return (Number(g.price) || 0) * (Number(g.quantity) || 0);
  }
  get rawTotal(): number {
    return this.t.controls.reduce((acc, _c, i) => acc + this.lineTotal(i), 0);
  }
  get subTotal(): number {
    return this.formGroup.get('includePPN')?.value
      ? this.rawTotal / 1.11
      : this.rawTotal;
  }
  get ppnAmount(): number {
    return this.formGroup.get('includePPN')?.value
      ? this.rawTotal - this.rawTotal / 1.11
      : 0;
  }
  get grandTotal(): number {
    return this.rawTotal;
  }

  openSupplierSelector() {
    this.dialog
      .open(SupplierSelectorComponent, {})
      .afterClosed()
      .subscribe((data) => {
        if (data) {
          this.formGroup.patchValue({
            supplierID: data.id,
            supplierName: data.name,
            supplierAddress: data.address,
          });
        }
      });
  }

  toUpperCase() {
    const v = this.formGroup.get('projectName')?.value;
    if (v && v.toUpperCase() !== v)
      this.formGroup.patchValue({ projectName: v.toUpperCase() });
  }

  private toISO(d: any): string | null {
    return d ? new Date(d).toISOString().split('T')[0] : null;
  }

  formatData() {
    const includePPN = this.formGroup.get('includePPN')?.value;
    const dpp = includePPN ? this.rawTotal / 1.11 : this.rawTotal;
    const ppn = includePPN ? 11 : 0;
    const projectCode = this.formGroup.get('projectName')?.value;
    return {
      date: this.toISO(this.formGroup.get('date')?.value),
      supplierID: this.formGroup.get('supplierID')?.value,
      purchaseType: '6.4.1',
      projectName: projectCode,
      projectCode: projectCode,
      name: '',
      dpp: dpp,
      ppn: ppn,
      payment_term: this.formGroup.get('paymentTerm')?.value,
      templateVersion: '1.0',
      billing_requirements: {},
      items: this.t.controls.map((c, i) => {
        const x = c.getRawValue();
        return {
          task: this.resolvedType(i), // jenis dokumen
          quantity: x.unit === 'LS' ? 1 : x.quantity,
          price: x.price,
          unit: x.unit,
          remarks_1: this.toISO(x.validFrom), // berlaku dari
          remarks_2: this.toISO(x.validUntil), // berlaku sampai
          remarks_3: x.documentNumber, // nomor dokumen
        };
      }),
      customData: {
        paymentTerm: this.formGroup.get('paymentTerm')?.value,
        creditTerm: this.formGroup.get('creditTerm')?.value,
        prepaidTerm: this.formGroup.get('prepaidTerm')?.value,
        notes: this.formGroup.get('notes')?.value,
      },
    };
  }

  onSubmit() {
    this.isSubmitting = true;
    this.apiService
      .post('purchase-orders', this.formatData())
      .subscribe({
        next: (res: any) => {
          this.snackBar.open(
            `Purchase order ${res?.purchase_order_name ?? ''} berhasil dibuat`,
            'Close',
            { duration: 3000 },
          );
          this.router.navigate(['/Purchase-order']);
        },
        error: (error) =>
          this.snackBar.open(
            error?.error?.detail ?? 'Gagal membuat purchase order',
            'Close',
            { duration: 3000 },
          ),
      })
      .add(() => (this.isSubmitting = false));
  }
}
