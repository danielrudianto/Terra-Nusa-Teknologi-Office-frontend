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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { SupplierSelectorComponent } from '../../../../components/supplier-selector/supplier-selector.component';
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

@Component({
  selector: 'app-purchase-order-create-5112',
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
    MatCheckboxModule,
    MatButtonModule,
    HeaderTitleComponent,
    MatSlideToggleModule,
    NgxMaskDirective,
  ],
  templateUrl: './purchase-order-create-5112.component.html',
  styleUrl: './purchase-order-create-5112.component.scss',
})
export class PurchaseOrderCreate5112Component {
  constructor(
    private dialog: MatDialog,
    private formBuilder: FormBuilder,
    private apiService: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {}

  isSubmitting: boolean = false;

  templateVersion = latestClauseVersion('5.1.12');

  // satuan yang relevan buat software
  units: string[] = [
    'account',
    'license',
    'user',
    'seat',
    'domain',
    'kontrak',
    'device',
    'subscription',
    'unit',
  ];

  durationUnits: string[] = ['bulan', 'tahun'];

  formGroup: FormGroup = new FormGroup({
    date: new FormControl('', Validators.required),
    purchaseType: new FormControl('5.1.12'),
    supplierID: new FormControl('', Validators.required),
    supplierName: new FormControl('', Validators.required),
    supplierAddress: new FormControl('', Validators.required),
    projectName: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[A-Z0-9]{4,5}$/),
    ]),
    // payment
    paymentTerm: new FormControl('', Validators.required),
    creditTerm: new FormControl(0, Validators.required),
    prepaidTerm: new FormControl(0, [
      Validators.required,
      Validators.min(0),
      Validators.max(100),
    ]),
    // software-specific
    isSubscription: new FormControl(true),
    subscriptionStartDate: new FormControl(''),
    subscriptionDuration: new FormControl(1),
    subscriptionDurationUnit: new FormControl('tahun'),
    autoRenew: new FormControl(false),
    licenseDelivery: new FormControl('account', Validators.required),
    // contacts
    supplierPICName: new FormControl('', Validators.required),
    supplierPICPhoneNumber: new FormControl('', Validators.required),
    officePICName: new FormControl('', Validators.required),
    officePICPhoneNumber: new FormControl('', Validators.required),
    // free-form items
    purchase_order: new FormArray([]),
    additionalClauses: new FormArray([]),
    includePPN: new FormControl(true),
  });

  ngOnInit(): void {
    this.onPaymentTermChange();
    this.onSubscriptionChange();
    if (this.t.length === 0) this.addItem();
  }

  get f() {
    return this.formGroup.controls;
  }

  get t() {
    return this.formGroup.get('purchase_order') as FormArray;
  }

  // --- item bebas (bukan dari katalog) ---
  private buildItemGroup(): FormGroup {
    return this.formBuilder.group({
      description: ['', Validators.required],
      unit: ['account', Validators.required],
      quantity: [1, [Validators.required, Validators.min(0.01)]],
      price: [0, [Validators.required, Validators.min(0)]],
      remarks: [''],
    });
  }

  addItem() {
    this.t.push(this.buildItemGroup());
  }

  getFormGroupAt(i: number) {
    return this.t.at(i) as FormGroup;
  }

  removeAt(i: number) {
    this.t.removeAt(i);
    if (this.t.length === 0) this.addItem();
  }

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

  private get additionalClauseValues(): string[] {
    return (this.additionalClauses.value as string[]) || [];
  }

  // --- subscription toggle ---
  get isSubscription(): boolean {
    return !!this.formGroup.get('isSubscription')?.value;
  }

  onSubscriptionChange() {
    const start = this.formGroup.get('subscriptionStartDate');
    const dur = this.formGroup.get('subscriptionDuration');
    const durUnit = this.formGroup.get('subscriptionDurationUnit');
    const renew = this.formGroup.get('autoRenew');
    if (this.isSubscription) {
      start?.enable();
      dur?.enable();
      durUnit?.enable();
      renew?.enable();
    } else {
      start?.setValue('');
      start?.disable();
      dur?.setValue(0);
      dur?.disable();
      durUnit?.disable();
      renew?.setValue(false);
      renew?.disable();
    }
  }

  // --- payment logic (sama kaya G/C) ---
  private readonly CREDIT_TERMS = ['PPD', 'CR', 'CRD'];
  private readonly PREPAID_TERMS = ['PPD', 'CRD'];

  get creditEnabled(): boolean {
    return this.CREDIT_TERMS.includes(this.formGroup.get('paymentTerm')?.value);
  }
  get prepaidEnabled(): boolean {
    return this.PREPAID_TERMS.includes(this.formGroup.get('paymentTerm')?.value);
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

  // ----- live summary -----
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

  private displayDate(v: any): string {
    if (!v) return '';
    try {
      const d = v instanceof Date ? v : new Date(v);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  }

  private clauseContext() {
    const v = this.formGroup.getRawValue();
    return {
      paymentTerm: v.paymentTerm,
      creditTerm: v.creditTerm,
      prepaidTerm: v.prepaidTerm,
      supplierPICName: v.supplierPICName,
      supplierPICPhoneNumber: v.supplierPICPhoneNumber,
      officePICName: v.officePICName,
      officePICPhoneNumber: v.officePICPhoneNumber,
      softwareIsSubscription: v.isSubscription,
      subscriptionStartDate: this.displayDate(v.subscriptionStartDate),
      subscriptionDuration: v.subscriptionDuration,
      subscriptionDurationUnit: v.subscriptionDurationUnit,
      autoRenew: v.autoRenew,
      licenseDelivery: v.licenseDelivery,
    };
  }

  get clausePreview(): string {
    return buildClauseHtml(
      '5.1.12',
      this.clauseContext(),
      this.templateVersion,
      this.additionalClauseValues,
    );
  }

  formatData() {
    const v = this.formGroup.getRawValue();
    const dpp = this.formGroup.get('includePPN')?.value
      ? this.t.value.reduce(
          (acc: any, x: any) => acc + (x.price * x.quantity) / 1.11,
          0,
        )
      : this.t.value.reduce((acc: any, x: any) => acc + x.price * x.quantity, 0);
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
        paymentTerm: v.paymentTerm,
        creditTerm: v.creditTerm,
        prepaidTerm: v.prepaidTerm,
        isSubscription: v.isSubscription,
        subscriptionStartDate: v.subscriptionStartDate
          ? new Date(v.subscriptionStartDate).toISOString().split('T')[0]
          : null,
        subscriptionDuration: v.subscriptionDuration,
        subscriptionDurationUnit: v.subscriptionDurationUnit,
        autoRenew: v.autoRenew,
        licenseDelivery: v.licenseDelivery,
        supplierPICName: v.supplierPICName,
        supplierPICPhoneNumber: v.supplierPICPhoneNumber,
        officePICName: v.officePICName,
        officePICPhoneNumber: v.officePICPhoneNumber,
        notes: this.clausePreview,
        additionalClauses: this.additionalClauseValues
          .map((x) => (x || '').trim())
          .filter((x) => x.length > 0),
        purchase_order: this.t.value.map((x: any) => ({
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
    if (this.formGroup.invalid) {
      this.formGroup.markAllAsTouched();
      return;
    }
    this.isSubmitting = true;
    this.apiService.post('purchase-orders', this.formatData()).subscribe({
      next: (res: any) => {
        this.snackBar.open(
          `Purchase order ${res?.purchase_order_name ?? ''} berhasil dibuat`,
          'Close',
          { duration: 3000 },
        );
        this.router.navigate(['/Purchase-order']);
      },
      error: (error) => {
        this.isSubmitting = false;
        this.snackBar.open(
          error?.error?.detail ?? 'Gagal membuat purchase order',
          'Close',
          { duration: 3000 },
        );
      },
    });
  }
}