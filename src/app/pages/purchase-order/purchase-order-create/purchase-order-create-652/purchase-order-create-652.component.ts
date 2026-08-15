import { CommonModule } from '@angular/common';
import { ClauseLineComponent } from '../../../../components/clause-line/clause-line.component';
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
import { buildTrainingClauses } from '../../../../constants/clause-templates';
import { printPurchaseOrderB } from '../../../../helpers/purchase-order-b.helper';
import { PurchaseOrderTypeSwitcher } from '../../../../services/purchase-order-type-switcher.service';
import { tanggalLokal } from '../../../../utils/tanggal';
import { firstValueFrom } from 'rxjs';
import { PurchaseOrderViewComponent } from '../../../../pages/purchase-order/purchase-order-view/purchase-order-view.component';
import { AdendumService } from '../../../../services/adendum.service';

/**
 * 6.5.2 Biaya pelatihan.
 *
 * Berbeda dari pemeriksaan peserta pada 6.5.1: yang dituju bukan keputusan
 * atas seseorang, melainkan kemampuan beserta bukti resminya. Tiga hal
 * menjadi pokok — kelulusan yang bisa gagal, sertifikat yang penerbitnya
 * harus berwenang, dan masa berlaku yang bila lewat membuat orangnya tidak
 * boleh bekerja.
 */
