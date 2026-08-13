import { Component, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ClauseLineComponent } from '../../../../components/clause-line/clause-line.component';
import { PurchaseOrderTypeSwitcher } from '../../../../services/purchase-order-type-switcher.service';
import { buildClauseLines } from '../../../../constants/clause-templates';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { PphSelectorComponent } from '../../../../components/pph-selector/pph-selector.component';
import { IPPh } from '../../../../utils/pph';
import { printPurchaseOrderG } from '../../../../helpers/purchase-order-g.helper';
import { printPurchaseOrderB } from '../../../../helpers/purchase-order-b.helper';
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
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SupplierSelectorComponent } from '../../../../components/supplier-selector/supplier-selector.component';
import { MasterItemSelectorComponent } from '../../../../components/master-item-selector/master-item-selector.component';
import { HeaderTitleComponent } from '../../../../components/header-title/header-title.component';
import { ApiService } from '../../../../services/api.service';
import { purchaseTypeLabel } from '../../../../constants/purchase-type-label.constant';
import { TranslatePipe } from '@ngx-translate/core';
import { ProjectSelectorComponent } from '../../../../components/project-selector/project-selector.component';
import { tanggalLokal } from '../../../../utils/tanggal';
import { firstValueFrom } from 'rxjs';
import { PurchaseOrderViewComponent } from '../../../../pages/purchase-order/purchase-order-view/purchase-order-view.component';

/**
 * Marketing purchase orders:
 *   6.3.1 Advertising Expense
 *   6.3.2 Promotional Merchandise
 * The code comes from the route data. Goods and services are never mixed in
 * one order — the mode is chosen up front and drives the whole line editor.
 */
