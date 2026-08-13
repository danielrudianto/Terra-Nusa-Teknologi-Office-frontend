import { Component, inject } from '@angular/core';
import { ClauseLineComponent } from '../../../../components/clause-line/clause-line.component';
import { PurchaseOrderTypeSwitcher } from '../../../../services/purchase-order-type-switcher.service';
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
import { ApiService } from '../../../../services/api.service';
import { purchaseTypeLabel } from '../../../../constants/purchase-type-label.constant';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  buildLegalServiceBillingTerms,
  buildLegalServiceClauses,
} from '../../../../constants/clause-templates';
import {
  IPurchaseOrder641,
  printPurchaseOrder641,
} from '../../../../helpers/purchase-order-641.helper';
import { PphSelectorComponent } from '../../../../components/pph-selector/pph-selector.component';
import { IPPh } from '../../../../utils/pph';
import { tanggalLokal } from '../../../../utils/tanggal';
import { firstValueFrom } from 'rxjs';
import { PurchaseOrderViewComponent } from '../../../../pages/purchase-order/purchase-order-view/purchase-order-view.component';

/**
 * 6.4.1 Jasa pengurusan legalitas & perizinan (akta, SBU, izin).
 *
 * Yang dipesan adalah PEKERJAAN MENGURUS, bukan dokumennya. Nomor dokumen dan
 * masa berlakunya adalah hasil pengurusan — belum ada saat PO dibuat — jadi
 * keduanya tidak diminta di sini.
 *
 * Tagihannya memuat dua komponen berbeda sifat:
 *   jasa   — pendapatan vendor; kena PPN, dipotong PPh
 *   resmi  — PNBP/retribusi/iuran lembaga; dititipkan, ditagih sesuai bukti
 *            setor tanpa penambahan, tanpa PPN dan tanpa potongan PPh
 *
 * Hanya baris jasa yang masuk `dpp`. Biaya resmi dicetak sebagai perkiraan
 * dan dicatat di `customData`; saat tagihannya masuk, tempatnya adalah kolom
 * `otherValue` pada tabel purchases — yang memang tidak ikut dikalikan PPN
 * maupun PPh.
 */
@Component({
  selector: 'app-purchase-order-create-641',
  standalone: true,
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
    MatButtonModule,
    MatSlideToggleModule,
    TextFieldModule,
    NgxMaskDirective,
    HeaderTitleComponent,
  ],
  templateUrl: './purchase-order-create-641.component.html',
  styleUrl: './purchase-order-create-641.component.scss',
})
export class PurchaseOrderCreate641Component {
  private readonly translateSvc = inject(TranslateService);

  /** Kode jenis PO, dipakai pada pill di kepala halaman. */
  get typeCode(): string {
    return '6.4.1';
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
    private router: Router,
    private snackBar: MatSnackBar,
  ) {}

  isSubmitting = false;
  /**
   * Jenis pekerjaan pengurusan. Ditulis sebagai kata kerja karena yang
   * dipesan adalah pekerjaannya, bukan dokumen jadi.
   *
   * Audit laporan keuangan sengaja TIDAK ada di sini: hasilnya berupa opini
   * yang tidak boleh diarahkan oleh pemesan, sehingga klausul "pengajuan
   * ulang tanpa biaya bila ditolak" tidak berlaku dan berbahaya bila ikut
   * tercetak. Pesanan audit dibuat pada jenis PO tersendiri.
   */
  serviceTypes: string[] = [
    'Penyusunan & review kontrak/SPK',
    'Pembuatan akta pendirian',
    'Pembuatan akta perubahan',
    'Pengurusan SBU baru',
    'Perpanjangan SBU',
    'Pengurusan SKK Konstruksi',
    'Pengurusan KTA asosiasi',
    'Pengurusan NIB / perizinan OSS',
    'Sertifikasi ISO',
    'Legalisir / waarmerking notaris',
    'Lainnya',
  ];

  units: string[] = ['dokumen', 'LS', 'set', 'tahun', 'paket'];

  /** Penanggung biaya resmi yang hangus bila pengajuan ditolak. */
  rejectionBearers = [
    { value: 'pertama', label: 'PIHAK PERTAMA (AKN)' },
    { value: 'kedua', label: 'PIHAK KEDUA (vendor)' },
    { value: 'kesepakatan', label: 'Kesepakatan tertulis kedua pihak' },
  ];

  /*
   * Termin memakai kode baku, bukan teks bebas — kalimat termin pada klausul
   * dipilih berdasarkan kode ini.
   */
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

