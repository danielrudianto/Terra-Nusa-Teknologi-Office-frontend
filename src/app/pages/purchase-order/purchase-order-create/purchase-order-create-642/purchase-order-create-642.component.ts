import { CommonModule } from '@angular/common';
import { ClauseLineComponent } from '../../../../components/clause-line/clause-line.component';
import { ServerMessageService } from 'src/app/services/server-message.service';
import { Component, inject } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import moment from 'moment';

import { ApiService } from 'src/app/services/api.service';
import { HeaderTitleComponent } from '../../../../components/header-title/header-title.component';
import { SupplierSelectorComponent } from '../../../../components/supplier-selector/supplier-selector.component';
import { PphSelectorComponent } from '../../../../components/pph-selector/pph-selector.component';
import { IPPh } from '../../../../utils/pph';
import { purchaseTypeLabel } from '../../../../constants/purchase-type-label.constant';
import { buildInsuranceClauses } from '../../../../constants/clause-templates';
import { printPurchaseOrderB } from '../../../../helpers/purchase-order-b.helper';
import { PurchaseOrderTypeSwitcher } from '../../../../services/purchase-order-type-switcher.service';
import { ProjectSelectorComponent } from '../../../../components/project-selector/project-selector.component';
import { tanggalLokal } from '../../../../utils/tanggal';
import { firstValueFrom } from 'rxjs';
import { PurchaseOrderViewComponent } from '../../../../pages/purchase-order/purchase-order-view/purchase-order-view.component';
import { AdendumService } from '../../../../services/adendum.service';
import { SupplierTerkunciComponent } from '../../../../components/supplier-terkunci/supplier-terkunci.component';

/**
 * 6.4.2 Penutupan pertanggungan (asuransi & surety bond).
 *
 * Dua hal yang membedakannya dari SPK jasa lain:
 *
 *   1. Yang dibeli adalah DOKUMEN. Begitu polis terbit, yang menanggung
 *      risiko adalah polis itu — bukan PIHAK KEDUA.
 *   2. Ada dua jenis uang. Premi hanya dititipkan untuk diteruskan kepada
 *      penanggung, sedangkan imbalan jasa adalah penghasilan PIHAK KEDUA.
 *      Keduanya dipisah mengikuti pola biaya resmi pada PO 6.4.1, sehingga
 *      premi tidak ikut menjadi dasar pemotongan pajak.
 */
@Component({
  selector: 'app-purchase-order-create-642',
  standalone: true,
  providers: [provideNgxMask(), provideNativeDateAdapter()],
  imports: [
    ProjectSelectorComponent,
    ClauseLineComponent,
    CommonModule,
    ReactiveFormsModule,
    TranslatePipe,
    HeaderTitleComponent,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatIconModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatDialogModule,
    MatSnackBarModule,
    NgxMaskDirective,
    SupplierTerkunciComponent,
  ],
  templateUrl: './purchase-order-create-642.component.html',
  styleUrl: './purchase-order-create-642.component.scss',
})
export class PurchaseOrderCreate642Component {
  private readonly serverMessage = inject(ServerMessageService);

  private readonly translateSvc = inject(TranslateService);


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
  constructor(
    public adendum: AdendumService,
    private formBuilder: FormBuilder,
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog,
  ) {}

  private readonly typeSwitcher = inject(PurchaseOrderTypeSwitcher);

  /** Buka pemilih jenis PO; isian yang sudah ada dikonfirmasi lebih dulu. */
  onChangeType() {
    this.typeSwitcher.open(this.formGroup?.dirty === true);
  }

  get typeCode(): string {
    return '6.4.2';
  }
  get typeLabel(): string {
    return purchaseTypeLabel(this.translateSvc, '6.4.2');
  }

  isSubmitting = false;
  readonly purchaseType = '6.4.2';

  /**
   * null sampai jalur penutupan dipilih.
   *
   * Ditutup lewat broker atau langsung ke perusahaan asuransi menentukan
   * ada tidaknya imbalan jasa dan pemotongan pajaknya — sehingga tidak dapat
   * diwakili satu bentuk formulir.
   */
  channel: 'broker' | 'langsung' | null = null;

  get lewatBroker(): boolean {
    return this.channel === 'broker';
  }

