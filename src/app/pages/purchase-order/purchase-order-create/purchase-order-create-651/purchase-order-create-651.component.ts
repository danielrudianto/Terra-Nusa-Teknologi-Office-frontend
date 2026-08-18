import { CommonModule } from '@angular/common';
import { ClauseLineComponent } from '../../../../components/clause-line/clause-line.component';
import { PurchaseOrderTypeSwitcher } from '../../../../services/purchase-order-type-switcher.service';
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
import { purchaseTypeLabel } from '../../../../constants/purchase-type-label.constant';
import { HeaderTitleComponent } from '../../../../components/header-title/header-title.component';
import { SupplierSelectorComponent } from '../../../../components/supplier-selector/supplier-selector.component';
import { PphSelectorComponent } from '../../../../components/pph-selector/pph-selector.component';
import { IPPh } from '../../../../utils/pph';
import { buildClauseLines } from '../../../../constants/clause-templates';
import { printPurchaseOrderB } from '../../../../helpers/purchase-order-b.helper';
import { printPurchaseOrderG } from '../../../../helpers/purchase-order-g.helper';
import { tanggalLokal } from '../../../../utils/tanggal';
import { firstValueFrom } from 'rxjs';
import { PurchaseOrderViewComponent } from '../../../../pages/purchase-order/purchase-order-view/purchase-order-view.component';
import { AdendumService } from '../../../../services/adendum.service';
import { BALIK_BARIS } from '../../../../constants/balik-baris-po';
import { SupplierTerkunciComponent } from '../../../../components/supplier-terkunci/supplier-terkunci.component';

/**
 * 6.5.1 Biaya rekrutmen.
 *
 * Dua bentuk yang kewajiban bayarnya berbeda:
 *
 *   kuota   — sejumlah slot lowongan/tayang dibeli di muka lalu dipakai
 *             sampai habis; dokumennya surat pesanan (tata letak PO-G)
 *   peserta — pemeriksaan atas orang (psikotes, tes kesehatan), dibayar
 *             atas peserta yang benar-benar diperiksa; dokumennya SPK
 *
 * Jasa pencarian kandidat (headhunter) sengaja belum disediakan: bentuknya
 * berbasis hasil dan bergantung pada masa jaminan penggantian, yang tidak
 * dapat dirumuskan dengan tepat sebelum ada kontrak yang benar-benar
 * dijalankan.
 */
