import { Component, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ClauseLineComponent } from '../../../../components/clause-line/clause-line.component';
import { PurchaseOrderTypeSwitcher } from '../../../../services/purchase-order-type-switcher.service';
import { purchaseTypeLabel } from '../../../../constants/purchase-type-label.constant';
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
import { MasterItemSelectorComponent } from '../../../../components/master-item-selector/master-item-selector.component';
import { HeaderTitleComponent } from '../../../../components/header-title/header-title.component';
import { ApiService } from '../../../../services/api.service';
import {
  buildClauseHtml,
  buildClauseLines,
  buildMaintenanceBillingTerms,
  latestClauseVersion,
} from '../../../../constants/clause-templates';
import { PphSelectorComponent } from '../../../../components/pph-selector/pph-selector.component';
import { IPPh } from '../../../../utils/pph';
import { printPurchaseOrderG } from '../../../../helpers/purchase-order-g.helper';
import { printPurchaseOrderB } from '../../../../helpers/purchase-order-b.helper';
import { TranslatePipe } from '@ngx-translate/core';
import { tanggalLokal } from '../../../../utils/tanggal';
import { firstValueFrom } from 'rxjs';
import { PurchaseOrderViewComponent } from '../../../../pages/purchase-order/purchase-order-view/purchase-order-view.component';

/**
 * 5.1.2 Asset maintenance.
 * Maintenance spending comes in two shapes, so the form asks up front:
 *   'barang' — sparepart / material, picked from master item (like PO-G)
 *   'jasa'   — repair or service work, free-text scope (like PO-H)
 */
@Component({
  selector: 'app-purchase-order-create-512',
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
  templateUrl: './purchase-order-create-512.component.html',
  styleUrl: './purchase-order-create-512.component.scss',
})
export class PurchaseOrderCreate512Component {
  private readonly translate = inject(TranslateService);
  /** Kode jenis PO, dipakai pada pill di kepala halaman. */
  get typeCode(): string {
    return '5.1.2';
  }

