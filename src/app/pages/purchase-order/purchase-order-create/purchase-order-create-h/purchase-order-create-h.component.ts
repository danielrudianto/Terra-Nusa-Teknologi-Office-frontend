import { Component } from '@angular/core';
import {
  FormArray, FormBuilder, FormControl, FormGroup, FormsModule,
  ReactiveFormsModule, Validators,
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
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SupplierSelectorComponent } from '../../../../components/supplier-selector/supplier-selector.component';
import { HeaderTitleComponent } from '../../../../components/header-title/header-title.component';
import { WysiwygComponent } from '../../../../components/wysiwyg/wysiwyg.component';
import { ApiService } from '../../../../services/api.service';

@Component({
  selector: 'app-purchase-order-create-h',
  standalone: true,
  providers: [provideNgxMask()],
  imports: [
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
    NgxMaskDirective,
    HeaderTitleComponent,
    WysiwygComponent,
  ],
  templateUrl: './purchase-order-create-h.component.html',
  styleUrl: './purchase-order-create-h.component.scss',
})
export class PurchaseOrderCreateHComponent {
  constructor(
    private dialog: MatDialog,
    private formBuilder: FormBuilder,
    private apiService: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {}

  isSubmitting = false;

  /** null until the user picks H1 / H2 on the first screen */
  subType: 'H1' | 'H2' | null = null;

  units: string[] = [
    'LS', 'titik', 'm', 'm2', 'm3', 'kg', 'ton', 'unit', 'hari', 'bulan',
  ];

  formGroup: FormGroup = new FormGroup({
    date: new FormControl('', Validators.required),
    purchaseType: new FormControl(''),
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
    scopes: new FormArray([]),
    workers: new FormArray([]),
    includePPN: new FormControl(true),
  });

  get f() {
    return this.formGroup.controls;
  }
  get t() {
    return this.formGroup.get('scopes') as FormArray;
  }
  get w() {
    return this.formGroup.get('workers') as FormArray;
  }
  getFormGroupAt(i: number) {
    return this.t.at(i) as FormGroup;
  }
  getWorkerAt(i: number) {
    return this.w.at(i) as FormGroup;
  }

  get isEntity(): boolean {
    return this.subType === 'H1';
  }

  get subTypeLabel(): string {
    return this.subType === 'H1'
      ? 'Badan usaha (PT / CV)'
      : 'Non-badan usaha (mandor / perorangan)';
  }

  /** first screen: pick the subcontractor kind */
  chooseSubType(value: 'H1' | 'H2') {
    this.subType = value;
    this.formGroup.patchValue({ purchaseType: value });
    if (this.t.length === 0) this.addScope();
    if (value === 'H2') {
      if (this.w.length === 0) this.addWorker();
    } else {
      this.w.clear(); // entities don't carry worker data
    }
  }

  resetSubType() {
    this.subType = null;
    this.formGroup.patchValue({ purchaseType: '' });
  }

  // ---- scope of work ----
  private buildScope(): FormGroup {
    return this.formBuilder.group({
      task: ['', [Validators.required, Validators.maxLength(100)]],
      quantity: [1, [Validators.required, Validators.min(0.01)]],
      unit: ['LS', Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
    });
  }
  addScope() {
    this.t.push(this.buildScope());
  }
  removeScopeAt(i: number) {
    this.t.removeAt(i);
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

  // ---- workers (H2 only) ----
  private buildWorker(): FormGroup {
    return this.formBuilder.group({
      name: ['', Validators.required],
      idCard: [''],
    });
  }
  addWorker() {
    this.w.push(this.buildWorker());
  }
  removeWorkerAt(i: number) {
    this.w.removeAt(i);
  }

  // ---- totals ----
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
    if (v && v.toUpperCase() !== v) {
      this.formGroup.patchValue({ projectName: v.toUpperCase() });
    }
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
      purchaseType: this.subType, // 'H1' | 'H2'
      projectName: projectCode,
      projectCode: projectCode,
      name: '',
      dpp: dpp,
      ppn: ppn,
      payment_term: this.formGroup.get('paymentTerm')?.value,
      templateVersion: '1.0',
      billing_requirements: {},
      // scope of work -> purchase_order_items
      items: this.t.controls.map((c) => {
        const x = c.getRawValue();
        return {
          task: x.task,
          quantity: x.unit === 'LS' ? 1 : x.quantity,
          price: x.price,
          unit: x.unit,
        };
      }),
      customData: {
        subcontractorType: this.subType,
        isBusinessEntity: this.isEntity,
        paymentTerm: this.formGroup.get('paymentTerm')?.value,
        creditTerm: this.formGroup.get('creditTerm')?.value,
        prepaidTerm: this.formGroup.get('prepaidTerm')?.value,
        // worker roster only applies to non-entity subcontractors (H2)
        workers: this.isEntity
          ? []
          : this.w.controls.map((c) => {
              const x = c.getRawValue();
              return { name: x.name, idCard: x.idCard };
            }),
        // rich-text agreement points / notes (HTML string)
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