  /**
   * Jenis pertanggungan dibuat sebagai pilihan, bukan isian bebas.
   *
   * Penulisan bebas menghasilkan "CAR", "C.A.R.", dan "Contractor All Risk"
   * untuk hal yang sama, dan itu menyulitkan penelusuran saat polis dicari
   * kembali.
   */
  insuranceTypes: string[] = [
    "Contractor's All Risk (CAR)",
    'Erection All Risk (EAR)',
    'Third Party Liability (TPL)',
    "Contractor's Plant & Machinery (CPM)",
    'Marine Cargo',
    'Pengangkutan Alat Berat',
    'Bid Bond (Jaminan Penawaran)',
    'Performance Bond (Jaminan Pelaksanaan)',
    'Advance Payment Bond (Jaminan Uang Muka)',
    'Maintenance Bond (Jaminan Pemeliharaan)',
    'Lainnya',
  ];

  /** Jenis yang berupa penjaminan, bukan pertanggungan. */
  private readonly BOND_TYPES = [
    'Bid Bond (Jaminan Penawaran)',
    'Performance Bond (Jaminan Pelaksanaan)',
    'Advance Payment Bond (Jaminan Uang Muka)',
    'Maintenance Bond (Jaminan Pemeliharaan)',
  ];

  /** Ada baris berupa jaminan; klausul khusus jaminan ikut dicetak. */
  get isSuretyBond(): boolean {
    return this.t.controls.some((c) =>
      this.BOND_TYPES.includes(c.value.insuranceType),
    );
  }

