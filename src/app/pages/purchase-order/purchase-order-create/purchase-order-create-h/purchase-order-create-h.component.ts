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
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SupplierSelectorComponent } from '../../../../components/supplier-selector/supplier-selector.component';
import { HeaderTitleComponent } from '../../../../components/header-title/header-title.component';
import { ApiService } from '../../../../services/api.service';
import { TranslatePipe } from '@ngx-translate/core';
import { MatRadioModule } from '@angular/material/radio';
import {
  buildBuangLumpurClauses,
  buildGroutingClauses,
  buildServiceBillingTerms,
  buildMandorClauses,
  MANDOR_PPH_NOTES,
  MANDOR_TOOLING_NOTES,
  buildClauseLines,
  latestClauseVersion,
  H_PASAL_3_DEFAULT,
  H_PASAL_4_DEFAULT,
  H_PASAL_5_DOCUMENTS,
  buildPasal5,
} from '../../../../constants/clause-templates';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { printPurchaseOrderH } from '../../../../helpers/purchase-order-h.helper';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { PphSelectorComponent } from '../../../../components/pph-selector/pph-selector.component';
import { IPPh } from '../../../../utils/pph';

@Component({
  selector: 'app-purchase-order-create-h',
  standalone: true,
  providers: [provideNgxMask()],
  imports: [
    MatAutocompleteModule,
    MatCheckboxModule,
    MatRadioModule,
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
    NgxMaskDirective,
    HeaderTitleComponent,
  ],
  templateUrl: './purchase-order-create-h.component.html',
  styleUrl: './purchase-order-create-h.component.scss',
})
export class PurchaseOrderCreateHComponent {
  readonly pphNoteOptions = MANDOR_PPH_NOTES;
  readonly toolingNoteOptions = MANDOR_TOOLING_NOTES;

  /**
   * Pemilih kode PPh lengkap — sama seperti halaman pembelian.
   *
   * Daftar terbatas sempat dipakai, tetapi tarifnya ternyata beragam
   * (2%, 2,5%, 1,75%), sehingga membatasi pilihan justru berisiko salah
   * potong.
   */
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

  /** Bentuk ringkas dipakai untuk pekerjaan yang syaratnya sudah baku. */
  get isRingkas(): boolean {
    const v = this.formGroup.get('workScope')?.value;
    return v === 'buang-lumpur' || v === 'grouting' || this.isMandor;
  }

  /** Ketiga jenis mandor memakai template yang sama. */
  get isMandor(): boolean {
    return String(this.formGroup.get('workScope')?.value || '').startsWith(
      'mandor-',
    );
  }

