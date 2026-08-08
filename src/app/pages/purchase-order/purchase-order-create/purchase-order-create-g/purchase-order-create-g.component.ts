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
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { SupplierSelectorComponent } from '../../../../components/supplier-selector/supplier-selector.component';
import { MasterItemSelectorComponent } from '../../../../components/master-item-selector/master-item-selector.component';
import { MatButtonModule } from '@angular/material/button';
import { HeaderTitleComponent } from '../../../../components/header-title/header-title.component';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ApiService } from '../../../../services/api.service';
import {
  buildClauseHtml,
  latestClauseVersion,
} from '../../../../constants/clause-templates';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-purchase-order-create-g',
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
    HeaderTitleComponent,
    MatSlideToggleModule,
    NgxMaskDirective,
  ],
  templateUrl: './purchase-order-create-g.component.html',
  styleUrl: './purchase-order-create-g.component.scss',
})
export class PurchaseOrderCreateGComponent {
  constructor(
    private dialog: MatDialog,
    private formBuilder: FormBuilder,
    private apiService: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {}

  isSubmitting: boolean = false;

  units: string[] = [
    'pcs',
    'set',
    'Kg',
    'gram',
    'ton',
    'm',
    'm2',
    'm3',
    'batang',
    'lembar',
    'roll',
    'dus',
    'sak',
    'pasang',
    'lusin',
    'unit',
    'liter',
    'box',
    'kaleng',
  ];

  formGroup: FormGroup = new FormGroup({
    date: new FormControl('', Validators.required),
    purchaseType: new FormControl('G'),
    supplierID: new FormControl('', Validators.required),
    supplierName: new FormControl('', Validators.required),
    supplierAddress: new FormControl('', Validators.required),
    projectName: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[A-Z0-9]{4,5}$/),
    ]),
    deliveryMethod: new FormControl('', Validators.required),
    deliveryAddress: new FormControl('', Validators.required),
    paymentTerm: new FormControl('', Validators.required),
    creditTerm: new FormControl(0, Validators.required),
    prepaidTerm: new FormControl(0, [
      Validators.required,
      Validators.min(0),
      Validators.max(100),
    ]),
    supplierPICName: new FormControl('', Validators.required),
    supplierPICPhoneNumber: new FormControl('', Validators.required),
    officePICName: new FormControl('', Validators.required),
    officePICPhoneNumber: new FormControl('', Validators.required),
    // items are picked from the master-item catalog (type G)
    purchase_order: new FormArray([]),
    additionalClauses: new FormArray([]),
    includePPN: new FormControl(true),
  });

  get f() {
    return this.formGroup.controls;
  }

  get t() {
    return this.formGroup.get('purchase_order') as FormArray;
  }

  templateVersion = latestClauseVersion('G');

  // --- poin perjanjian tambahan (custom, ditulis user) ---
  get additionalClauses(): FormArray {
    return this.formGroup.get('additionalClauses') as FormArray;
  }

  addClause() {
    this.additionalClauses.push(new FormControl(''));
  }

  removeClause(i: number) {
    this.additionalClauses.removeAt(i);
  }

  clauseCtrlAt(i: number): FormControl {
    return this.additionalClauses.at(i) as FormControl;
  }

  private get additionalClauseValues(): string[] {
    return (this.additionalClauses.value as string[]) || [];
  }

  private readonly CREDIT_TERMS = ['PPD', 'CR', 'CRD'];
  private readonly PREPAID_TERMS = ['PPD', 'CRD'];

  get creditEnabled(): boolean {
    return this.CREDIT_TERMS.includes(this.formGroup.get('paymentTerm')?.value);
  }
  get prepaidEnabled(): boolean {
    return this.PREPAID_TERMS.includes(
      this.formGroup.get('paymentTerm')?.value,
    );
  }

  onPaymentTermChange() {
    const credit = this.formGroup.get('creditTerm');
    const prepaid = this.formGroup.get('prepaidTerm');
    if (this.creditEnabled) {
      credit?.enable();
    } else {
      credit?.setValue(0);
      credit?.disable();
    }
    if (this.prepaidEnabled) {
      prepaid?.enable();
    } else {
      prepaid?.setValue(0);
      prepaid?.disable();
    }
  }

  private clauseContext() {
    const v = this.formGroup.getRawValue();
    return {
      paymentTerm: v.paymentTerm,
      creditTerm: v.creditTerm,
      prepaidTerm: v.prepaidTerm,
      deliveryMethod: v.deliveryMethod,
      deliveryAddress: v.deliveryAddress,
      supplierPICName: v.supplierPICName,
      supplierPICPhoneNumber: v.supplierPICPhoneNumber,
      officePICName: v.officePICName,
      officePICPhoneNumber: v.officePICPhoneNumber,
    };
  }

  get clausePreview(): string {
    return buildClauseHtml(
      'G',
      this.clauseContext(),
      this.templateVersion,
      this.additionalClauseValues,
    );
  }

  getFormGroupAt(i: number) {
    return this.t.at(i) as FormGroup;
  }

  removeAt(i: number) {
    this.t.removeAt(i);
  }

  private buildItemGroup(item: any): FormGroup {
    return this.formBuilder.group({
      equipment_id: [item.id, Validators.required],
      sku: [item.sku],
      description: [item.description],
      unit: [item.unit || '', Validators.required],
      quantity: [1, [Validators.required, Validators.min(0.01)]],
      price: [0, [Validators.required, Validators.min(0)]],
      remarks: [''],
    });
  }

  openItemSelector() {
    this.dialog
      .open(MasterItemSelectorComponent, {
        data: { purchaseType: 'G' },
        width: '560px',
        maxWidth: '94vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((item) => {
        if (!item) return;
        // prevent adding the exact same catalog item twice
        const exists = this.t.value.some(
          (x: any) => x.equipment_id === item.id,
        );
        if (exists) {
          this.snackBar.open('Barang sudah ada di daftar', 'Close', {
            duration: 2500,
          });
          return;
        }
        this.t.push(this.buildItemGroup(item));
      });
  }

  // ----- live summary (read-only, safe getters) -----
  get rawTotal(): number {
    return this.t.value.reduce(
      (acc: number, x: any) =>
        acc + (Number(x.price) || 0) * (Number(x.quantity) || 0),
      0,
    );
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

  get lineTotal(): (i: number) => number {
    return (i: number) => {
      const g = this.getFormGroupAt(i).value;
      return (Number(g.price) || 0) * (Number(g.quantity) || 0);
    };
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

  formatData() {
    const dpp = this.formGroup.get('includePPN')?.value
      ? this.t.value.reduce(
          (acc: any, x: any) => acc + (x.price * x.quantity) / 1.11,
          0,
        )
      : this.t.value.reduce(
          (acc: any, x: any) => acc + x.price * x.quantity,
          0,
        );
    const ppn = this.formGroup.get('includePPN')?.value ? 11 : 0;
    const projectCode = this.formGroup.get('projectName')?.value;
    return {
      date: this.formGroup.get('date')?.value.toISOString().split('T')[0],
      supplierID: this.formGroup.get('supplierID')?.value,
      purchaseType: this.formGroup.get('purchaseType')?.value,
      projectName: projectCode,
      projectCode: projectCode,
      name: '',
      dpp: dpp,
      ppn: ppn,
      payment_term: this.formGroup.get('paymentTerm')?.value,
      templateVersion: this.templateVersion,
      billing_requirements: {},
      customData: {
        deliveryMethod: this.formGroup.get('deliveryMethod')?.value,
        deliveryAddress: this.formGroup.get('deliveryAddress')?.value,
        paymentTerm: this.formGroup.get('paymentTerm')?.value,
        creditTerm: this.formGroup.getRawValue().creditTerm,
        prepaidTerm: this.formGroup.getRawValue().prepaidTerm,
        supplierPICName: this.formGroup.get('supplierPICName')?.value,
        supplierPICPhoneNumber: this.formGroup.get('supplierPICPhoneNumber')
          ?.value,
        officePICName: this.formGroup.get('officePICName')?.value,
        officePICPhoneNumber: this.formGroup.get('officePICPhoneNumber')?.value,
        // locked auto-clause (poin 1-9) + poin tambahan user, sudah jadi HTML
        notes: this.clausePreview,
        // simpan poin tambahan mentah biar bisa di-render ulang persis
        additionalClauses: this.additionalClauseValues
          .map((x) => (x || '').trim())
          .filter((x) => x.length > 0),
        // catalog-referenced items -> maps to purchase_order_items later
        purchase_order: this.t.value.map((x: any) => ({
          equipment_id: x.equipment_id,
          sku: x.sku,
          description: x.description,
          quantity: x.quantity,
          price: x.price,
          unit: x.unit,
          remarks: x.remarks,
        })),
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
        error: (error) => {
          this.snackBar.open(
            error?.error?.detail ?? 'Gagal membuat purchase order',
            'Close',
            { duration: 3000 },
          );
        },
      })
      .add(() => {
        this.isSubmitting = false;
      });
  }

  toUpperCase() {
    const value = this.formGroup.get('projectName')?.value;
    if (value && value.toUpperCase() !== value) {
      this.formGroup.patchValue({ projectName: value.toUpperCase() });
    }
  }
}
