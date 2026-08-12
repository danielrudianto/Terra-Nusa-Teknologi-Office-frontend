import { Component, inject } from '@angular/core';
import { ClauseLineComponent } from '../../../../components/clause-line/clause-line.component';
import { printPurchaseOrderB } from '../../../../helpers/purchase-order-b.helper';
import { PurchaseOrderTypeSwitcher } from '../../../../services/purchase-order-type-switcher.service';
import { PURCHASE_TYPE_LABELS } from '../../../../constants/purchase-type-label.constant';
import { PphSelectorComponent } from '../../../../components/pph-selector/pph-selector.component';
import { IPPh } from '../../../../utils/pph';
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
  buildClauseLines,
  latestClauseVersion,
} from '../../../../constants/clause-templates';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-purchase-order-create-5112',
  providers: [provideNgxMask()],
  imports: [
    ClauseLineComponent,
    TranslatePipe,
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

  /**
   * Satuan berubah pada satu baris.
   *
   * Untuk satuan borongan (LS), volumenya dikunci pada 1. Nilainya memang
   * selalu dihitung satu saat menjumlahkan, sehingga membiarkan kolomnya
   * dapat diisi berarti menawarkan angka yang diabaikan diam-diam — dan yang
   * mengisinya baru sadar setelah totalnya tidak sesuai harapan.
   */
  onUnitChange(i: number): void {
    const g = this.getFormGroupAt(i);
    const qty = g.get('quantity');
    if (String(g.get('unit')?.value || '').toUpperCase() === 'LS') {
      qty?.setValue(1);
      qty?.disable();
    } else {
      qty?.enable();
    }
  }
  /** Kode jenis PO, dipakai pada pill di kepala halaman. */
  get typeCode(): string {
    return '5.1.12';
  }

  /** Nama jenis PO, dipakai pada pill di kepala halaman. */
  get typeLabel(): string {
    return PURCHASE_TYPE_LABELS['5.1.12'] || '';
  }

  private readonly typeSwitcher = inject(PurchaseOrderTypeSwitcher);

  /** Buka pemilih jenis PO; isian yang sudah ada dikonfirmasi lebih dulu. */
  onChangeType() {
    this.typeSwitcher.open(this.formGroup?.dirty === true);
  }
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
    supplierNpwp: new FormControl(''),
    /*
     * Pengeluaran ini selalu dibebankan ke PUSAT, tidak pernah ke proyek.
     *
     * Nilainya dikunci, bukan sekadar diisikan sebagai bawaan: bila masih
     * dapat diubah, cepat atau lambat ada yang membebankannya ke kode proyek
     * — dan biaya yang salah pos baru ketahuan saat laporan per proyek
     * dibaca, ketika dokumennya sudah lama tersimpan.
     */
    projectName: new FormControl({ value: 'PUSAT', disabled: true }, [
      Validators.required,
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
    // Tenggat pemberitahuan sebelum perpanjangan otomatis; pasangan wajib
    // dari auto-renew agar perpanjangan tidak terjadi diam-diam.
    renewalNoticeDays: new FormControl(30, [Validators.min(0)]),
    // Masa pengambilan data setelah langganan berakhir.
    dataRetrievalDays: new FormControl(30, [Validators.min(0)]),
    // Jumlah pengguna; dikosongkan bila tidak dibatasi per-seat.
    userSeatCount: new FormControl(null),
    // Sewa server, domain, dan langganan aplikasi umumnya objek pemotongan.
    pphCode: new FormControl(''),
    pphTaxObject: new FormControl(''),
    pphPercentage: new FormControl(0),
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

  // ----- live summary -----
  get rawTotal(): number {
    return this.t.value.reduce(
      (acc: number, x: any) =>
        acc + (Number(x.price) || 0) * (Number(x.quantity) || 0),
      0,
    );
  }

  get subTotal(): number {
    // Harga yang diisi user adalah DPP; PPN ditambahkan di atasnya.
    return this.rawTotal;
  }

  get ppnAmount(): number {
    return this.formGroup.get('includePPN')?.value ? this.rawTotal * 0.11 : 0;
  }

  get grandTotal(): number {
    return this.subTotal + this.ppnAmount;
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
            // Diambil hanya bila terisi; vendor perorangan kerap
            // belum ber-NPWP, dan baris kosong pada dokumen resmi
            // lebih mengganggu daripada tidak ada barisnya.
            supplierNpwp: data.npwp || '',
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
      renewalNoticeDays: v.renewalNoticeDays,
      dataRetrievalDays: v.dataRetrievalDays,
      userSeatCount: v.userSeatCount,
      pphCode: v.pphCode,
      pphTaxObject: v.pphTaxObject,
      pphPercentage: v.pphPercentage,
    };
  }

  openPphSelector() {
    this.dialog
      .open(PphSelectorComponent, {})
      .afterClosed()
      .subscribe((data: IPPh) => {
        if (!data) return;
        this.formGroup.patchValue({
          pphCode: data.code,
          pphTaxObject: data.taxObjectName,
          pphPercentage: data.tariff,
        });
      });
  }

  clearPph() {
    this.formGroup.patchValue({
      pphCode: '',
      pphTaxObject: '',
      pphPercentage: 0,
    });
  }

  /**
   * Ketentuan baku yang akan tercetak, ditampilkan sejak awal.
   *
   * Dirakit dari template yang sama dengan pencetakan, sehingga yang terbaca
   * di layar tidak mungkin berbeda dari yang keluar di dokumen.
   */
  get clausePreview(): (string | string[])[] {
    return buildClauseLines(
      '5.1.12',
      this.clauseContext(),
      this.templateVersion,
      this.additionalClauseValues,
    );
  }

  isSubList(x: string | string[]): boolean {
    return Array.isArray(x);
  }
  asList(x: string | string[]): string[] {
    return Array.isArray(x) ? x : [];
  }
  asText(x: string | string[]): string {
    return Array.isArray(x) ? '' : String(x ?? '');
  }

  formatData() {
    const v = this.formGroup.getRawValue();
    const dpp = this.t.value.reduce(
      (acc: any, x: any) =>
        acc + (Number(x.price) || 0) * (Number(x.quantity) || 0),
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
      // Baris item PO (tanpa katalog barang — deskripsi diketik manual).
      items: this.t.controls.map((c) => {
        const x = c.getRawValue();
        return {
          item_id: null,
          task: x.description,
          quantity: x.unit === 'LS' ? 1 : x.quantity,
          price: x.price,
          unit: x.unit,
          remarks_1: x.remarks,
        };
      }),
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
        renewalNoticeDays: v.renewalNoticeDays,
        dataRetrievalDays: v.dataRetrievalDays,
        userSeatCount: v.userSeatCount,
        pphCode: v.pphCode,
        pphTaxObject: v.pphTaxObject,
        pphPercentage: v.pphPercentage,
        supplierPICName: v.supplierPICName,
        supplierPICPhoneNumber: v.supplierPICPhoneNumber,
        officePICName: v.officePICName,
        officePICPhoneNumber: v.officePICPhoneNumber,
        // Poin perjanjian dirakit ulang dari templateVersion + data,
        // tidak disimpan sebagai teks.
        additionalClauses: this.additionalClauseValues
          .map((x) => (x || '').trim())
          .filter((x) => x.length > 0),
      },
    };
  }

  /**
   * Susun data cetak.
   *
   * Perangkat lunak dan langganan adalah pemesanan layanan, bukan pembelian
   * barang katalog — dokumennya memakai tata letak Surat Perintah Kerja,
   * sama seperti jenis PO jasa lainnya.
   */
  private buildPrintData(purchaseOrderName: string) {
    const v = this.formGroup.getRawValue();
    return {
      poType: '5.1.12',
      purchaseOrderName,
      date: v.date,
      projectName: v.projectName,
      supplierName: v.supplierName,
      supplierAddress: v.supplierAddress,
      supplierNpwp: v.supplierNpwp,
      items: this.t.controls.map((c) => {
        const x = c.getRawValue();
        return {
          name: x.description || '',
          remarks: x.remarks,
          quantity: x.unit === 'LS' ? 1 : Number(x.quantity) || 0,
          unit: x.unit,
          price: Number(x.price) || 0,
        };
      }),
      includePpn: !!v.includePPN,
      templateVersion: '1.0',
      clauseContext: this.clauseContext(),
      additionalClauses: this.additionalClauseValues,
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
        // Buka PDF-nya; gagal cetak tidak membatalkan PO yang tersimpan.
        try {
          printPurchaseOrderB(
            this.buildPrintData(res?.purchase_order_name ?? ''),
          );
        } catch (e) {
          console.error('Gagal membuat PDF purchase order:', e);
        }

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