@Component({
  selector: 'app-purchase-order-create-651',
  standalone: true,
  providers: [provideNgxMask(), provideNativeDateAdapter()],
  imports: [
    ClauseLineComponent,
    CommonModule,
    ReactiveFormsModule,
    HeaderTitleComponent,
    TranslatePipe,
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
  templateUrl: './purchase-order-create-651.component.html',
  styleUrl: './purchase-order-create-651.component.scss',
})
export class PurchaseOrderCreate651Component {
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
  /** Kode jenis PO, dipakai pada pill di kepala halaman. */
  get typeCode(): string {
    return '6.5.1';
  }

  private readonly typeSwitcher = inject(PurchaseOrderTypeSwitcher);

  /** Buka pemilih jenis PO; isian yang sudah ada dikonfirmasi lebih dulu. */
  onChangeType() {
    this.typeSwitcher.open(this.formGroup?.dirty === true);
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

  isSubmitting = false;
  readonly purchaseType = '6.5.1';

  /** null sampai bentuknya dipilih — dokumen dan klausulnya berbeda. */
  mode: 'kuota' | 'peserta' | null = null;

  get typeLabel(): string {
    return purchaseTypeLabel(this.translateSvc, '6.5.1');
  }

  get isKuota(): boolean {
    return this.mode === 'kuota';
  }

  units: string[] = ['slot', 'lowongan', 'tayang', 'hari', 'paket', 'LS'];

  formGroup: FormGroup = new FormGroup({
    date: new FormControl('', Validators.required),
    purchaseType: new FormControl('6.5.1'),
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
    participantCancelDays: new FormControl(1, [Validators.min(0)]),

    /*
     * Termin, pajak, dan tenggat.
     *
     * Delapan kontrol berikut sempat hilang dari formGroup sementara
     * markup dan kodenya tetap memakainya — Angular melempar "Cannot find
     * control with name" untuk masing-masing, dan formulirnya tidak dapat
     * dibuka sama sekali.
     */
    paymentTerm: new FormControl('', Validators.required),
    creditTerm: new FormControl(0),
    prepaidTerm: new FormControl(0),

    pphCode: new FormControl(''),
    pphTaxObject: new FormControl(''),
    pphPercentage: new FormControl(0),

    // Masa berlaku kuota; hanya dipakai pada mode kuota.
    quotaValidUntil: new FormControl(''),
    // Tenggat penyerahan hasil pemeriksaan peserta.
    resultDueDays: new FormControl(7, [Validators.min(0)]),

    lines: new FormArray([]),
    additionalClauses: new FormArray([]),
    includePPN: new FormControl(true),
  });

  ngOnInit(): void {
    // Bila dibuka sebagai adendum atau koreksi, isinya diambil dari
    // dokumen induknya. Dipanggil di `ngOnInit` — bukan di penangan
    // tombol — karena alamatnya sudah membawa `adendumDari` sejak
    // halaman dibuka, dan yang membukanya tidak menekan apa pun.
    this.muatAdendum();
    // Bila dibuka sebagai adendum ATAU koreksi, isinya diambil
    // dari dokumen lamanya.
    //
    // Sebelumnya baris ini berada SETELAH `return` pada getter
    // lain, sehingga tidak pernah berjalan sama sekali —
    // adendum terbuka dengan formulir kosong tanpa satu pun
    // galat.
    if (this.adendum.memuatDokumenLama) this.muatAdendum();

    const routeType = this.route.snapshot.data['purchaseType'];
    if (routeType) {
      this.formGroup.patchValue({ purchaseType: routeType });
    }
  }

  /**
   * Bentuk dipilih di layar, bukan lewat dialog: dialog yang ditutup membuat
   * bentuknya tetap kosong tanpa jalan kembali selain memuat ulang halaman.
   */
  chooseMode(picked: 'kuota' | 'peserta') {
    if (picked === this.mode) return;
    this.mode = picked;
    this.t.clear(); // bentuk baris berbeda per mode
    this.addLine();
  }

  resetMode() {
    this.mode = null;
    this.t.clear();
  }

  // ---- baris ----
  get t(): FormArray {
    return this.formGroup.get('lines') as FormArray;
  }
  getFormGroupAt(i: number) {
    return this.t.at(i) as FormGroup;
  }

  addLine() {
    this.t.push(
      this.formBuilder.group({
        // kuota: nama paket/slot | peserta: jenis pemeriksaan
        task: ['', [Validators.required, Validators.maxLength(120)]],
        note: [''],
        quantity: [1, [Validators.required, Validators.min(0.01)]],
        unit: [this.isKuota ? 'slot' : 'peserta', Validators.required],
        price: [0, [Validators.required, Validators.min(0)]],
      }),
    );
  }

  removeLineAt(i: number) {
    this.t.removeAt(i);
  }

  lineTotal(i: number): number {
    const x = this.t.at(i).getRawValue();
    return (Number(x.quantity) || 0) * (Number(x.price) || 0);
  }

  get subTotal(): number {
    return this.t.controls.reduce((acc, _c, i) => acc + this.lineTotal(i), 0);
  }
  get ppnAmount(): number {
    return this.formGroup.get('includePPN')?.value ? this.subTotal * 0.11 : 0;
  }
  get grandTotal(): number {
    return this.subTotal + this.ppnAmount;
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
          supplierAddress: data.address,
          // Diambil hanya bila terisi; vendor perorangan kerap belum
          // ber-NPWP, dan baris kosong pada dokumen resmi lebih mengganggu
          // daripada tidak ada barisnya.
          supplierNpwp: data.npwp || '',
        });
      });
  }

  openPphSelector() {
    this.dialog
      .open(PphSelectorComponent, {
        // Jenis PO menentukan kode yang diusulkan lebih dulu.
        data: { purchaseType: '651' },})
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
      recruitmentMode: this.mode ?? 'kuota',
      quotaValidUntil: this.tanggalPanjang(v.quotaValidUntil),
      resultDueDays: v.resultDueDays,
      participantCancelDays: v.participantCancelDays,
    };
  }

  /** Tanggal dalam penulisan panjang, mis. "1 September 2026". */
  private tanggalPanjang(nilai: any): string {
    if (!nilai) return '';
    const d = new Date(nilai);
    return isNaN(d.getTime())
      ? ''
      : d.toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
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
      '6.5.1',
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

  private formatData() {
    const v = this.formGroup.getRawValue();
    const dpp = this.subTotal;

    return {
      date: moment(v.date).format('YYYY-MM-DD'),
      supplierID: v.supplierID,
      purchaseType: '6.5.1',
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
      dpp: dpp,
      ppn: v.includePPN ? 11 : 0,
      pphCode: v.pphCode || null,
      pphTaxObject: v.pphTaxObject || null,
      pphPercentage: Number(v.pphPercentage) || 0,
      payment_term: v.paymentTerm,
      templateVersion: '1.0',
      items: this.t.controls.map((c) => {
        const x = c.getRawValue();
        return {
          task: x.task,
          quantity: x.unit === 'LS' ? 1 : x.quantity,
          price: x.price,
          unit: x.unit,
          remarks_1: x.note || null,
        };
      }),
      // Penanda induk bila dokumen ini ADENDUM; server yang
      // menghitung nomor adendumnya.
      parentPurchaseOrderID: this.adendum.indukId ?? undefined,
      customData: {
        recruitmentMode: this.mode,
        paymentTerm: v.paymentTerm,
        creditTerm: v.creditTerm,
        prepaidTerm: v.prepaidTerm,
        pphCode: v.pphCode,
        pphTaxObject: v.pphTaxObject,
        pphPercentage: v.pphPercentage,
        // Tanggal disimpan dalam bentuk ISO; kalimatnya dirakit ulang saat
        // dokumen dicetak.
        quotaValidUntil: v.quotaValidUntil
          ? tanggalLokal(v.quotaValidUntil)
          : null,
        resultDueDays: v.resultDueDays,
        participantCancelDays: v.participantCancelDays,
        additionalClauses: this.additionalClauseValues,
      },
    };
  }

  /**
   * Susun data cetak.
   *
   * Kuota adalah pembelian slot, sehingga memakai tata letak surat pesanan
   * (PO-G). Pemeriksaan peserta adalah pemesanan jasa, sehingga memakai tata
   * letak Surat Perintah Kerja.
   */
  private buildPrintData(purchaseOrderName: string) {
    const v = this.formGroup.getRawValue();
    return {
      poType: '6.5.1',
      purchaseOrderName,
      date: v.date,
      projectName: v.projectName,
      supplierName: v.supplierName,
      supplierAddress: v.supplierAddress,
      supplierNpwp: v.supplierNpwp,
      items: this.t.controls.map((c) => {
        const x = c.getRawValue();
        return {
          name: x.task,
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
            const printData = this.buildPrintData(
              res?.purchase_order_name ?? '',
            );
            if (this.isKuota) {
              printPurchaseOrderG(printData);
            } else {
              printPurchaseOrderB(printData);
            }
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
            error?.error?.detail || 'Gagal membuat purchase order',
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
        this.adendum.isiFormulir(this.formGroup, induk);
        this.adendum.kunciIsian(this.formGroup);

        /*
         * Mode pekerjaan diwarisi, BUKAN ditanyakan lagi.
         *
         * Pilihannya menentukan bentuk seluruh formulir dan dokumennya.
         * Menanyakannya ulang saat menyunting membuat yang membetulkan satu
         * angka harus mengingat pilihan aslinya — dan bila ia salah pilih,
         * dokumennya berubah bentuk tanpa ada yang menyadarinya.
         *
         * Mengisinya di sini sekaligus melewati layar pemilih, karena layar
         * itu tampil hanya selama `mode` masih kosong.
         */
        const modeInduk =
          induk?.recruitmentMode ??
          (typeof induk.customData === 'string'
            ? JSON.parse(induk.customData || '{}')
            : induk.customData || {})?.recruitmentMode;
        if (modeInduk) {
          this.mode = modeInduk;
        }
        this.t.clear();
        this.adendum.barisInduk(induk).forEach((x: any) => {
          this.addLine();
          this.t.at(this.t.length - 1).patchValue(
            BALIK_BARIS['651'](x, this.isUbah),
          );
        });
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