  /** Nama jenis PO, dipakai pada pill di kepala halaman. */
  get typeLabel(): string {
    return purchaseTypeLabel(this.translate, '5.1.2');
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

  templateVersion = latestClauseVersion('5.1.2');

  /** null until the mode dialog is answered */
  mode: 'barang' | 'jasa' | null = null;

  serviceUnits: string[] = [
    'LS',
    'unit',
    'kali',
    'hari',
    'jam',
    'paket',
    'orang',
  ];

  formGroup: FormGroup = new FormGroup({
    date: new FormControl('', Validators.required),
    purchaseType: new FormControl('5.1.2'),
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
    paymentTerm: new FormControl('', Validators.required),
    creditTerm: new FormControl(0, Validators.required),
    prepaidTerm: new FormControl(0, [
      Validators.required,
      Validators.min(0),
      Validators.max(100),
    ]),
    // dipakai clause mode BARANG (persis G). Divalidasi kondisional lewat setGoodsValidators().
    deliveryMethod: new FormControl(0),
    deliveryAddress: new FormControl(''),
    supplierPICName: new FormControl(''),
    supplierPICPhoneNumber: new FormControl(''),
    officePICName: new FormControl(''),
    officePICPhoneNumber: new FormControl(''),
    // Pemotongan PPh hanya relevan pada mode jasa; dikosongkan lagi bila
    // penggunanya berpindah ke mode barang.
    pphCode: new FormControl(''),
    pphTaxObject: new FormControl(''),
    pphPercentage: new FormControl(0),
    additionalClauses: new FormArray([]),
    lines: new FormArray([]),
    includePPN: new FormControl(true),
  });

  /*
   * Termin memakai kode baku, bukan teks bebas. Kalimat termin pada klausul
   * dipilih berdasarkan kode ini; teks bebas tidak cocok dengan satu pun
   * cabangnya sehingga dokumennya dulu tercetak tanpa termin.
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

  /** Kolom tempo/uang muka hanya aktif bila terminnya memang memakainya. */
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

  ngOnInit(): void {}

  /**
   * Bentuk dipilih di layar, bukan lewat dialog.
   *
   * Dialog yang ditutup membuat bentuknya tetap kosong: formulir tidak dapat
   * dipakai maupun diganti, dan satu-satunya jalan keluar adalah memuat ulang
   * halaman. Layar pemilih tidak bisa "tertutup", dan menggantinya cukup
   * lewat tombol kembali.
   */
  chooseMode(picked: 'barang' | 'jasa') {
    if (picked === this.mode) return;
    this.mode = picked;
    this.t.clear(); // bentuk baris berbeda per mode
    this.setGoodsValidators();
    if (picked === 'jasa') this.addService();
  }

  /** Kembali ke layar pemilih; baris dikosongkan karena bentuknya beda. */
  resetMode() {
    this.mode = null;
    this.t.clear();
  }

  get isGoods(): boolean {
    return this.mode === 'barang';
  }
  get modeLabel(): string {
    return this.mode === 'barang'
      ? 'Beli barang (sparepart)'
      : 'Pesan jasa (perbaikan)';
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

  // ---- jasa lines ----
  private buildServiceLine(): FormGroup {
    return this.formBuilder.group({
      task: ['', [Validators.required, Validators.maxLength(100)]],
      asset: [''], // aset yang diperbaiki -> remarks_2
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

  // ---- barang lines ----
  private buildGoodsLine(item: any): FormGroup {
    return this.formBuilder.group({
      item_id: [item.id, Validators.required],
      sku: [item.sku],
      description: [item.description],
      asset: [''], // aset tujuan sparepart -> remarks_2
      quantity: [1, [Validators.required, Validators.min(0.01)]],
      unit: [item.unit || 'pcs', Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
      note: [''],
    });
  }

  openItemSelector() {
    this.dialog
      .open(MasterItemSelectorComponent, {
        data: { purchaseType: '5.1.2' },
        width: '560px',
        maxWidth: '94vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((item) => {
        if (!item) return;
        if (this.t.value.some((x: any) => x.item_id === item.id)) {
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



  // --- poin perjanjian tambahan (custom) ---
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

  private clauseContext() {
    const v = this.formGroup.getRawValue();
    return {
      paymentTerm: v.paymentTerm,
      creditTerm: v.creditTerm,
      prepaidTerm: v.prepaidTerm,
      maintenanceMode: this.mode || 'barang',
      // Hanya jasa yang dipotong PPh; mode barang tidak mengirimkannya
      // sehingga klausulnya tidak ikut tercetak.
      pphCode: this.isGoods ? '' : v.pphCode,
      pphTaxObject: this.isGoods ? '' : v.pphTaxObject,
      pphPercentage: this.isGoods ? 0 : v.pphPercentage,
      // dipakai mode barang (clause G)
      deliveryMethod: v.deliveryMethod,
      deliveryAddress: v.deliveryAddress,
      supplierPICName: v.supplierPICName,
      supplierPICPhoneNumber: v.supplierPICPhoneNumber,
      officePICName: v.officePICName,
      officePICPhoneNumber: v.officePICPhoneNumber,
    };
  }

  /** field pengiriman + kontak PJ wajib hanya saat mode barang */
  private setGoodsValidators() {
    const goods = this.isGoods;
    // Pindah ke mode barang membuang PPh yang sempat dipilih, agar tidak
    // ikut tersimpan diam-diam pada PO pembelian sparepart.
    if (goods) this.clearPph();
    const req = [
      'deliveryAddress',
      'supplierPICName',
      'supplierPICPhoneNumber',
      'officePICName',
      'officePICPhoneNumber',
    ];
    for (const name of req) {
      const c = this.formGroup.get(name);
      if (!c) continue;
      if (goods) {
        c.addValidators(Validators.required);
      } else {
        c.clearValidators();
        c.setValue('');
      }
      c.updateValueAndValidity({ emitEvent: false });
    }
  }

  /**
   * Ketentuan baku yang akan tercetak, ditampilkan sejak awal.
   *
   * Dirakit dari template yang sama dengan pencetakan, sehingga yang terbaca
   * di layar tidak mungkin berbeda dari yang keluar di dokumen.
   */
  get clausePreview(): (string | string[])[] {
    return buildClauseLines(
      '5.1.2',
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
      purchaseType: '5.1.2',
      projectName: projectCode,
      projectCode: projectCode,
      name: '',
      dpp: dpp,
      ppn: ppn,
      payment_term: this.formGroup.get('paymentTerm')?.value,
      templateVersion: this.templateVersion,
      billing_requirements: {},
      items: this.t.controls.map((c) => {
        const x = c.getRawValue();
        return {
          item_id: this.isGoods ? x.item_id : null,
          task: this.isGoods ? null : x.task,
          quantity: x.unit === 'LS' ? 1 : x.quantity,
          price: x.price,
          unit: x.unit,
          remarks_1: x.note, // catatan
          remarks_2: x.asset, // aset yang dirawat / diperbaiki
        };
      }),
      customData: {
        maintenanceMode: this.mode, // 'barang' | 'jasa'
        pphCode: this.isGoods ? '' : this.formGroup.get('pphCode')?.value,
        pphTaxObject: this.isGoods
          ? ''
          : this.formGroup.get('pphTaxObject')?.value,
        pphPercentage: this.isGoods
          ? 0
          : this.formGroup.get('pphPercentage')?.value,
        paymentTerm: this.formGroup.get('paymentTerm')?.value,
        creditTerm: this.formGroup.get('creditTerm')?.value,
        prepaidTerm: this.formGroup.get('prepaidTerm')?.value,
        // field pengiriman + kontak PJ (mode barang), biar PO lama render ulang persis
        deliveryMethod: this.formGroup.get('deliveryMethod')?.value,
        deliveryAddress: this.formGroup.get('deliveryAddress')?.value,
        supplierPICName: this.formGroup.get('supplierPICName')?.value,
        supplierPICPhoneNumber: this.formGroup.get('supplierPICPhoneNumber')
          ?.value,
        officePICName: this.formGroup.get('officePICName')?.value,
        officePICPhoneNumber: this.formGroup.get('officePICPhoneNumber')?.value,
        // Poin perjanjian TIDAK disimpan sebagai teks. Renderer merakit
        // ulang dari templateVersion + data di bawah, supaya mengedit PO
        // tidak menyisakan kalimat lama yang tidak sinkron.
        additionalClauses: this.additionalClauseValues
          .map((x) => (x || '').trim())
          .filter((x) => x.length > 0),
      },
    };
  }

  /**
   * Susun data cetak dari isian form.
   *
   * Dua mode menghasilkan dokumen berbeda: sparepart adalah pembelian
   * barang (Purchase Order, tata letak G), sedangkan perbaikan adalah
   * pemesanan jasa (Surat Perintah Kerja, tata letak B). Keduanya memakai
   * template klausul '5.1.2' yang sama.
   */
  private buildPrintData(purchaseOrderName: string) {
    const v = this.formGroup.getRawValue();
    return {
      poType: '5.1.2',
      purchaseOrderName,
      date: v.date,
      projectName: v.projectName,
      supplierName: v.supplierName,
      supplierAddress: v.supplierAddress,
      supplierNpwp: v.supplierNpwp,
      items: this.t.controls.map((c) => {
        const x = c.getRawValue();
        return {
          // Barang memakai deskripsi katalog; jasa memakai uraian pekerjaan.
          name: this.isGoods ? x.description : x.task,
          // Aset yang dirawat ikut dicetak agar dokumen bisa ditelusuri ke
          // alat mana; tanpa ini satu-satunya penanda hanya nomor PO.
          remarks: [x.asset, x.note].filter(Boolean).join(' — '),
          quantity: x.unit === 'LS' ? 1 : Number(x.quantity) || 0,
          unit: x.unit,
          price: Number(x.price) || 0,
        };
      }),
      includePpn: !!v.includePPN,
      templateVersion: this.templateVersion,
      clauseContext: this.clauseContext(),
      additionalClauses: this.additionalClauseValues
        .map((x) => (x || '').trim())
        .filter((x) => x.length > 0),
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
              printPurchaseOrderB({
                ...printData,
                billingTerms: buildMaintenanceBillingTerms(),
                billingTitle:
                  'TATA CARA PENAGIHAN DAN PEMBAYARAN\nJASA PERBAIKAN & PERAWATAN',
              });
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