@Component({
  selector: 'app-purchase-order-create-63',
  standalone: true,
  providers: [provideNgxMask()],
  imports: [
    ProjectSelectorComponent,
    ClauseLineComponent,
    MatCheckboxModule,
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
  templateUrl: './purchase-order-create-63.component.html',
  styleUrl: './purchase-order-create-63.component.scss',
})
export class PurchaseOrderCreate63Component {
  private readonly translate = inject(TranslateService);
  /** Kode jenis PO, dipakai pada pill di kepala halaman. */
  get typeCode(): string {
    return this.purchaseType;
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

  isSubmitting = false;

  /**
   * Barang atau jasa disimpulkan dari jenis PO-nya, bukan ditanyakan lagi.
   *
   * 6.3.1 memang selalu jasa periklanan dan 6.3.2 selalu merchandise —
   * menanyakannya ulang hanya menambah satu langkah yang jawabannya sudah
   * pasti, sekaligus membuka kemungkinan terpilih tidak sesuai kodenya.
   */
  get mode(): 'barang' | 'jasa' {
    return this.purchaseType === '6.3.2' ? 'barang' : 'jasa';
  }

  /** '6.3.1' or '6.3.2', taken from the route definition */
  purchaseType: string = '6.3.2';

  get typeLabel(): string {
    return purchaseTypeLabel(this.translate, this.purchaseType);
  }

  serviceUnits: string[] = [
    'LS',
    'kegiatan',
    'hari',
    'jam',
    'paket',
    'video',
    'sesi',
    'bulan',
  ];

  formGroup: FormGroup = new FormGroup({
    date: new FormControl('', Validators.required),
    purchaseType: new FormControl('6.3.2'),
    supplierID: new FormControl('', Validators.required),
    supplierName: new FormControl('', Validators.required),
    supplierAddress: new FormControl('', Validators.required),
    supplierNpwp: new FormControl(''),
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
    // Poin tambahan bebas, dicetak setelah ketentuan baku. Disimpan sebagai
    // daftar, bukan satu blok teks, agar tiap poin dapat dinomori dan
    // dirakit ulang saat dokumennya dicetak.
    additionalClauses: new FormArray([]),
    // ---- 6.3.1 (jasa iklan) ----
    revisionCount: new FormControl(2, [Validators.min(0)]),
    // Sementara dimatikan atas keputusan pemilik proses; poinnya tetap
    // tercetak dalam keadaan tercoret.
    fileRetentionDays: new FormControl(30, [Validators.min(0)]),
    latePenaltyRequired: new FormControl(false),
    latePenaltyPermil: new FormControl(1, [Validators.min(0)]),
    latePenaltyCapPercent: new FormControl(5, [Validators.min(0)]),
    pphCode: new FormControl(''),
    pphTaxObject: new FormControl(''),
    pphPercentage: new FormControl(0),
    // ---- 6.3.2 (merchandise) ----
    sampleApprovalRequired: new FormControl(true),
    /*
     * Pengiriman dan kontak penanggung jawab.
     *
     * Hanya berlaku pada merchandise: barangnya dikirim, sehingga klausul
     * Franco/Loco, alamat, dan kontak dua pihak harus terisi. Tanpa field
     * ini, poin-poin tersebut tetap tercetak tetapi isinya tanda hubung.
     *
     * Jasa periklanan tidak memakainya — tidak ada barang yang dikirim.
     */
    deliveryMethod: new FormControl(0),
    deliveryAddress: new FormControl(''),
    supplierPICName: new FormControl(''),
    supplierPICPhoneNumber: new FormControl(''),
    officePICName: new FormControl(''),
    officePICPhoneNumber: new FormControl(''),
    lines: new FormArray([]),
    includePPN: new FormControl(true),
  });

  ngOnInit(): void {
    const routeType = this.route.snapshot.data?.['purchaseType'];
    if (routeType) {
      this.purchaseType = routeType;
      this.formGroup.patchValue({ purchaseType: routeType });
    }
    // Mode sudah pasti dari jenis PO, jadi baris pertamanya bisa langsung
    // disiapkan tanpa menunggu pilihan apa pun.
    if (!this.isGoods && this.t.length === 0) this.addService();
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

  /**
   * Ketentuan baku yang akan tercetak, ditampilkan sejak awal.
   *
   * Poinnya dirakit dari template, bukan diketik ulang — sehingga yang
   * terbaca di layar tidak mungkin berbeda dari yang keluar di dokumen.
   */
  get clausePreview(): (string | string[])[] {
    return buildClauseLines(
      this.purchaseType,
      this.clauseContext() as any,
      '1.0',
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

  get isGoods(): boolean {
    return this.mode === 'barang';
  }
  get modeLabel(): string {
    return this.mode === 'barang' ? 'Barang / merchandise' : 'Jasa';
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

  // ---- service line (free text, like PO-D) ----
  private buildServiceLine(): FormGroup {
    return this.formBuilder.group({
      task: ['', [Validators.required, Validators.maxLength(100)]],
      item_id: [null],
      sku: [''],
      quantity: [1, [Validators.required, Validators.min(0.01)]],
      unit: ['LS', Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
      note: [''],
    });
  }

  addService() {
    this.t.push(this.buildServiceLine());

    // Baris baru memakai satuan borongan, sehingga volumenya langsung
    // dikunci — tanpa ini kolomnya terbuka sampai satuannya disentuh.
    this.onUnitChange(this.t.length - 1);
  }

  // ---- goods line (from master item, like PO-G) ----
  private buildGoodsLine(item: any): FormGroup {
    return this.formBuilder.group({
      task: [''],
      item_id: [item.id, Validators.required],
      sku: [item.sku],
      description: [item.description],
      quantity: [1, [Validators.required, Validators.min(0.01)]],
      unit: [item.unit || 'pcs', Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
      note: [''],
    });
  }

  openItemSelector() {
    this.dialog
      .open(MasterItemSelectorComponent, {
        data: { purchaseType: this.purchaseType },
        width: '560px',
        maxWidth: '94vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((item) => {
        if (!item) return;
        const exists = this.t.value.some((x: any) => x.item_id === item.id);
        if (exists) {
          this.snackBar.open(
      this.translate.instant('notify.alreadyInList'), 'Close', {
            duration: 2500,
          });
          return;
        }
        this.t.push(this.buildGoodsLine(item));
      });
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
      purchaseType: this.purchaseType,
      projectName: projectCode,
      projectCode: projectCode,
      name: '',
      dpp: dpp,
      ppn: ppn,
      payment_term: this.formGroup.get('paymentTerm')?.value,
      templateVersion: '1.0',
      billing_requirements: {},
      // mixed lines -> purchase_order_items
      items: this.t.controls.map((c) => {
        const x = c.getRawValue();
        return {
          // goods carry the catalogue id; services carry a free-text task
          item_id: this.isGoods ? x.item_id : null,
          task: this.isGoods ? null : x.task,
          quantity: x.unit === 'LS' ? 1 : x.quantity,
          price: x.price,
          unit: x.unit,
          remarks_1: x.note, // catatan (ex. sablon 1 warna, ukuran, deadline)
        };
      }),
      customData: {
        marketingMode: this.mode, // 'barang' | 'jasa'
        paymentTerm: this.formGroup.get('paymentTerm')?.value,
        creditTerm: this.formGroup.get('creditTerm')?.value,
        prepaidTerm: this.formGroup.get('prepaidTerm')?.value,
        // Data sumber klausul; poinnya dirakit ulang saat dicetak.
        revisionCount: this.formGroup.get('revisionCount')?.value,
        fileRetentionDays: this.formGroup.get('fileRetentionDays')?.value,
        latePenaltyRequired: !!this.formGroup.get('latePenaltyRequired')?.value,
        latePenaltyPermil: this.formGroup.get('latePenaltyPermil')?.value,
        latePenaltyCapPercent: this.formGroup.get('latePenaltyCapPercent')
          ?.value,
        sampleApprovalRequired: !!this.formGroup.get('sampleApprovalRequired')
          ?.value,
        deliveryMethod: this.formGroup.get('deliveryMethod')?.value,
        deliveryAddress: this.formGroup.get('deliveryAddress')?.value,
        supplierPICName: this.formGroup.get('supplierPICName')?.value,
        supplierPICPhoneNumber: this.formGroup.get('supplierPICPhoneNumber')
          ?.value,
        officePICName: this.formGroup.get('officePICName')?.value,
        officePICPhoneNumber: this.formGroup.get('officePICPhoneNumber')?.value,
        pphCode: this.isGoods ? '' : this.formGroup.get('pphCode')?.value,
        pphTaxObject: this.isGoods
          ? ''
          : this.formGroup.get('pphTaxObject')?.value,
        pphPercentage: this.isGoods
          ? 0
          : this.formGroup.get('pphPercentage')?.value,
        additionalClauses: this.additionalClauseValues,
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
      revisionCount: v.revisionCount,
      fileRetentionDays: v.fileRetentionDays,
      latePenaltyRequired: !!v.latePenaltyRequired,
      latePenaltyPermil: v.latePenaltyPermil,
      latePenaltyCapPercent: v.latePenaltyCapPercent,
      sampleApprovalRequired: !!v.sampleApprovalRequired,
      // Hanya merchandise yang memakai klausul pengiriman.
      deliveryMethod: this.isGoods ? v.deliveryMethod : undefined,
      deliveryAddress: this.isGoods ? v.deliveryAddress : undefined,
      supplierPICName: this.isGoods ? v.supplierPICName : undefined,
      supplierPICPhoneNumber: this.isGoods
        ? v.supplierPICPhoneNumber
        : undefined,
      officePICName: this.isGoods ? v.officePICName : undefined,
      officePICPhoneNumber: this.isGoods ? v.officePICPhoneNumber : undefined,
      // Merchandise adalah pembelian barang, bukan objek pemotongan PPh.
      pphCode: this.isGoods ? '' : v.pphCode,
      pphTaxObject: this.isGoods ? '' : v.pphTaxObject,
      pphPercentage: this.isGoods ? 0 : v.pphPercentage,
    };
  }

  /**
   * Susun data cetak.
   *
   * Merchandise adalah pembelian barang, sehingga memakai tata letak PO-G.
   * Jasa periklanan berupa pemesanan karya, sehingga memakai tata letak
   * Surat Perintah Kerja — bukan SPK tenaga kerja, karena yang dibeli hasil
   * jadi, bukan waktu kerja orang.
   */
  private buildPrintData(purchaseOrderName: string) {
    const v = this.formGroup.getRawValue();
    return {
      poType: this.purchaseType,
      purchaseOrderName,
      date: v.date,
      projectName: v.projectName,
      supplierName: v.supplierName,
      supplierAddress: v.supplierAddress,
      supplierNpwp: v.supplierNpwp,
      items: this.t.controls.map((c) => {
        const x = c.getRawValue();
        return {
          name: this.isGoods ? x.description || x.name : x.task,
          remarks: x.note,
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

  // ---- termin pembayaran ----
  //
  // Termin disimpan sebagai KODE, bukan teks bebas: `paymentSentence()`
  // memilih kalimatnya berdasarkan kode, sehingga teks bebas jatuh ke
  // cabang cadangan dan tercetak apa adanya tanpa kalimat yang benar.
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
      name: this.translate.instant('poForm.draftNotIssued'),
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
          // Buka PDF-nya; gagal cetak tidak membatalkan PO yang tersimpan.
          try {
            const printData = this.buildPrintData(
              res?.purchase_order_name ?? '',
            );
            if (this.isGoods) {
              printPurchaseOrderG(printData);
            } else {
              printPurchaseOrderB(printData);
            }
          } catch (e) {
            console.error('Gagal membuat PDF purchase order:', e);
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