  /** Kolom tempo & uang muka hanya berlaku untuk sebagian termin. */
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
    return ((this.additionalClauses.value as string[]) || [])
      .map((x) => (x || '').trim())
      .filter((x) => x.length > 0);
  }

  get needsCreditTerm(): boolean {
    return ['CR', 'CRD'].includes(this.formGroup.get('paymentTerm')?.value);
  }

  get needsPrepaidTerm(): boolean {
    return ['PPD', 'CRD'].includes(this.formGroup.get('paymentTerm')?.value);
  }

  /** Daftar pekerja dikosongkan saat jenis yang tidak memakainya dipilih. */
  onWorkScopeChange() {
    if (this.isBuangLumpur) {
      this.w.clear();
    } else if (!this.isEntity && this.w.length === 0) {
      this.addWorker();
    }
  }

  get isBuangLumpur(): boolean {
    return this.formGroup.get('workScope')?.value === 'buang-lumpur';
  }

  get isGrouting(): boolean {
    return this.formGroup.get('workScope')?.value === 'grouting';
  }

  get pphValue(): number {
    const pct = Number(this.formGroup.get('pphPercentage')?.value) || 0;
    return (this.subTotal * pct) / 100;
  }

  get netTotal(): number {
    return this.grandTotal - this.pphValue;
  }

  /** Versi template klausul yang dipakai dokumen ini. */
  templateVersion = latestClauseVersion('H');

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
    'LS',
    'titik',
    'm',
    'm2',
    'm3',
    'kg',
    'ton',
    'unit',
    'hari',
    'bulan',
  ];

  formGroup: FormGroup = new FormGroup({
    date: new FormControl('', Validators.required),
    purchaseType: new FormControl(''),
    supplierID: new FormControl('', Validators.required),
    supplierName: new FormControl('', Validators.required),
    supplierPrefix: new FormControl(''),
    supplierCity: new FormControl(''),
    supplierNpwp: new FormControl(''),
    supplierPIC: new FormControl(''),
    supplierAddress: new FormControl('', Validators.required),
    projectName: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[A-Z0-9]{4,5}$/),
    ]),
    paymentTerm: new FormControl(''),
    creditTerm: new FormControl(0),
    prepaidTerm: new FormControl(0),
    // Cara pelunasan sisa setelah uang muka
    settlementMode: new FormControl('tempo'),
    settlementDays: new FormControl(14, [Validators.min(0)]),
    // Wakil PIHAK PERTAMA — dicantumkan pada poin keterangan pekerjaan
    officePICName: new FormControl(''),
    officePICPhoneNumber: new FormControl(''),
    // Poin tambahan yang ditulis sendiri; melanjutkan nomor poin terakhir.
    additionalClauses: new FormArray([]),
    // --- keterangan pekerjaan ---
    workLocation: new FormControl('', Validators.required),
    jobType: new FormControl('', Validators.required),
    startDate: new FormControl('', Validators.required),
    // Boleh kosong: dicetak sebagai "sampai pekerjaan selesai".
    endDate: new FormControl(''),
    // 'unit' = harga satuan per item, 'lumpsum' = satu harga borongan
    rateType: new FormControl('unit', Validators.required),
    // Jenis pekerjaan menentukan rangkaian klausul; versi template tetap 1.0
    // dan hanya naik bila redaksinya direvisi.
    workScope: new FormControl('borongan', Validators.required),
    mobilizationNoticeDays: new FormControl(7, [Validators.min(0)]),
    // Perorangan biasanya 'sejak-mulai', perusahaan memakai batas pekan tetap
    billingCycleMode: new FormControl('sejak-mulai'),
    weekStartDay: new FormControl('Kamis'),
    weekEndDay: new FormControl('Rabu'),
    // Keterangan PPh & alat kerja (poin 2 & 3 seksi Catatan)
    pphNote: new FormControl(MANDOR_PPH_NOTES[0]),
    toolingNote: new FormControl(MANDOR_TOOLING_NOTES[0]),
    pphCode: new FormControl(''),
    pphTaxObject: new FormControl(''),
    pphPercentage: new FormControl(0, [Validators.min(0), Validators.max(100)]),
    lumpSumPrice: new FormControl(0, [Validators.min(0)]),
    // Pasal 5 — penagihan & pembayaran
    billingPeriod: new FormControl(''),
    paymentDays: new FormControl(0, [Validators.min(0)]),
    finalPaymentDays: new FormControl(0, [Validators.min(0)]),
    hasDownPayment: new FormControl(false),
    downPaymentPercent: new FormControl(0, [
      Validators.min(0),
      Validators.max(100),
    ]),
    downPaymentDays: new FormControl(0, [Validators.min(0)]),
    hasRetention: new FormControl(false),
    retentionPercent: new FormControl(0, [
      Validators.min(0),
      Validators.max(100),
    ]),
    retentionReleaseDays: new FormControl(0, [Validators.min(0)]),
    billingDocuments: new FormArray(
      H_PASAL_5_DOCUMENTS.map((t) => new FormControl(t)),
    ),

    // Pasal 3 & 4 — isi bawaan yang tetap bisa diubah per poin
    kewajiban: new FormArray(H_PASAL_3_DEFAULT.map((t) => new FormControl(t))),
    keterangan: new FormArray(H_PASAL_4_DEFAULT.map((t) => new FormControl(t))),
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
      // Buang lumpur tidak memakai daftar pekerja; menambah baris kosong
      // membuat form selamanya invalid karena nama pekerja wajib diisi.
      if (this.isBuangLumpur) {
        this.w.clear();
      } else if (this.w.length === 0) {
        this.addWorker();
      }
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
  get billingDocuments(): FormArray {
    return this.formGroup.get('billingDocuments') as FormArray;
  }

  addBillingDocument() {
    this.billingDocuments.push(new FormControl(''));
  }

  removeBillingDocument(i: number) {
    this.billingDocuments.removeAt(i);
  }

  resetBillingDocuments() {
    this.billingDocuments.clear();
    H_PASAL_5_DOCUMENTS.forEach((t) =>
      this.billingDocuments.push(new FormControl(t)),
    );
  }

  private get billingDocumentValues(): string[] {
    return ((this.billingDocuments.value as string[]) || [])
      .map((x) => (x || '').trim())
      .filter((x) => x.length > 0);
  }

  /** Pratinjau Pasal 5 supaya isian yang belum terisi langsung terlihat. */
  get pasal5Preview(): (string | string[])[] {
    const v = this.formGroup.getRawValue();
    return buildPasal5(
      {
        billingPeriod: v.billingPeriod,
        paymentDays: v.paymentDays,
        finalPaymentDays: v.finalPaymentDays,
        hasDownPayment: v.hasDownPayment,
        downPaymentPercent: v.downPaymentPercent,
        downPaymentDays: v.downPaymentDays,
        hasRetention: v.hasRetention,
        retentionPercent: v.retentionPercent,
        retentionReleaseDays: v.retentionReleaseDays,
      },
      this.billingDocumentValues,
    );
  }

  get hasDownPayment(): boolean {
    return !!this.formGroup.get('hasDownPayment')?.value;
  }

  get hasRetention(): boolean {
    return !!this.formGroup.get('hasRetention')?.value;
  }

  /**
   * Pratinjau catatan perjanjian.
   *
   * Memakai builder yang sama dengan pencetakan, sehingga yang terlihat di
   * layar dijamin sama dengan yang keluar di dokumen.
   */
  get previewSections(): { title?: string; items: (string | string[])[] }[] {
    const v = this.formGroup.getRawValue();
    const ctx = {
      ...this.clauseContext(),
      paymentTerm: v.paymentTerm,
      creditTerm: v.creditTerm,
      prepaidTerm: v.prepaidTerm,
      settlementMode: v.settlementMode,
      settlementDays: v.settlementDays,
      scheduleText: this.scheduleText,
      projectName: v.projectName,
      workLocation: v.workLocation,
      officePICName: v.officePICName,
      officePICPhoneNumber: v.officePICPhoneNumber,
      mobilizationNoticeDays: v.mobilizationNoticeDays,
      pphCode: v.pphCode,
      pphTaxObject: v.pphTaxObject,
      pphPercentage: v.pphPercentage,
      pphNote: v.pphNote,
      toolingNote: v.toolingNote,
      billingPeriod: v.billingPeriod,
      finalPaymentDays: v.finalPaymentDays,
      billingCycleMode: v.billingCycleMode,
      weekStartDay: v.weekStartDay,
      weekEndDay: v.weekEndDay,
    };

    const extra = this.additionalClauseValues;
    /** Poin tambahan menempel di akhir daftar terakhir agar nomornya lanjut. */
    const withExtra = (
      sections: { title?: string; items: (string | string[])[] }[],
    ) => {
      if (!extra.length || !sections.length) return sections;
      const last = sections[sections.length - 1];
      return [
        ...sections.slice(0, -1),
        { ...last, items: [...last.items, ...extra] },
      ];
    };

    if (this.isGrouting) return withExtra(buildGroutingClauses(ctx));
    if (this.isMandor) return withExtra(buildMandorClauses(ctx, v.workScope));
    if (this.isBuangLumpur) {
      // Buang lumpur memakai satu daftar tanpa judul seksi.
      return withExtra([{ items: buildBuangLumpurClauses(ctx) }]);
    }
    return [];
  }

  isSubList(x: string | string[]): boolean {
    return Array.isArray(x);
  }

  asList(x: string | string[]): string[] {
    return x as string[];
  }

  asText(x: string | string[]): string {
    return x as string;
  }

  get kewajiban(): FormArray {
    return this.formGroup.get('kewajiban') as FormArray;
  }

  addKewajiban() {
    this.kewajiban.push(new FormControl(''));
  }

  removeKewajiban(i: number) {
    this.kewajiban.removeAt(i);
  }

  get kewajibanValues(): string[] {
    return ((this.kewajiban.value as string[]) || [])
      .map((x) => (x || '').trim())
      .filter((x) => x.length > 0);
  }

  /** Kembalikan pasal ke isi bawaan bila hasil suntingan tidak dipakai. */
  resetKewajiban() {
    this.kewajiban.clear();
    H_PASAL_3_DEFAULT.forEach((t) => this.kewajiban.push(new FormControl(t)));
  }

  resetKeterangan() {
    this.keterangan.clear();
    H_PASAL_4_DEFAULT.forEach((t) => this.keterangan.push(new FormControl(t)));
  }

  get keterangan(): FormArray {
    return this.formGroup.get('keterangan') as FormArray;
  }

  addKeterangan() {
    this.keterangan.push(new FormControl(''));
  }

  removeKeterangan(i: number) {
    this.keterangan.removeAt(i);
  }

  get keteranganValues(): string[] {
    return ((this.keterangan.value as string[]) || [])
      .map((x) => (x || '').trim())
      .filter((x) => x.length > 0);
  }

  get isLumpSum(): boolean {
    return this.formGroup.get('rateType')?.value === 'lumpsum';
  }

  /**
   * Pada lump sum, harga per baris tidak dipakai — nilainya satu untuk
   * seluruh pekerjaan, sehingga harga baris tidak boleh ikut menghitung.
   */
  onRateTypeChange() {
    if (this.isLumpSum) {
      this.t.controls.forEach((c) => c.patchValue({ price: 0 }));
    } else {
      this.formGroup.patchValue({ lumpSumPrice: 0 });
    }
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
    // Lump sum: satu nilai borongan untuk seluruh lingkup pekerjaan.
    if (this.isLumpSum) {
      return Number(this.formGroup.get('lumpSumPrice')?.value) || 0;
    }
    return this.t.controls.reduce((acc, _c, i) => acc + this.lineTotal(i), 0);
  }
  get subTotal(): number {
    // Harga yang diisi adalah DPP; PPN ditambahkan di atasnya.
    return this.rawTotal;
  }
  get ppnAmount(): number {
    return this.formGroup.get('includePPN')?.value ? this.rawTotal * 0.11 : 0;
  }
  get grandTotal(): number {
    return this.subTotal + this.ppnAmount;
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
            supplierPrefix: data.prefix,
            supplierNpwp: data.npwp,
            supplierPIC: data.picName || '',
            supplierCity: [data.city, data.province]
              .filter((x: string) => !!x)
              .join(', '),
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
    // Harga yang diisi = DPP; PPN disimpan sebagai persentase.
    const dpp = this.rawTotal;
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
      templateVersion: this.templateVersion,
      pphCode: this.formGroup.get('pphCode')?.value || null,
      pphTaxObject: this.formGroup.get('pphTaxObject')?.value || null,
      pphPercentage: Number(this.formGroup.get('pphPercentage')?.value) || null,
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
        workLocation: this.formGroup.get('workLocation')?.value,
        jobType: this.formGroup.get('jobType')?.value,
        startDate: this.formGroup.get('startDate')?.value,
        endDate: this.formGroup.get('endDate')?.value,
        rateType: this.formGroup.get('rateType')?.value,
        lumpSumPrice: Number(this.formGroup.get('lumpSumPrice')?.value) || 0,
        billingPeriod: this.formGroup.get('billingPeriod')?.value,
        paymentDays: Number(this.formGroup.get('paymentDays')?.value) || 0,
        finalPaymentDays:
          Number(this.formGroup.get('finalPaymentDays')?.value) || 0,
        hasDownPayment: !!this.formGroup.get('hasDownPayment')?.value,
        downPaymentPercent:
          Number(this.formGroup.get('downPaymentPercent')?.value) || 0,
        downPaymentDays:
          Number(this.formGroup.get('downPaymentDays')?.value) || 0,
        hasRetention: !!this.formGroup.get('hasRetention')?.value,
        retentionPercent:
          Number(this.formGroup.get('retentionPercent')?.value) || 0,
        retentionReleaseDays:
          Number(this.formGroup.get('retentionReleaseDays')?.value) || 0,
        billingDocuments: this.billingDocumentValues,
        kewajiban: this.kewajibanValues,
        keterangan: this.keteranganValues,
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
      },
    };
  }

  /** Teks jadwal pekerjaan; tanggal selesai boleh kosong. */
  private get scheduleText(): string {
    const v = this.formGroup.getRawValue();
    const tgl = (d: any) =>
      d
        ? new Date(d).toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
        : '';
    const mulai = tgl(v.startDate);
    if (!mulai) return '';
    return v.endDate
      ? `${mulai} s.d. ${tgl(v.endDate)}`
      : `${mulai} s.d. Selesai`;
  }

  /** Data sumber Pasal 1; kalimatnya dirakit dari template. */
  private clauseContext() {
    const v = this.formGroup.getRawValue();
    const tgl = (d: any) =>
      d
        ? new Date(d).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
        : '';
    return {
      workLocation: v.workLocation,
      jobType: v.jobType,
      startDate: tgl(v.startDate),
      endDate: tgl(v.endDate),
      rateType: v.rateType,
    };
  }

  /** Susun data cetak SPK; pasal dirakit dari template & isian form. */
  private buildPrintData(purchaseOrderName: string) {
    const v = this.formGroup.getRawValue();
    return {
      purchaseOrderName,
      date: v.date,
      projectName: v.projectName,
      supplierName: v.supplierName,
      supplierPrefix: v.supplierPrefix,
      supplierAddress: v.supplierAddress,
      supplierCity: v.supplierCity,
      supplierNpwp: v.supplierNpwp,
      supplierPIC: v.supplierPIC,
      pasal1: buildClauseLines('H', this.clauseContext(), this.templateVersion),
      scopes: this.t.controls.map((c) => {
        const x = c.getRawValue();
        return {
          task: x.task,
          quantity: Number(x.quantity) || 0,
          unit: x.unit,
          price: Number(x.price) || 0,
        };
      }),
      isLumpSum: this.isLumpSum,
      lumpSumPrice: Number(v.lumpSumPrice) || 0,
      includePpn: !!v.includePPN,
      kewajiban: this.kewajibanValues,
      keterangan: this.keteranganValues,
      pasal5: this.pasal5Preview,
      mode: this.isRingkas ? ('ringkas' as const) : ('lengkap' as const),
      // SPK mandor berseksi: Catatan / Laporan Lapangan / Tata Cara Pembayaran
      // Memakai hasil pratinjau supaya dokumen persis seperti yang dilihat.
      sections:
        this.isRingkas && !this.isBuangLumpur
          ? this.previewSections
          : this.isGrouting
            ? buildGroutingClauses({
                ...this.clauseContext(),
                paymentTerm: v.paymentTermCode,
                creditTerm: v.creditTerm,
                settlementMode: v.settlementMode,
                settlementDays: v.settlementDays,
                pphCode: v.pphCode,
                pphTaxObject: v.pphTaxObject,
                pphPercentage: v.pphPercentage,
                prepaidTerm: v.prepaidTerm,
                scheduleText: this.scheduleText,
                finalPaymentDays: v.finalPaymentDays,
              })
            : this.isMandor
              ? buildMandorClauses(
                  {
                    ...this.clauseContext(),
                    pphCode: v.pphCode,
                    pphTaxObject: v.pphTaxObject,
                    pphPercentage: v.pphPercentage,
                    billingPeriod: v.billingPeriod,
                    finalPaymentDays: v.finalPaymentDays,
                    billingCycleMode: v.billingCycleMode,
                    weekStartDay: v.weekStartDay,
                    weekEndDay: v.weekEndDay,
                    pphNote: v.pphNote,
                    toolingNote: v.toolingNote,
                  },
                  v.workScope,
                )
              : undefined,
      // Lampiran tata cara penagihan; hari pekan mengikuti isian form.
      billingTerms: buildServiceBillingTerms({
        weekStartDay: v.weekStartDay,
        weekEndDay: v.weekEndDay,
      }),
      closingText:
        this.isMandor || this.isGrouting
          ? 'Demikian PERJANJIAN KERJA SAMA ini dibuat sesuai dengan kesepakatan bersama dan akan digunakan sebagai dasar pekerjaan dan penagihan.'
          : undefined,
      // Sama seperti sections: memakai pratinjau agar poin tambahan ikut.
      catatan: this.isBuangLumpur
        ? this.previewSections[0]?.items || []
        : undefined,
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
          // Buka PDF-nya; gagal cetak tidak membatalkan SPK yang tersimpan.
          try {
            printPurchaseOrderH(
              this.buildPrintData(res?.purchase_order_name ?? ''),
            );
          } catch (e) {
            console.error('Gagal membuat PDF surat perintah kerja:', e);
          }

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