  onPaymentTermChange(): void {
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

  get additionalClauses(): FormArray {
    return this.formGroup.get('additionalClauses') as FormArray;
  }

  get additionalClauseValues(): string[] {
    return (this.additionalClauses.value as string[])
      .map((x) => (x || '').trim())
      .filter((x) => x.length > 0);
  }

  addClause() {
    this.additionalClauses.push(new FormControl(''));
  }

  removeClause(i: number) {
    this.additionalClauses.removeAt(i);
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

  get typeLabel(): string {
    return purchaseTypeLabel(this.translateSvc, '6.4.1');
  }

  isOther(i: number): boolean {
    return this.getFormGroupAt(i).value.serviceType === 'Lainnya';
  }

  /** what actually gets written to the `task` column */
  resolvedType(i: number): string {
    const v = this.getFormGroupAt(i).value;
    return v.serviceType === 'Lainnya'
      ? v.customType || 'Lainnya'
      : v.serviceType || '';
  }

  formGroup: FormGroup = new FormGroup({
    date: new FormControl('', Validators.required),
    purchaseType: new FormControl('6.4.1'),
    supplierID: new FormControl('', Validators.required),
    supplierName: new FormControl('', Validators.required),
    supplierAddress: new FormControl('', Validators.required),
    supplierNpwp: new FormControl(''),
    /*
     * Pengeluaran kantor selalu dibebankan ke PUSAT, tidak pernah ke proyek.
     *
     * Nilainya dikunci, bukan sekadar diisikan sebagai bawaan: bila masih
     * dapat diubah, cepat atau lambat ada yang membebankannya ke kode proyek
     * — dan biaya yang salah pos baru ketahuan saat laporan per proyek
     * dibaca, ketika dokumennya sudah lama tersimpan.
     */
    projectName: new FormControl({ value: 'PUSAT', disabled: true }, [
      Validators.required,
    ]),
    paymentTerm: new FormControl('', Validators.required),
    creditTerm: new FormControl(0, Validators.required),
    prepaidTerm: new FormControl(0, [
      Validators.required,
      Validators.min(0),
      Validators.max(100),
    ]),
    // Poin tambahan bebas, dicetak sebagai seksi "Catatan Tambahan".
    // Disimpan sebagai daftar agar tiap poin dapat dinomori dan dirakit
    // ulang saat dokumennya dicetak.
    additionalClauses: new FormArray([]),
    pphCode: new FormControl(''),
    pphTaxObject: new FormControl(''),
    pphPercentage: new FormControl(0),
    // Ditolak di luar kelalaian vendor: biaya resmi yang terlanjur disetor
    // dan tidak bisa ditarik kembali menjadi tanggungan siapa.
    rejectionCostBearer: new FormControl('pertama', Validators.required),
    documentReturnDays: new FormControl(7, [Validators.min(0)]),
    reportingIntervalDays: new FormControl(7, [Validators.min(0)]),
    lines: new FormArray([]),
    // Perkiraan biaya resmi; di luar dasar PPN dan tidak masuk `dpp`.
    officialFees: new FormArray([]),
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
      serviceType: ['', Validators.required],
      customType: [''], // dipakai saat serviceType === 'Lainnya'
      // Objek yang diurus, mis. "SBU BS004 Bangunan Gedung".
      description: [''],
      // Dihitung sejak berkas dinyatakan lengkap, bukan sejak SPK terbit:
      // vendor tidak bisa mulai sebelum dokumen dari AKN masuk semua.
      targetDays: [null, [Validators.min(0)]],
      quantity: [1, [Validators.required, Validators.min(0.01)]],
      unit: ['dokumen', Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
    });
  }

  /** "Lainnya" makes the free-text name mandatory */
  onServiceTypeChange(i: number) {
    const g = this.getFormGroupAt(i);
    const custom = g.get('customType');
    if (g.get('serviceType')?.value === 'Lainnya') {
      custom?.setValidators([Validators.required, Validators.maxLength(100)]);
    } else {
      custom?.clearValidators();
    }
    custom?.updateValueAndValidity();
  }

  // ---- perkiraan biaya resmi ----
  get fees(): FormArray {
    return this.formGroup.get('officialFees') as FormArray;
  }
  getFeeGroupAt(i: number) {
    return this.fees.at(i) as FormGroup;
  }
  addFee() {
    this.fees.push(
      this.formBuilder.group({
        task: ['', [Validators.required, Validators.maxLength(100)]],
        description: [''],
        amount: [0, [Validators.required, Validators.min(0)]],
      }),
    );
  }
  removeFeeAt(i: number) {
    this.fees.removeAt(i);
  }
  get hasOfficialFee(): boolean {
    return this.fees.length > 0;
  }
  get officialFeeTotal(): number {
    return this.fees.controls.reduce(
      (acc, c) => acc + (Number(c.getRawValue().amount) || 0),
      0,
    );
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
    // Harga yang diisi user adalah DPP; PPN ditambahkan di atasnya.
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
            supplierAddress: data.address,
            // Diambil hanya bila terisi; vendor perorangan kerap
            // belum ber-NPWP, dan baris kosong pada dokumen resmi
            // lebih mengganggu daripada tidak ada barisnya.
            supplierNpwp: data.npwp || '',
          });
        }
      });
  }



  private toISO(d: any): string | null {
    return d ? tanggalLokal(d) : null;
  }

  formatData() {
    const includePPN = this.formGroup.get('includePPN')?.value;
    const dpp = this.rawTotal;
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
      pphCode: this.formGroup.get('pphCode')?.value || null,
      pphTaxObject: this.formGroup.get('pphTaxObject')?.value || null,
      pphPercentage: Number(this.formGroup.get('pphPercentage')?.value) || 0,
      templateVersion: '1.0',
      billing_requirements: {},
      items: this.t.controls.map((c, i) => {
        const x = c.getRawValue();
        return {
          task: this.resolvedType(i), // jenis pengurusan
          quantity: x.unit === 'LS' ? 1 : x.quantity,
          price: x.price,
          unit: x.unit,
          remarks_1: x.description || null, // objek yang diurus
          remarks_2: x.targetDays ?? null, // target hari kerja
        };
      }),
      customData: {
        paymentTerm: this.formGroup.get('paymentTerm')?.value,
        creditTerm: this.formGroup.get('creditTerm')?.value,
        prepaidTerm: this.formGroup.get('prepaidTerm')?.value,
        additionalClauses: this.additionalClauseValues,
        pphCode: this.formGroup.get('pphCode')?.value,
        pphTaxObject: this.formGroup.get('pphTaxObject')?.value,
        pphPercentage: this.formGroup.get('pphPercentage')?.value,
        rejectionCostBearer: this.formGroup.get('rejectionCostBearer')?.value,
        documentReturnDays: this.formGroup.get('documentReturnDays')?.value,
        reportingIntervalDays: this.formGroup.get('reportingIntervalDays')
          ?.value,
        /*
         * Biaya resmi disimpan di sini, BUKAN sebagai baris item.
         *
         * `dpp` adalah dasar pengenaan PPN dan PPh; memasukkan uang titipan
         * ke dalamnya membuat kedua pajak terhitung dari angka yang bukan
         * penghasilan vendor. Saat tagihannya masuk, tempat yang benar adalah
         * kolom `otherValue` pada tabel purchases — kolom itu ditambahkan apa
         * adanya ke nilai tagihan tanpa dikalikan PPN maupun PPh.
         */
        officialFees: this.fees.controls.map((c) => {
          const x = c.getRawValue();
          return {
            task: x.task,
            description: x.description || null,
            amount: Number(x.amount) || 0,
          };
        }),
      },
    };
  }

  /** Data sumber klausul; dipakai bersama pratinjau dan pencetakan. */
  private clauseContext() {
    const v = this.formGroup.getRawValue();
    return {
      paymentTerm: v.paymentTerm,
      creditTerm: v.creditTerm,
      prepaidTerm: v.prepaidTerm,
      pphCode: v.pphCode,
      pphTaxObject: v.pphTaxObject,
      pphPercentage: v.pphPercentage,
      hasOfficialFee: this.hasOfficialFee,
      rejectionCostBearer: v.rejectionCostBearer,
      documentReturnDays: v.documentReturnDays,
      reportingIntervalDays: v.reportingIntervalDays,
    };
  }

  /** Pratinjau catatan perjanjian, terbagi seksi seperti dokumennya. */
  get previewSections() {
    return buildLegalServiceClauses(
      this.clauseContext() as any,
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

  private buildPrintData(purchaseOrderName: string): IPurchaseOrder641 {
    const v = this.formGroup.getRawValue();
    return {
      purchaseOrderName,
      date: v.date,
      projectName: v.projectName,
      supplierName: v.supplierName,
      supplierAddress: v.supplierAddress,
      supplierNpwp: v.supplierNpwp,
      items: this.t.controls.map((c, i) => {
        const x = c.getRawValue();
        return {
          task: this.resolvedType(i),
          description: x.description,
          targetDays: x.targetDays,
          quantity: x.unit === 'LS' ? 1 : Number(x.quantity) || 0,
          unit: x.unit,
          price: Number(x.price) || 0,
        };
      }),
      officialFees: this.fees.controls.map((c) => {
        const x = c.getRawValue();
        return {
          task: x.task,
          description: x.description,
          amount: Number(x.amount) || 0,
        };
      }),
      includePpn: !!v.includePPN,
      sections: this.previewSections,
      billingTerms: buildLegalServiceBillingTerms(this.hasOfficialFee),
    };
  }

  /**
   * Buka pratinjau dokumen tanpa menyimpan apa pun.
   *
   * Memakai penyusun data dan helper cetak YANG SAMA dengan penyimpanan,
   * sehingga yang dilihat di layar benar-benar dokumen yang nanti terbit —
   * bukan tiruan yang bisa menyimpang sendiri.
   *
   * Nomor PO belum ada karena diberikan server saat penyimpanan; sebagai
   * gantinya dokumen ditandai sebagai draf, supaya tidak ada yang menyimpan
   * berkas ini lalu mengiranya SPK yang sah.
   */
  /**
   * Susun data dokumen dalam bentuk yang sama dengan jawaban server.
   *
   * Pratinjau memakai komponen yang sama dengan halaman lihat PO, sehingga
   * yang dilihat sebelum menerbitkan persis seperti yang akan dilihat
   * sesudahnya. Untuk itu bentuknya harus mengikuti jawaban server, bukan
   * bentuk cetak.
   *
   * `id` sengaja tidak diisi: dokumennya belum ada di server, dan riwayat
   * aktivitas di halaman lihat memang hanya tampil bila id-nya ada.
   */
  private dataPratinjau(): any {
    const v = this.formGroup.getRawValue();
    const dasar = this.formatData();

    /*
     * Nama barang dilengkapi khusus untuk pratinjau.
     *
     * `formatData()` sengaja TIDAK menyalin nama barang: yang tersimpan
     * hanya `item_id`, dan namanya diambil dari master_item saat PO dibaca
     * kembali dari server. Pratinjau tidak lewat server, sehingga tanpa ini
     * seluruh baris barang tampil sebagai "—".
     *
     * Diambil dari formulir, bukan dikarang: nilainya berasal dari katalog
     * yang sama saat barangnya dipilih.
     */
    const baris = Array.isArray((dasar as any).items) ? (dasar as any).items : [];
    /*
     * Baris formulir diambil lewat `this.t`, bukan `v.items`.
     *
     * Nama FormArray-nya berbeda-beda antar varian — `purchase_order`,
     * `lines`, `shipments`, `rentals`, `workers`, `scopes`. Menebak satu
     * nama membuat lima belas varian lainnya diam-diam tidak mendapat nama
     * barang, dan tidak ada galat yang muncul.
     */
    const asal = this.t?.controls?.map((c: any) => c.getRawValue()) ?? [];
    const items = baris.map((it: any, i: number) => ({
      ...it,
      item_description:
        it.item_description ??
        asal[i]?.description ??
        asal[i]?.name ??
        it.task ??
        asal[i]?.sku ??
        null,
    }));

    return {
      ...dasar,
      items,
      name: '(DRAF — BELUM TERBIT)',
      supplierName: v.supplierName,
      supplierAddress: v.supplierAddress,
    };
  }

  /** Buka pratinjau tanpa menyimpan apa pun. */
  pratinjau(): void {
    this.dialog.open(PurchaseOrderViewComponent, {
      data: { data: this.dataPratinjau() },
      maxWidth: '96vw',
      autoFocus: false,
    });
  }

  /**
   * Tampilkan dokumennya lebih dulu, terbitkan setelah dinyatakan terbaca.
   *
   * SPK mengikat kedua pihak dan tidak dapat diubah setelah terbit —
   * nomornya sudah terpakai dan salinannya sudah beredar. Menampilkan
   * dokumen jadi pada langkah terakhir memindahkan koreksi ke saat masih
   * murah: sebelum dokumennya ada.
   *
   * Gagal menyusun dokumen TIDAK meloloskan penerbitan. Melewatinya berarti
   * PO terbit tanpa seorang pun pernah melihat isinya.
   */
  /**
   * Tampilkan dokumennya lebih dulu, terbitkan setelah dinyatakan terbaca.
   *
   * SPK mengikat kedua pihak dan tidak dapat diubah setelah terbit.
   */
  async onSubmit(): Promise<void> {
    const setuju = await firstValueFrom(
      this.dialog
        .open(PurchaseOrderViewComponent, {
          data: { data: this.dataPratinjau(), konfirmasi: true },
          maxWidth: '96vw',
          autoFocus: false,
          disableClose: true,
        })
        .afterClosed(),
    );
    if (setuju) this.terbitkan();
  }

  /** Kirim ke server; dipanggil setelah dokumennya dikonfirmasi. */
  private terbitkan() {
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
            printPurchaseOrder641(
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