  formGroup: FormGroup = new FormGroup({
    date: new FormControl('', Validators.required),
    purchaseType: new FormControl('6.4.2'),
    supplierID: new FormControl('', Validators.required),
    supplierName: new FormControl('', Validators.required),
    supplierAddress: new FormControl('', Validators.required),
    supplierNpwp: new FormControl(''),
    // 6.4.2 dapat dibebankan ke proyek maupun pusat.
    projectName: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[A-Z0-9]{4,5}$/),
    ]),

    paymentTerm: new FormControl('', Validators.required),
    creditTerm: new FormControl(0),
    prepaidTerm: new FormControl(0),

    // Hanya berlaku pada penutupan lewat broker.
    pphCode: new FormControl(''),
    pphTaxObject: new FormControl(''),
    pphPercentage: new FormControl(0),

    policyDeliveryDays: new FormControl(14, [Validators.min(0)]),

    lines: new FormArray([]),
    premiums: new FormArray([]),
    additionalClauses: new FormArray([]),
    includePPN: new FormControl(false),
  });

  ngOnInit(): void {
    // Bila dibuka sebagai adendum atau koreksi, isinya diambil dari
    // dokumen induknya. Dipanggil di `ngOnInit` — bukan di penangan
    // tombol — karena alamatnya sudah membawa `adendumDari` sejak
    // halaman dibuka, dan yang membukanya tidak menekan apa pun.
    this.muatAdendum();
    const routeType = this.route.snapshot.data['purchaseType'];
    if (routeType) this.formGroup.patchValue({ purchaseType: routeType });
  }

  /**
   * Jalur dipilih di layar, bukan lewat dialog: dialog yang ditutup membuat
   * pilihannya tetap kosong tanpa jalan kembali selain memuat ulang halaman.
   */
  chooseChannel(picked: 'broker' | 'langsung') {
    if (picked === this.channel) return;
    this.channel = picked;
    this.t.clear();
    this.addLine();
    if (!this.lewatBroker) this.clearPph();
  }

  resetChannel() {
    this.channel = null;
    this.t.clear();
  }

  // ---- rincian pertanggungan ----
  get t(): FormArray {
    return this.formGroup.get('lines') as FormArray;
  }
  getFormGroupAt(i: number) {
    return this.t.at(i) as FormGroup;
  }

  addLine() {
    this.t.push(
      this.formBuilder.group({
        insuranceType: ['', Validators.required],
        customType: [''], // dipakai saat insuranceType === 'Lainnya'
        // Objek yang dijamin, mis. "Excavator PC200 B 1234 XYZ".
        object: [''],
        sumInsured: [0, [Validators.min(0)]],
        deductible: [''],
        coverageStart: [''],
        coverageEnd: [''],
        quantity: [1, [Validators.required, Validators.min(0.01)]],
        unit: ['polis', Validators.required],
        price: [0, [Validators.required, Validators.min(0)]],
      }),
    );
  }

  removeLineAt(i: number) {
    this.t.removeAt(i);
  }

  isOther(i: number): boolean {
    return this.getFormGroupAt(i).value.insuranceType === 'Lainnya';
  }

  /** Nama jenis yang benar-benar tersimpan pada kolom pekerjaan. */
  private lineTask(i: number): string {
    const v = this.getFormGroupAt(i).value;
    return v.insuranceType === 'Lainnya'
      ? v.customType || 'Lainnya'
      : v.insuranceType || '';
  }

  lineTotal(i: number): number {
    const x = this.t.at(i).getRawValue();
    return (Number(x.quantity) || 0) * (Number(x.price) || 0);
  }

  // ---- premi (dititipkan, diteruskan ke penanggung) ----
  get premiums(): FormArray {
    return this.formGroup.get('premiums') as FormArray;
  }
  getPremiumGroupAt(i: number) {
    return this.premiums.at(i) as FormGroup;
  }
  addPremium() {
    this.premiums.push(
      this.formBuilder.group({
        task: ['', [Validators.required, Validators.maxLength(100)]],
        description: [''],
        amount: [0, [Validators.required, Validators.min(0)]],
      }),
    );
  }
  removePremiumAt(i: number) {
    this.premiums.removeAt(i);
  }
  get hasPremium(): boolean {
    return this.premiums.length > 0;
  }
  get premiumTotal(): number {
    return this.premiums.controls.reduce(
      (acc, c) => acc + (Number(c.value.amount) || 0),
      0,
    );
  }

  // ---- ringkasan ----
  //
  // Premi TIDAK masuk subtotal: yang menjadi dasar pajak hanya imbalan jasa.
  get subTotal(): number {
    return this.t.controls.reduce((acc, _c, i) => acc + this.lineTotal(i), 0);
  }
  get ppnAmount(): number {
    return this.formGroup.get('includePPN')?.value ? this.subTotal * 0.11 : 0;
  }
  get pphAmount(): number {
    const pct = Number(this.formGroup.get('pphPercentage')?.value) || 0;
    return (this.subTotal * pct) / 100;
  }
  get grandTotal(): number {
    return this.subTotal + this.ppnAmount + this.premiumTotal;
  }

  // ---- poin tambahan ----
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

  isSubList(x: string | string[]): boolean {
    return Array.isArray(x);
  }
  asList(x: string | string[]): string[] {
    return Array.isArray(x) ? x : [];
  }
  asText(x: string | string[]): string {
    return Array.isArray(x) ? '' : String(x ?? '');
  }

  // ---- termin ----
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

    if (this.creditEnabled) credit?.enable();
    else {
      credit?.setValue(0);
      credit?.disable();
    }

    if (this.prepaidEnabled) prepaid?.enable();
    else {
      prepaid?.setValue(0);
      prepaid?.disable();
    }
  }

  openSupplierSelector() {
    this.dialog
      .open(SupplierSelectorComponent, {})
      .afterClosed()
      .subscribe((data) => {
        if (!data) return;
        this.formGroup.patchValue({
          supplierID: data.id,
          supplierName: data.name,
          /*
           * `supplierPrefix` WAJIB ikut.
           *
           * `vendorDisplayName()` menyusun nama pada dokumen dari nama dan
           * prefiksnya; tanpa prefiks ia mencetak "Sumber Rezeki" saja,
           * bukan "PT. Sumber Rezeki" — pada blok tanda tangan dokumen
           * yang mengikat kedua pihak. Tidak menghasilkan galat apa pun.
           */
          supplierPrefix: data.prefix || '',
          supplierAddress: data.address,
          supplierNpwp: data.npwp || '',
        });
      });
  }

  openPphSelector() {
    this.dialog
      .open(PphSelectorComponent, {
        // Jenis PO menentukan kode yang diusulkan lebih dulu.
        data: { purchaseType: '642' },})
      .afterClosed()
      .subscribe((data: any) => {
        /*
         * "Tanpa PPh" MENGHAPUS pilihan, berbeda dari membatalkan.
         *
         * Keduanya sempat sama-sama menutup tanpa nilai, sehingga baris di
         * bawah memperlakukan keduanya sebagai batal — dan PPh yang sudah
         * terlanjur dipilih tidak pernah hilang.
         */
        if (data?.hapus) {
          this.clearPph();
          return;
        }
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



  get f() {
    return this.formGroup.controls as any;
  }

  /** Data sumber klausul; dipakai bersama pratinjau dan pencetakan. */
  private clauseContext() {
    const v = this.formGroup.getRawValue();
    return {
      paymentTerm: v.paymentTerm,
      creditTerm: v.creditTerm,
      prepaidTerm: v.prepaidTerm,
      insuranceChannel: this.channel ?? 'broker',
      hasPremium: this.hasPremium,
      policyDeliveryDays: v.policyDeliveryDays,
      isSuretyBond: this.isSuretyBond,
      pphCode: this.lewatBroker ? v.pphCode : '',
      pphTaxObject: this.lewatBroker ? v.pphTaxObject : '',
      pphPercentage: this.lewatBroker ? v.pphPercentage : 0,
    };
  }

  /**
   * Ketentuan baku yang akan tercetak, ditampilkan sejak awal.
   *
   * Dirakit dari template yang sama dengan pencetakan, sehingga yang terbaca
   * di layar tidak mungkin berbeda dari yang keluar di dokumen.
   */
  get previewSections() {
    return buildInsuranceClauses(
      this.clauseContext() as any,
      this.additionalClauseValues,
    );
  }

  private toISO(d: any): string | null {
    return d ? tanggalLokal(d) : null;
  }

  private formatData() {
    const v = this.formGroup.getRawValue();
    return {
      date: moment(v.date).format('YYYY-MM-DD'),
      supplierID: v.supplierID,
      purchaseType: '6.4.2',
      projectName: v.projectName,
      /*
       * Kode proyek WAJIB dikirim, bukan hanya namanya.
       *
       * Penomoran dokumen membaca `projectCode`; bila kosong ia jatuh ke
       * urutan GLOBAL — seluruh purchase order sistem — sehingga proyek yang
       * baru sampai nomor 029 tiba-tiba menerbitkan dokumen bernomor 112.
       *
       * Keduanya bernilai sama: kode proyek itu sendiri yang dipakai sebagai
       * nama maupun sebagai kode.
       */
      projectCode: v.projectName,
      // Premi tidak masuk DPP: yang menjadi dasar pajak hanya imbalan jasa.
      dpp: this.subTotal,
      otherValue: this.premiumTotal,
      ppn: v.includePPN ? 11 : 0,
      pphCode: this.lewatBroker ? v.pphCode || null : null,
      pphTaxObject: this.lewatBroker ? v.pphTaxObject || null : null,
      pphPercentage: this.lewatBroker ? Number(v.pphPercentage) || 0 : 0,
      payment_term: v.paymentTerm,
      templateVersion: '1.0',
      items: this.t.controls.map((c, i) => {
        const x = c.getRawValue();
        return {
          task: this.lineTask(i),
          quantity: x.unit === 'LS' ? 1 : x.quantity,
          price: x.price,
          unit: x.unit,
          remarks_1: x.object || null,
        };
      }),
      // Penanda induk bila dokumen ini ADENDUM; server yang
      // menghitung nomor adendumnya.
      parentPurchaseOrderID: this.adendum.indukId ?? undefined,
      customData: {
        insuranceChannel: this.channel,
        policyDeliveryDays: v.policyDeliveryDays,
        isSuretyBond: this.isSuretyBond,
        pphCode: this.lewatBroker ? v.pphCode : '',
        pphTaxObject: this.lewatBroker ? v.pphTaxObject : '',
        pphPercentage: this.lewatBroker ? v.pphPercentage : 0,
        paymentTerm: v.paymentTerm,
        creditTerm: v.creditTerm,
        prepaidTerm: v.prepaidTerm,
        // Rincian pertanggungan disimpan agar dapat dicetak ulang.
        coverages: this.t.controls.map((c, i) => {
          const x = c.getRawValue();
          return {
            type: this.lineTask(i),
            object: x.object,
            sumInsured: Number(x.sumInsured) || 0,
            deductible: x.deductible,
            coverageStart: this.toISO(x.coverageStart),
            coverageEnd: this.toISO(x.coverageEnd),
          };
        }),
        premiums: this.premiums.controls.map((c) => {
          const x = c.getRawValue();
          return {
            task: x.task,
            description: x.description,
            amount: Number(x.amount) || 0,
          };
        }),
        additionalClauses: this.additionalClauseValues,
      },
    };
  }

  /**
   * Susun data cetak.
   *
   * Penutupan pertanggungan adalah pemesanan jasa, sehingga dokumennya
   * memakai tata letak Surat Perintah Kerja.
   */
  private buildPrintData(purchaseOrderName: string) {
    const v = this.formGroup.getRawValue();
    return {
      poType: '6.4.2',
      purchaseOrderName,
      date: v.date,
      projectName: v.projectName,
      supplierName: v.supplierName,
      supplierAddress: v.supplierAddress,
      supplierNpwp: v.supplierNpwp,
      items: this.t.controls.map((c, i) => {
        const x = c.getRawValue();
        return {
          name: this.lineTask(i),
          remarks: x.object,
          quantity: x.unit === 'LS' ? 1 : Number(x.quantity) || 0,
          unit: x.unit,
          price: Number(x.price) || 0,
        };
      }),
      includePpn: !!v.includePPN,
      /*
       * Premi ikut ke dokumen, bukan hanya ke penyimpanan.
       *
       * Pratinjau dan penyimpanan memakai penyusun yang sama, jadi tanpa
       * baris ini yang dilihat pembuatnya pun sama-sama kehilangan preminya
       * — dan kekeliruannya baru ketahuan dari vendor.
       */
      premiums: this.premiums.controls.map((c) => {
        const x = c.getRawValue();
        return {
          task: x.task,
          description: x.description,
          amount: Number(x.amount) || 0,
        };
      }),
      templateVersion: '1.0',
      sections: this.previewSections,
      clauseContext: this.clauseContext(),
      additionalClauses: this.additionalClauseValues,
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
      // Penanda draf ikut bahasa aplikasi; nomor asli baru ada
      // setelah server menerbitkannya.
      name: this.translateSvc.instant('poForm.draftNotIssued'),
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
    /*
     * Mode UBAH menimpa dokumennya, bukan menerbitkan yang baru.
     *
     * Server menolak bila dokumennya sudah disetujui, dan mengabaikan kolom
     * yang menentukan identitasnya — nomor, pemasok, proyek, jenis. Layar
     * ini tidak perlu menjaganya lagi; yang dijaga di sini hanya agar
     * permintaannya menuju jalur yang benar.
     */
    const ubahId = this.adendum.ubahId;
    this.apiService
      [ubahId ? 'put' : 'post'](
        ubahId ? `purchase-orders/${ubahId}` : 'purchase-orders',
        this.formatData(),
      )
      .subscribe({
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
          /*
           * Adendum dicetak dari DAFTAR, bukan dari sini.
           *
           * Cetakan adendum wajib menyertakan induk dan adendum sebelumnya:
           * isinya selisih, sehingga dibaca sendirian ia tidak menyatakan
           * keadaan pekerjaannya. Yang menyusun rantai itu ada di halaman
           * daftar; mengulanginya di enam belas formulir berarti enam belas
           * salinan yang harus diperbaiki bersamaan.
           */
          this.router.navigate(['/Purchase-order'], {
            queryParams: this.adendum.isAdendum
              ? { cetak: res?.purchase_order_id ?? res?.id }
              : undefined,
          });
        },
        error: (error) => {
          this.snackBar.open(
            this.serverMessage.terjemahkan(error),
            'Close',
            { duration: 3000 },
          );
        },
      })
      .add(() => {
        this.isSubmitting = false;
      });
  }

  /** True bila layar ini membuat ADENDUM, bukan dokumen baru. */
  get isAdendum(): boolean {
    return this.adendum.isAdendum;
  }

  /**
   * True bila layar ini MENGUBAH dokumen yang belum disetujui.
   *
   * Berbeda dari adendum walaupun keduanya memuat dokumen lama: adendum
   * menerbitkan dokumen baru berisi selisih, ubah menimpa dokumen yang
   * belum pernah terbit.
   */
  get isUbah(): boolean {
    return this.adendum.isUbah;
  }

  /**
   * Judul layar: membuat atau mengubah.
   *
   * Layar yang sama dipakai untuk keduanya — bentuk formulirnya identik, dan
   * layar kedua berarti setiap perubahan bentuk harus dikerjakan dua kali.
   * Yang membedakan hanya judulnya, banner di atas, dan tombolnya.
   */
  get judulLayar(): string {
    return this.isUbah
      ? this.translateSvc.instant('poForm.judulUbah')
      : this.translateSvc.instant('poForm.poCodePrefix') + this.purchaseType;
  }

  /** Dokumen induk yang diadendum; null bila dokumen baru. */
  induk: any = null;

  /**
   * Isi formulir dari dokumen induk saat layar dibuka sebagai adendum.
   *
   * Barisnya dibuat lewat `addLine()` lalu diisi, bukan dibangun sendiri:
   * pembangunnya tidak dipisah pada varian ini, dan menyalin isinya ke sini
   * berarti dua salinan yang harus diperbaiki bersamaan.
   *
   * Volume dikosongkan — adendum berisi SELISIH, bukan pengganti.
   */
  private muatAdendum(): void {
    this.adendum.muatInduk().subscribe({
      next: (induk: any) => {
        if (!induk) return;
        this.induk = induk;

        /*
         * Jalur penutupan diwarisi dari induknya, bukan ditanyakan lagi.
         *
         * Adendum melekat pada perjanjian yang sudah berjalan: yang aslinya
         * ditutup lewat broker tidak dapat mendadak menjadi langsung ke
         * penanggung — imbalan jasa brokernya sudah disepakati, dan
         * mengubahnya membuat adendum bertentangan dengan lembar induknya.
         *
         * Mengisinya di sini sekaligus melewati layar pemilih, karena
         * layar itu tampil hanya selama `channel` masih kosong.
         */
        const custom =
          typeof induk.customData === 'string'
            ? JSON.parse(induk.customData || '{}')
            : induk.customData || {};
        const jalur = custom?.insuranceChannel;
        if (jalur === 'broker' || jalur === 'langsung') {
          this.channel = jalur;
        }

        this.adendum.isiFormulir(this.formGroup, induk);
        this.adendum.kunciIsian(this.formGroup);

        /*
         * Rincian pertanggungan diambil dari `customData.coverages`, BUKAN
         * dari `items`.
         *
         * Varian ini menyimpan isinya di sana — jenis, objek, nilai
         * pertanggungan, risiko sendiri, dan masa berlakunya tidak punya
         * padanan pada baris barang biasa. Membacanya dari `items`
         * menghasilkan baris yang hanya berisi volume dan harga, sehingga
         * seluruh rincian pertanggungannya kosong.
         *
         * `items` tetap dibaca untuk volume, satuan, dan harga; keduanya
         * digabung menurut urutan barisnya.
         */
        const coverages = this.adendum.larikCustom(induk, 'coverages');
        const items = this.adendum.barisInduk(induk);
        const jumlah = Math.max(coverages.length, items.length);

        this.t.clear();
        for (let i = 0; i < jumlah; i++) {
          const c = coverages[i] || {};
          const b = items[i] || {};
          this.addLine();
          this.t.at(this.t.length - 1).patchValue({
            // Jenis pertanggungan disimpan sebagai teks tugasnya; bila tidak
            // ada di daftar pilihan, ia jatuh ke "Lainnya" dengan teks itu
            // sebagai isian bebasnya.
            insuranceType: this.insuranceTypes.includes(c.type)
              ? c.type
              : c.type
                ? 'Lainnya'
                : '',
            customType: this.insuranceTypes.includes(c.type)
              ? ''
              : (c.type ?? ''),
            object: c.object ?? '',
            sumInsured: Number(c.sumInsured) || 0,
            deductible: c.deductible ?? '',
            coverageStart: c.coverageStart ?? '',
            coverageEnd: c.coverageEnd ?? '',
            // Volume dikosongkan pada adendum — ia memuat SELISIH.
            quantity: b.quantity ?? null,
            unit: b.unit ?? 'polis',
            price: Number(b.price) || 0,
          });
        }

        /*
         * Premi yang dititipkan ikut diwarisi.
         *
         * Tanpa ini, adendum atas dokumen berpremi kehilangan seluruh
         * daftarnya — dan yang mengisinya tidak melihat bahwa preminya
         * pernah ada.
         */
        const premi = this.adendum.larikCustom(induk, 'premiums');
        this.premiums.clear();
        for (const x of premi) {
          this.addPremium();
          this.premiums.at(this.premiums.length - 1).patchValue({
            task: x.task ?? '',
            description: x.description ?? '',
            amount: Number(x.amount) || 0,
          });
        }
        /*
         * Poin perjanjian tambahan ikut diwarisi.
         *
         * Hilang di SELURUH varian sebelumnya: `isiFormulir` melewati setiap
         * FormArray, dan tidak ada satu pun varian yang mengisinya sendiri.
         * Adendum karena itu terbit tanpa poin khusus yang sudah disepakati
         * pada dokumen induknya — dan yang membacanya menganggap poin itu
         * memang tidak pernah ada.
         */
        const klausulInduk = this.adendum.larikCustom(induk, 'additionalClauses');
        this.additionalClauses.clear();
        for (const teks of klausulInduk) {
          this.addClause();
          this.additionalClauses
            .at(this.additionalClauses.length - 1)
            .setValue(teks ?? '');
        }
      },
      error: () => {},
    });
  }

}