@Component({
  selector: 'app-purchase-order-create-652',
  standalone: true,
  providers: [provideNgxMask(), provideNativeDateAdapter()],
  imports: [
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
  ],
  templateUrl: './purchase-order-create-652.component.html',
  styleUrl: './purchase-order-create-652.component.scss',
})
export class PurchaseOrderCreate652Component {
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
    private adendum: AdendumService,
    private formBuilder: FormBuilder,
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog,
  ) {}

  private readonly typeSwitcher = inject(PurchaseOrderTypeSwitcher);

  onChangeType() {
    this.typeSwitcher.open(this.formGroup?.dirty === true);

    // Bila dibuka sebagai adendum, isinya diambil dari induknya.
    this.muatAdendum();
  }

  get typeCode(): string {
    return '6.5.2';
  }
  get typeLabel(): string {
    return purchaseTypeLabel(this.translateSvc, '6.5.2');
  }

  isSubmitting = false;
  readonly purchaseType = '6.5.2';

  /**
   * Jenis pelatihan dibuat sebagai pilihan, bukan isian bebas.
   *
   * Penulisan bebas menghasilkan "SIO", "S.I.O", dan "Surat Izin Operator"
   * untuk hal yang sama, sehingga sertifikat sulit ditelusuri kembali saat
   * masa berlakunya perlu diperiksa.
   */
  trainingTypes: string[] = [
    'SIO Operator Alat Berat',
    'K3 Konstruksi',
    'Ahli K3 Umum',
    'SKK Konstruksi',
    'Rigger / Juru Ikat Beban',
    'P3K di Tempat Kerja',
    'Perangkat Lunak',
    'Lainnya',
  ];

  formGroup: FormGroup = new FormGroup({
    date: new FormControl('', Validators.required),
    purchaseType: new FormControl('6.5.2'),
    supplierID: new FormControl('', Validators.required),
    supplierName: new FormControl('', Validators.required),
    supplierAddress: new FormControl('', Validators.required),
    supplierNpwp: new FormControl(''),
    /*
     * Pelatihan selalu dibebankan ke PUSAT, tidak pernah ke proyek.
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
    creditTerm: new FormControl(0),
    prepaidTerm: new FormControl(0),

    pphCode: new FormControl(''),
    pphTaxObject: new FormControl(''),
    pphPercentage: new FormControl(0),

    trainingVenue: new FormControl('penyedia'),
    participantCancelDays: new FormControl(3, [Validators.min(0)]),
    certificateDueDays: new FormControl(30, [Validators.min(0)]),
    retakeCostBearer: new FormControl('kesepakatan'),

    lines: new FormArray([]),
    additionalClauses: new FormArray([]),
    includePPN: new FormControl(false),
  });

  readonly retakeBearers = [
    { value: 'pertama', key: 'po652.bearerFirst' },
    { value: 'kedua', key: 'po652.bearerSecond' },
    { value: 'kesepakatan', key: 'po652.bearerAgreed' },
  ];

  ngOnInit(): void {
    const routeType = this.route.snapshot.data['purchaseType'];
    if (routeType) this.formGroup.patchValue({ purchaseType: routeType });
    this.addLine();
  }

  // ---- rincian pelatihan ----
  get t(): FormArray {
    return this.formGroup.get('lines') as FormArray;
  }
  getFormGroupAt(i: number) {
    return this.t.at(i) as FormGroup;
  }

  addLine() {
    this.t.push(
      this.formBuilder.group({
        trainingType: ['', Validators.required],
        customType: [''], // dipakai saat trainingType === 'Lainnya'
        // Lembaga yang menerbitkan sertifikat, mis. "Kemnaker RI".
        issuer: [''],
        startDate: [''],
        endDate: [''],
        quantity: [1, [Validators.required, Validators.min(0.01)]],
        unit: ['peserta', Validators.required],
        price: [0, [Validators.required, Validators.min(0)]],
      }),
    );
  }

  removeLineAt(i: number) {
    this.t.removeAt(i);
  }

  isOther(i: number): boolean {
    return this.getFormGroupAt(i).value.trainingType === 'Lainnya';
  }

  /** Nama jenis yang benar-benar tersimpan pada kolom pekerjaan. */
  private lineTask(i: number): string {
    const v = this.getFormGroupAt(i).value;
    return v.trainingType === 'Lainnya'
      ? v.customType || 'Lainnya'
      : v.trainingType || '';
  }

  /** Keterangan di bawah nama pelatihan: tanggal dan lembaga penerbit. */
  private lineRemarks(i: number): string {
    const x = this.getFormGroupAt(i).getRawValue();
    const bagian: string[] = [];
    const mulai = this.tanggalPanjang(x.startDate);
    const selesai = this.tanggalPanjang(x.endDate);
    if (mulai && selesai) bagian.push(`${mulai} s/d ${selesai}`);
    else if (mulai) bagian.push(mulai);
    if (x.issuer) bagian.push(String(x.issuer));
    return bagian.join(' · ');
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

  /** Jumlah peserta seluruh baris, untuk keterangan di layar. */
  get totalPeserta(): number {
    return this.t.controls.reduce(
      (acc, c) => acc + (Number(c.value.quantity) || 0),
      0,
    );
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
          supplierAddress: data.address,
          supplierNpwp: data.npwp || '',
        });
      });
  }

  openPphSelector() {
    this.dialog
      .open(PphSelectorComponent, {})
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

  private toISO(d: any): string | null {
    return d ? tanggalLokal(d) : null;
  }

  /** Data sumber klausul; dipakai bersama pratinjau dan pencetakan. */
  private clauseContext() {
    const v = this.formGroup.getRawValue();
    return {
      paymentTerm: v.paymentTerm,
      creditTerm: v.creditTerm,
      prepaidTerm: v.prepaidTerm,
      trainingVenue: v.trainingVenue,
      participantCancelDays: v.participantCancelDays,
      certificateDueDays: v.certificateDueDays,
      retakeCostBearer: v.retakeCostBearer,
      pphCode: v.pphCode,
      pphTaxObject: v.pphTaxObject,
      pphPercentage: v.pphPercentage,
    };
  }

  /**
   * Ketentuan baku yang akan tercetak, ditampilkan sejak awal.
   *
   * Dirakit dari template yang sama dengan pencetakan, sehingga yang terbaca
   * di layar tidak mungkin berbeda dari yang keluar di dokumen.
   */
  get previewSections() {
    return buildTrainingClauses(
      this.clauseContext() as any,
      this.additionalClauseValues,
    );
  }

  private formatData() {
    const v = this.formGroup.getRawValue();
    return {
      date: moment(v.date).format('YYYY-MM-DD'),
      supplierID: v.supplierID,
      purchaseType: '6.5.2',
      projectName: v.projectName,
      dpp: this.subTotal,
      ppn: v.includePPN ? 11 : 0,
      pphCode: v.pphCode || null,
      pphTaxObject: v.pphTaxObject || null,
      pphPercentage: Number(v.pphPercentage) || 0,
      payment_term: v.paymentTerm,
      templateVersion: '1.0',
      items: this.t.controls.map((c, i) => {
        const x = c.getRawValue();
        return {
          task: this.lineTask(i),
          quantity: x.unit === 'LS' ? 1 : x.quantity,
          price: x.price,
          unit: x.unit,
          remarks_1: this.toISO(x.startDate),
          remarks_2: this.toISO(x.endDate),
          remarks_3: x.issuer || null,
        };
      }),
      // Penanda induk bila dokumen ini ADENDUM; server yang
      // menghitung nomor adendumnya.
      parentPurchaseOrderID: this.adendum.indukId ?? undefined,
      customData: {
        trainingVenue: v.trainingVenue,
        participantCancelDays: v.participantCancelDays,
        certificateDueDays: v.certificateDueDays,
        retakeCostBearer: v.retakeCostBearer,
        pphCode: v.pphCode,
        pphTaxObject: v.pphTaxObject,
        pphPercentage: v.pphPercentage,
        paymentTerm: v.paymentTerm,
        creditTerm: v.creditTerm,
        prepaidTerm: v.prepaidTerm,
        additionalClauses: this.additionalClauseValues,
      },
    };
  }

  /**
   * Susun data cetak.
   *
   * Pelatihan adalah pemesanan jasa, sehingga dokumennya memakai tata letak
   * Surat Perintah Kerja.
   */
  private buildPrintData(purchaseOrderName: string) {
    const v = this.formGroup.getRawValue();
    return {
      poType: '6.5.2',
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
          remarks: this.lineRemarks(i),
          quantity: x.unit === 'LS' ? 1 : Number(x.quantity) || 0,
          unit: x.unit,
          price: Number(x.price) || 0,
        };
      }),
      includePpn: !!v.includePPN,
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
        this.t.clear();
        this.adendum.barisInduk(induk).forEach((x: any) => {
          this.addLine();
          this.t.at(this.t.length - 1).patchValue(x);
        });
      },
      error: () => {},
    });
  }

}
