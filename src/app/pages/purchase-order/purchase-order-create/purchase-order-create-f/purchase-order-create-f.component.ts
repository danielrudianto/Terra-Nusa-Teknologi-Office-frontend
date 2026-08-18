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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ApiService } from '../../../../services/api.service';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import {
  buildClauseHtml,
  buildClauseLines,
  latestClauseVersion,
} from '../../../../constants/clause-templates';
import { printPurchaseOrderG } from '../../../../helpers/purchase-order-g.helper';
import { printPurchaseOrderB } from '../../../../helpers/purchase-order-b.helper';
import { MatRadioModule } from '@angular/material/radio';
import { ProjectSelectorComponent } from '../../../../components/project-selector/project-selector.component';
import { tanggalLokal } from '../../../../utils/tanggal';
import { firstValueFrom } from 'rxjs';
import { PurchaseOrderViewComponent } from '../../../../pages/purchase-order/purchase-order-view/purchase-order-view.component';
import { AdendumService } from '../../../../services/adendum.service';
import { SupplierTerkunciComponent } from '../../../../components/supplier-terkunci/supplier-terkunci.component';
import { BALIK_BARIS } from '../../../../constants/balik-baris-po';
import { ProjectLookupService } from '../../../../services/project-lookup.service';
import { PicAutocompleteComponent } from '../../../../components/pic-autocomplete/pic-autocomplete.component';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

@Component({
  selector: 'app-purchase-order-create-f',
  providers: [provideNgxMask()],
  imports: [
    ProjectSelectorComponent,
    ClauseLineComponent,
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
    HeaderTitleComponent,
    MatSlideToggleModule,
    MatCheckboxModule,
    NgxMaskDirective,
    SupplierTerkunciComponent,
    PicAutocompleteComponent,
    MatAutocompleteModule,
  ],
  templateUrl: './purchase-order-create-f.component.html',
  styleUrl: './purchase-order-create-f.component.scss',
})
export class PurchaseOrderCreateFComponent {
  // Dipakai mengisi alamat pengiriman Franco dari lokasi proyek.
  private readonly projectLookup = inject(ProjectLookupService);

  private readonly translate = inject(TranslateService);

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

  // ---- termin pembayaran ----
  //
  // Kolom kredit dan uang muka dikunci bila terminnya tidak memakainya:
  // angka yang tertinggal di sana ikut tersimpan dan tercetak, padahal
  // ketentuannya tidak menyebut tempo sama sekali.
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
  /** Kode jenis PO, dipakai pada pill di kepala halaman. */
  get typeCode(): string {
    return 'F';
  }

  /** Nama jenis PO, dipakai pada pill di kepala halaman. */
  get typeLabel(): string {
    return purchaseTypeLabel(this.translate, 'F');
  }

  private readonly typeSwitcher = inject(PurchaseOrderTypeSwitcher);

  /** Buka pemilih jenis PO; isian yang sudah ada dikonfirmasi lebih dulu. */
  onChangeType() {
    this.typeSwitcher.open(this.formGroup?.dirty === true);
  }
  /**
   * Pengambilan sendiri (Loco), bukan dikirim ke lokasi (Franco).
   *
   * Nilai `'1'` berarti Loco — sama dengan yang dibaca klausul lewat
   * `isLoco()` pada template, sehingga pilihan di layar tidak mungkin
   * berbeda dari kalimat yang tercetak.
   */
  /**
   * Kosongkan termin yang tidak lagi berlaku setelah moda kirim berubah.
   *
   * Memilih COD lalu mengubah moda menjadi Loco meninggalkan nilai yang
   * pilihannya sudah tidak ada di layar — tersembunyi, tetapi tetap
   * tersimpan dan tetap tercetak pada dokumennya.
   *
   * Dikosongkan, bukan diganti diam-diam: termin menentukan kapan tagihan
   * jatuh tempo, dan menggantinya tanpa sepengetahuan yang mengisi lebih
   * buruk daripada memintanya memilih ulang.
   */
  selaraskanTerminLoco(): void {

    /*
     * Loco: barang diambil DI TEMPAT PEMASOK.
     *
     * Alamat pengambilan dan penanggung jawabnya karena itu adalah alamat
     * dan kontak pemasok itu sendiri — mengetiknya ulang berarti menyalin
     * dari layar sebelah, dan yang disalin tangan cepat atau lambat berbeda
     * dari sumbernya.
     *
     * Isian yang SUDAH diisi sendiri tidak ditimpa: sebagian pemasok punya
     * gudang yang berbeda dari alamat suratnya, dan itu justru keterangan
     * yang tidak boleh hilang.
     */
    /*
     * Kontak pemasok diisi pada KEDUA metode.
     *
     * Siapa yang dihubungi di pihak pemasok tidak bergantung pada siapa yang
     * mengantar — pada Franco pun yang ditanya soal barangnya tetap orang
     * yang sama. Sebelumnya hanya terisi pada Loco, sehingga setiap PO Franco
     * menuntut mengetik ulang nama dan nomor yang sudah tersimpan di data
     * pemasok.
     */
    {
      const v = this.formGroup.getRawValue();
      const kontak: any = {};

      if (!String(v.supplierPICName || '').trim() && v.supplierName) {
        kontak.supplierPICName = v.supplierName;
      }
      if (!String(v.supplierPICPhoneNumber || '').trim() && v.supplierPhone) {
        kontak.supplierPICPhoneNumber = v.supplierPhone;
      }
      if (Object.keys(kontak).length) this.formGroup.patchValue(kontak);
    }

    /*
     * FRANCO: alamat pengiriman diisi dari LOKASI PROYEK.
     *
     * Barang dikirim ke proyeknya, dan alamatnya sudah tersimpan pada data
     * proyek — mengetiknya ulang pada setiap PO berarti menyalin dari catatan
     * lain yang cepat atau lambat berbeda dari sumbernya.
     *
     * Tidak menimpa yang sudah diisi: sebagian pengiriman menuju titik
     * tertentu di dalam proyek — gudang, area tertentu — dan itu justru
     * keterangan yang tidak boleh hilang.
     */
    if (!this.isLoco) {
      const v = this.formGroup.getRawValue();
      if (!String(v.deliveryAddress || '').trim()) {
        const proyek = this.projectLookup.cari(String(v.projectName || ''));
        const alamat = [proyek?.name, proyek?.address]
          .map((x: any) => String(x || '').trim())
          .filter((x: string) => !!x)
          .join('\n');
        if (alamat) this.formGroup.patchValue({ deliveryAddress: alamat });
      }
    }

    if (this.isLoco) {
      const v = this.formGroup.getRawValue();
      const isi: any = {};

      if (!String(v.deliveryAddress || '').trim()) {
        isi.deliveryAddress = [
          v.supplierName,
          v.supplierAddress,
          v.supplierCity,
        ]
          .map((x: any) => String(x || '').trim())
          .filter((x: string) => !!x)
          .join('\n');
      }

      if (!String(v.supplierPICName || '').trim() && v.supplierName) {
        isi.supplierPICName = v.supplierName;
      }

      if (!String(v.supplierPICPhoneNumber || '').trim() && v.supplierPhone) {
        isi.supplierPICPhoneNumber = v.supplierPhone;
      }

      if (Object.keys(isi).length) this.formGroup.patchValue(isi);
    }
    if (!this.isLoco) return;
    const c = this.formGroup.get('paymentTerm');
    if (c && ['COD', 'CBD'].includes(String(c.value))) {
      c.setValue('');
    }
  }

  get isLoco(): boolean {
    return String(this.formGroup.get('deliveryMethod')?.value) === '1';
  }

  constructor(
    private dialog: MatDialog,
    private formBuilder: FormBuilder,
    private apiService: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    public adendum: AdendumService,
    private translateSvc: TranslateService,
  ) {
    /*
     * Kewajiban `deliveryMethod` mengikuti jenis materialnya.
     *
     * Pada jasa pengujian, bagian pengiriman diganti bagian benda uji dan
     * kolom moda pengiriman TIDAK ditampilkan — sementara validatornya tetap
     * berlaku. Akibatnya formulir selamanya tidak sah: tombol Buat mati,
     * tanpa satu pun kolom merah yang bisa dilihat penggunanya.
     *
     * Kolomnya tidak sekadar dilepas dari `required`, karena pada pengadaan
     * beton dan besi moda pengiriman memang wajib. Yang berubah adalah
     * kewajibannya, bukan kolomnya.
     */
    this.formGroup
      .get('materialType')
      ?.valueChanges.subscribe(() => this.selaraskanValidasi());
    this.selaraskanValidasi();

    // Bila layar ini dibuka sebagai adendum, isinya diambil dari induknya.
    this.muatAdendum();

  }

  /**
   * Turunkan ringkasan benda uji dari barisnya.
   *
   * `sampleCount` dan `testUnitPrice` dibaca klausul serta dokumen lama,
   * sehingga tetap diisi — tetapi tidak lagi diketik pengguna. Jumlahnya
   * total seluruh baris; harganya rata-rata tertimbang, yang hanya dipakai
   * pada kalimat ringkas dan bukan pada rincian harga.
   */
  private selaraskanRingkasanUji(): void {
    const jumlah = this.totalBendaUji;
    const nilai = this.totalNilaiUji;
    this.formGroup.patchValue(
      {
        sampleCount: jumlah,
        testUnitPrice: jumlah ? Math.round(nilai / jumlah) : 0,
      },
      { emitEvent: false },
    );
  }

  /** Sesuaikan validator yang bergantung pada jenis material. */
  private selaraskanValidasi(): void {
    const moda = this.formGroup.get('deliveryMethod');
    if (!moda) return;

    if (this.isTestService) {
      // Jasa uji wajib punya minimal satu baris benda uji; tanpa itu
      // dokumennya terbit tanpa rincian harga sama sekali.
      if (!this.uji.length) this.tambahBarisUji();
      moda.clearValidators();
      // Dikosongkan agar tidak terbawa ke dokumen sebagai moda yang tidak
      // pernah dipilih penggunanya.
      moda.setValue('', { emitEvent: false });
    } else {
      moda.setValidators(Validators.required);
    }
    moda.updateValueAndValidity({ emitEvent: false });
  }

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
    purchaseType: new FormControl('F'),
    supplierID: new FormControl('', Validators.required),
    supplierName: new FormControl('', Validators.required),
    supplierPrefix: new FormControl(''),

    supplierNpwp: new FormControl(''),
    supplierCity: new FormControl(''),
    supplierAddress: new FormControl('', Validators.required),

    /*
     * Nomor telepon pemasok, hanya untuk mengisikan kontak Loco.
     *
     * Tidak dikirim ke server dan tidak tercetak: yang tercetak
     * adalah `supplierPICPhoneNumber`, yang boleh disunting bila
     * penanggung jawabnya ternyata orang lain.
     */
    supplierPhone: new FormControl(''),
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
    // auto-surfaced clause when a steel ("besi") item is in the order
    // Beton dan material lain memakai rangkaian klausul yang berbeda
    materialType: new FormControl('beton', Validators.required),
    /*
     * Jenis uji tanah, diketik dengan bantuan usulan.
     *
     * Tidak wajib pada jenis material lain; validatornya disesuaikan
     * lewat `selaraskanValidasi()` seperti `deliveryMethod`.
     */
    soilTestName: new FormControl(''),
    /*
     * Cara benda uji berpindah — DIAMBIL laboratorium, atau DIKIRIM ke sana.
     *
     * Menggantikan Franco/Loco pada jasa pengujian. Keduanya istilah
     * pengiriman BARANG yang dibeli; pada pengujian, benda ujinya tetap
     * milik PIHAK PERTAMA dan yang berpindah hanya penguasaannya sementara.
     */
    sampleMode: new FormControl<'diambil' | 'dikirim'>('dikirim'),
    // opsional: hanya dicetak bila diisi
    deliveryDate: new FormControl(''),
    /*
     * Jasa pengujian: satu baris per spesifikasi benda uji.
     *
     * Satu jumlah dan satu harga tidak cukup. Pengujian besi dikirim per
     * diameter — D10, D25, D32 — dan tarifnya berbeda tiap diameter.
     * Dipaksakan ke satu baris, nilainya hanya bisa benar bila seluruh
     * benda uji kebetulan berdiameter sama.
     *
     * `sampleCount` dan `testUnitPrice` dipertahankan sebagai hasil
     * penjumlahan baris, karena klausul dan dokumen lama membacanya.
     */
    testItems: new FormArray([]),
    sampleCount: new FormControl(0, [Validators.min(0)]),
    testUnitPrice: new FormControl(0, [Validators.min(0)]),
    testReportDays: new FormControl(0, [Validators.min(0)]),
    additionalClauses: new FormArray([]),
    steelTestRequired: new FormControl(true),
    // Ketentuan uji kuat tekan beton. Bila dimatikan, poinnya tetap tercetak
    // dalam keadaan tercoret agar terlihat sengaja tidak dipakai.
    concreteTestRequired: new FormControl(true),
    concreteTestCostBearer: new FormControl('pembeli'),
    includePPN: new FormControl(true),
  });

  get f() {
    return this.formGroup.controls;
  }

  /**
   * Pilihan jenis material.
   *
   * `dok` menyebutkan dokumen yang akan terbit. Dua pilihan pengujian
   * menghasilkan Surat Perintah Kerja, bukan Purchase Order — perbedaan yang
   * baru terlihat setelah dokumennya tercetak bila tidak disebut di sini.
   */
  readonly pilihanMaterial = [
    { value: 'beton', label: 'poForm.materialConcrete', dok: 'poF.docPO' },
    { value: 'besi', label: 'poForm.materialSteel', dok: 'poF.docPO' },
    { value: 'lain', label: 'poForm.materialOther', dok: 'poF.docPO' },
    { value: 'ujitekan', label: 'poForm.materialTest', dok: 'poF.docSPK' },
    { value: 'ujibesi', label: 'poForm.materialTestSteel', dok: 'poF.docSPK' },
    /*
     * Uji tanah — SATU pilihan, bukan satu per jenis ujinya.
     *
     * Uji tanah keluarga besar: analisa saringan, batas Atterberg, kadar
     * air, berat jenis, kepadatan, geser langsung, konsolidasi, CBR, dan
     * yang lapangan seperti sondir dan SPT. Menambahkannya satu per satu
     * menghasilkan daftar pilihan yang tidak pernah selesai — dan yang
     * belum ada tetap tidak dapat dipesan.
     *
     * Jenis ujinya diketik pada baris pekerjaan, dengan usulan yang dapat
     * dipilih. Satu SPK karena itu dapat memuat beberapa uji sekaligus,
     * dan itu memang yang terjadi di laboratorium.
     */
    { value: 'ujitanah', label: 'poForm.materialTestSoil', dok: 'poF.docSPK' },
  ];

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
    return this.translate.instant(
      this.isUbah ? 'poForm.judulUbah' : 'poForm.titleF',
    );
  }

  /** Dokumen induk yang diadendum; null bila dokumen baru. */
  induk: any = null;

  /**
   * Isi formulir dari dokumen induk saat layar dibuka sebagai adendum.
   *
   * Volume dikosongkan: adendum berisi SELISIH, bukan pengganti. Menyalin
   * volume induk membuat yang mengisi tinggal menekan simpan dan
   * menggandakan seluruh pekerjaannya tanpa menyadarinya.
   */
  private muatAdendum(): void {
    this.adendum.muatInduk().subscribe({
      next: (induk: any) => {
        if (!induk) return;
        this.induk = induk;
        this.adendum.isiFormulir(this.formGroup, induk);
        /*
         * Pemasok, proyek, dan jenis material dikunci.
         *
         * Ketiganya mengikat adendum pada perjanjian induknya; servernya
         * menolak juga bila berbeda, dan mengunci di sini hanya agar orang
         * tidak mencoba lalu ditolak setelah mengisi seluruh formulirnya.
         */
        this.adendum.kunciIsian(this.formGroup);
        this.t.clear();
        this.adendum
          .barisInduk(induk)
          .forEach((x) =>
            this.t.push(
              (() => {
              const g = this.buildItemGroup(x);
              g.patchValue(BALIK_BARIS['f'](x, this.isUbah));
              return g;
            })(),
            ),
          );
        /*
         * Poin perjanjian tambahan ikut diwarisi.
         *
         * `isiFormulir` melewati setiap FormArray, sehingga poin khusus yang
         * sudah disepakati pada dokumen induk tidak pernah terbawa — dan
         * yang membaca adendumnya menganggap poin itu memang tidak ada.
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
      error: () => {
        this.snackBar.open(
          this.translateSvc.instant('poForm.adendumGagalMuat'),
          'Close',
          { duration: 5000 },
        );
      },
    });
  }

  get t() {
    return this.formGroup.get('purchase_order') as FormArray;
  }

  /* ---- baris benda uji ---- */

  get uji(): FormArray {
    return this.formGroup.get('testItems') as FormArray;
  }

  ujiGroup(i: number): FormGroup {
    return this.uji.at(i) as FormGroup;
  }

  private barisUji(): FormGroup {
    return this.formBuilder.group({
      // Spesifikasi bebas teks: diameter besi (D25), mutu beton (K-300),
      // atau apa pun yang membedakan tarifnya.
      spec: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      price: [0, [Validators.required, Validators.min(0)]],
    });
  }

  tambahBarisUji(): void {
    this.uji.push(this.barisUji());
    this.selaraskanRingkasanUji();
  }

  hapusBarisUji(i: number): void {
    this.uji.removeAt(i);
    this.selaraskanRingkasanUji();
  }

  /** Dipanggil dari template setiap kali jumlah atau harga baris berubah. */
  onBarisUjiBerubah(): void {
    this.selaraskanRingkasanUji();
  }

  subtotalBarisUji(i: number): number {
    const g = this.ujiGroup(i)?.getRawValue?.() ?? {};
    return (Number(g.quantity) || 0) * (Number(g.price) || 0);
  }

  /** Jumlah seluruh benda uji, dipakai klausul dan rincian dokumen. */
  get totalBendaUji(): number {
    return (this.uji.getRawValue() || []).reduce(
      (a: number, x: any) => a + (Number(x.quantity) || 0),
      0,
    );
  }

  get totalNilaiUji(): number {
    return (this.uji.getRawValue() || []).reduce(
      (a: number, x: any) =>
        a + (Number(x.quantity) || 0) * (Number(x.price) || 0),
      0,
    );
  }

  /**
   * Satuan yang dipilih berbeda dari satuan master barangnya.
   *
   * Bukan larangan — sebagian pembelian memang memakai satuan berbeda.
   * Hanya peringatan, karena yang keliru di sini tidak terlihat sampai
   * barangnya datang.
   */
  satuanBerbeda(i: number): boolean {
    const g = this.getFormGroupAt(i);
    const master = String(g?.get('unitMaster')?.value || '').trim();
    const dipakai = String(g?.get('unit')?.value || '').trim();
    if (!master || !dipakai) return false;
    return master.toLowerCase() !== dipakai.toLowerCase();
  }

  /** Satuan menurut master barang; dipakai pada teks peringatan. */
  satuanMaster(i: number): string {
    return String(
      this.getFormGroupAt(i)?.get('unitMaster')?.value || '',
    ).trim();
  }

  getFormGroupAt(i: number) {
    return this.t.at(i) as FormGroup;
  }

  removeAt(i: number) {
    this.t.removeAt(i);
  }

  /** True when any line item looks like steel ("besi") — drives the mill-test clause. */
  get hasSteelItem(): boolean {
    return (this.t.value || []).some((x: any) =>
      `${x?.description ?? ''} ${x?.sku ?? ''}`.toLowerCase().includes('besi'),
    );
  }

  get steelTestClause(): string {
    return 'Supplier wajib menyediakan hasil uji material (mill certificate / uji tarik) untuk seluruh material besi yang dikirim.';
  }

  private buildItemGroup(item: any): FormGroup {
    return this.formBuilder.group({
      item_id: [item.id, Validators.required],
      sku: [item.sku],
      description: [item.description],
      unit: [item.unit || '', Validators.required],
      /*
       * Satuan menurut MASTER BARANG, disimpan terpisah.
       *
       * Isian satuannya sendiri boleh diubah — sebagian pembelian memang
       * memakai satuan berbeda dari yang tercatat. Tetapi satuan master
       * hilang begitu diubah, sehingga tidak ada lagi yang dapat
       * memperingatkan bahwa keduanya berbeda.
       *
       * "Bendrat kemasan 20 kg" berstuan `pcs`; mengisi 100 dengan satuan
       * `Kg` menghasilkan pesanan lima kali lipat dari yang dimaksud, dan
       * itu baru ketahuan saat barangnya datang.
       */
      unitMaster: [item.unit || ''],
      quantity: [1, [Validators.required, Validators.min(0.01)]],
      price: [0, [Validators.required, Validators.min(0)]],
      remarks: [''],
    });
  }

  openItemSelector() {
    this.dialog
      .open(MasterItemSelectorComponent, {
        data: { purchaseType: 'F' },
        width: '560px',
        maxWidth: '94vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((item) => {
        if (!item) return;
        // prevent adding the exact same catalog item twice
        const exists = this.t.value.some((x: any) => x.item_id === item.id);
        if (exists) {
          this.snackBar.open(
      this.translate.instant('notify.alreadyInList'), 'Close', {
            duration: 2500,
          });
          return;
        }
        this.t.push(this.buildItemGroup(item));
      });
  }

  // ----- live summary (read-only, safe getters) -----
  get rawTotal(): number {
    /*
     * Jasa uji mengisi larik yang BERBEDA.
     *
     * Pengadaan material memakai `purchase_order`; uji tekan dan uji tarik
     * memakai `testItems`, karena barisnya menyatakan spesifikasi benda uji,
     * bukan barang yang dibeli.
     *
     * Sebelumnya hanya larik pertama yang dijumlahkan, sehingga subtotal
     * jasa uji selalu nol — dan PPN yang dihitung darinya ikut nol berapa
     * pun sakelarnya. Sakelarnya tampak tidak berfungsi, padahal yang salah
     * angka dasarnya.
     */
    const baris = this.isTestService ? this.uji.value : this.t.value;
    return (baris || []).reduce(
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
            supplierPrefix: data.prefix,
            // Diambil hanya bila terisi; vendor perorangan kerap
            // belum ber-NPWP, dan baris kosong pada dokumen resmi
            // lebih mengganggu daripada tidak ada barisnya.
            supplierNpwp: data.npwp || '',
            supplierCity: [data.city, data.province]
              .filter((x: string) => !!x)
              .join(', '),
            supplierAddress: data.address,
            /*
             * Dua bentuk nama diterima.
             *
             * Kolomnya bernama `phoneNumber`, tetapi jawaban dari sebagian
             * jalur — dan dokumen lama — memakai `phone_number`. Membaca satu
             * bentuk saja membuat nomornya hilang tanpa galat: `undefined`
             * menjadi teks kosong, dan isian PIC tetap kosong walaupun
             * datanya jelas ada.
             */
            supplierPhone: data.phoneNumber || data.phone_number || '',
          });

          /*
           * Kontak PIC diisi SETELAH pemasoknya masuk.
           *
           * `selaraskanTerminLoco()` yang mengisinya, dan sebelumnya
           * ia hanya dipanggil ketika metode pengiriman diubah —
           * sehingga yang memilih pemasok lalu langsung mengisi baris
           * barang tidak pernah melihat nama dan nomornya terisi,
           * walaupun keduanya sudah tersimpan di data pemasok.
           */
          this.selaraskanTerminLoco();
        }
      });
  }

  templateVersion = latestClauseVersion('F');

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
      .map((c) => (c || '').trim())
      .filter((c) => c.length > 0);
  }

  /** Data sumber klausul — kalimatnya dirakit dari template. */
  private clauseContext() {
    const v = this.formGroup.getRawValue();
    return {
      soilTestName: this.formGroup.get('soilTestName')?.value || '',
      sampleMode: this.formGroup.get('sampleMode')?.value || undefined,
      materialType: v.materialType,
      /*
       * Tanggal dari datepicker berupa `Date`; klausul memerlukan TEKS.
       *
       * Disusun dari bagian waktu SETEMPAT — `toISOString()` mengubahnya ke
       * UTC lebih dulu, dan bagi WIB itu memundurkan tanggalnya sehari.
       */
      deliveryDate: this.tanggalTeks(v.deliveryDate),
      sampleCount: v.sampleCount,
      testReportDays: v.testReportDays,
      // Hanya relevan untuk besi; bila tidak dicentang, poin ujinya tetap
      // dicetak namun dicoret (bukan dihilangkan).
      materialTestRequired: !!v.steelTestRequired,
      concreteTestRequired: !!v.concreteTestRequired,
      concreteTestCostBearer: v.concreteTestCostBearer,
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

  /**
   * Ketentuan baku yang akan tercetak, ditampilkan sejak awal.
   *
   * Dirakit dari template yang sama dengan pencetakan, sehingga yang terbaca
   * di layar tidak mungkin berbeda dari yang keluar di dokumen.
   */
  get clausePreview(): (string | string[])[] {
    return buildClauseLines(
      'F',
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

  /**
   * Jasa uji tekan silinder bukan pembelian barang, sehingga dokumennya
   * dicetak sebagai Surat Perintah Kerja, bukan Purchase Order.
   */
  get isTestService(): boolean {
    const v = this.formGroup.get('materialType')?.value;
    return v === 'ujitekan' || v === 'ujibesi' || v === 'ujitanah';
  }

  /** Judul pekerjaan pada rincian SPK, mengikuti jenis pengujian. */
  get testItemName(): string {
    const v = this.formGroup.get('materialType')?.value;
    if (v === 'ujibesi') return 'Pengujian tarik dan tekuk besi tulangan';
    /*
     * Uji tanah tidak punya judul tetap.
     *
     * Jenis ujinya berbeda tiap pesanan dan kerap lebih dari satu, sehingga
     * yang tercetak adalah apa yang diketik — bukan judul yang dikarang di
     * sini. Judul umum hanya dipakai bila belum diisi sama sekali.
     */
    if (v === 'ujitanah') {
      const teks = String(
        this.formGroup.get('soilTestName')?.value || '',
      ).trim();
      return teks || 'Pengujian tanah';
    }
    return 'Pengujian kuat tekan silinder beton';
  }

  /**
   * Usulan jenis uji tanah.
   *
   * Daftar ini BANTUAN, bukan batasan: laboratorium menawarkan uji yang
   * tidak ada di sini, dan yang mengetik nama lain tetap dapat menyimpannya.
   * Menutupnya berarti pesanan yang sah tidak dapat dibuat sama sekali.
   */
  readonly usulanUjiTanah: string[] = [
    'Analisa saringan (sieve analysis)',
    'Analisa hidrometer',
    'Batas-batas Atterberg',
    'Kadar air',
    'Berat jenis tanah',
    'Berat isi tanah',
    'Uji kepadatan standar (Proctor)',
    'Uji kepadatan lapangan (sand cone)',
    'Uji CBR laboratorium',
    'Uji CBR lapangan',
    'Uji geser langsung (direct shear)',
    'Uji triaksial',
    'Uji konsolidasi',
    'Uji kuat tekan bebas (UCS)',
    'Uji permeabilitas',
    'Sondir (CPT)',
    'Standard Penetration Test (SPT)',
    'Bor mesin dan pengambilan sampel',
  ];

  /** Usulan yang cocok dengan yang sedang diketik. */
  get usulanTersaring(): string[] {
    const q = String(this.formGroup.get('soilTestName')?.value || '')
      .trim()
      .toLowerCase();
    if (!q) return this.usulanUjiTanah;
    return this.usulanUjiTanah.filter((x) => x.toLowerCase().includes(q));
  }

  /** Susun data cetak dari isian form. */
  /**
   * Tanggal terbaca untuk klausul: "5 Mei 2026".
   *
   * Disusun dari bagian waktu SETEMPAT. `toISOString()` mengubahnya ke UTC
   * lebih dulu, dan bagi WIB itu memundurkan tanggalnya sehari — dokumen
   * yang dibuat pukul 05.00 menyebut tanggal kemarin.
   */
  private tanggalTeks(v: any): string {
    if (!v) return '';
    const t = v instanceof Date ? v : new Date(v);
    if (isNaN(t.getTime())) return String(v);
    const B = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];
    return `${t.getDate()} ${B[t.getMonth()]} ${t.getFullYear()}`;
  }

  /** Tanggal untuk disimpan: YYYY-MM-DD, waktu setempat. */
  private tanggalIso(v: any): string | null {
    if (!v) return null;
    const t = v instanceof Date ? v : new Date(v);
    if (isNaN(t.getTime())) return null;
    const dd = (n: number) => String(n).padStart(2, '0');
    return `${t.getFullYear()}-${dd(t.getMonth() + 1)}-${dd(t.getDate())}`;
  }

  private buildPrintData(purchaseOrderName: string) {
    const v = this.formGroup.getRawValue();
    return {
      poType: 'F',
      purchaseOrderName,
      date: v.date,
      projectName: v.projectName,
      supplierName: v.supplierName,
      supplierPrefix: v.supplierPrefix,
      supplierAddress: v.supplierAddress,
      supplierNpwp: v.supplierNpwp,
      supplierCity: v.supplierCity,
      // Jasa uji tidak memakai katalog barang: satu baris dibentuk dari
      // jumlah benda uji dan harga per benda uji.
      items: this.isTestService
        ? /*
           * Satu baris per spesifikasi, bukan satu baris gabungan.
           *
           * Tarif pengujian berbeda tiap diameter besi atau mutu beton;
           * digabung menjadi satu baris, dokumennya menampilkan harga
           * rata-rata yang tidak pernah disepakati siapa pun.
           */
          (this.uji.getRawValue() || []).map((x: any) => ({
            name: `${this.testItemName} — ${x.spec}`,
            quantity: Number(x.quantity) || 0,
            unit: 'benda uji',
            price: Number(x.price) || 0,
          }))
        : this.t.controls.map((c) => {
            const x = c.getRawValue();
            return {
              name: x.description || x.sku || '',
              quantity: Number(x.quantity) || 0,
              unit: x.unit,
              price: Number(x.price) || 0,
              // Catatan per baris ikut dicetak di bawah nama barang.
              remarks: x.remarks,
            };
          }),
      includePpn: !!v.includePPN,
      templateVersion: this.templateVersion,
      clauseContext: this.clauseContext(),
      additionalClauses: this.additionalClauseValues,
    };
  }

  formatData() {
    /*
     * Nilai yang DISIMPAN memakai penjumlahan yang sama dengan yang
     * ditampilkan.
     *
     * Sebelumnya hanya larik barang yang dijumlahkan di sini, sehingga
     * dokumen jasa uji tersimpan ber-`dpp` NOL walaupun barisnya berisi —
     * dan itu merambat ke laporan margin proyek, yang membacanya sebagai
     * pekerjaan tanpa biaya.
     */
    const dpp = this.rawTotal;
    const ppn = this.formGroup.get('includePPN')?.value ? 11 : 0;
    const projectCode = this.formGroup.get('projectName')?.value;
    return {
      date: tanggalLokal(this.formGroup.get('date')?.value),
      supplierID: this.formGroup.get('supplierID')?.value,
      purchaseType: this.formGroup.get('purchaseType')?.value,
      projectName: projectCode,
      projectCode: projectCode,
      // Penanda induk; server yang menghitung nomor adendumnya.
      parentPurchaseOrderID: this.adendum.indukId ?? undefined,
      name: '',
      dpp: dpp,
      ppn: ppn,
      payment_term: this.formGroup.get('paymentTerm')?.value,
      templateVersion: this.templateVersion,
      billing_requirements: {},
      // Baris item PO. Tanpa ini `purchase_order_items` tidak pernah terisi,
      // sehingga dokumen yang dicetak ulang kehilangan seluruh daftar barang.
      // Jasa uji tidak memakai katalog barang: satu baris dibentuk dari
      // jumlah benda uji dan harga per benda uji.
      items: this.isTestService
        ? // Satu baris per spesifikasi; tarifnya berbeda tiap diameter besi
          // atau mutu beton, sehingga tidak boleh digabung.
          (this.uji.getRawValue() || []).map((x: any) => ({
            task: `${this.testItemName} — ${x.spec}`,
            quantity: Number(x.quantity) || 0,
            unit: 'benda uji',
            price: Number(x.price) || 0,
          }))
        : this.t.controls.map((c) => {
            const x = c.getRawValue();
            return {
              item_id: x.item_id,
              // Nama barang tidak disalin: sudah tersimpan di
              // master_item dan diambil lewat item_id saat dibaca.
              // Menyalinnya berarti dokumen menyimpan nama yang bisa
              // berbeda dari katalognya, dan nama panjang melampaui
              // batas kolomnya.
              task: null,
              quantity: x.unit === 'LS' ? 1 : x.quantity,
              price: x.price,
              unit: x.unit,
              remarks_1: x.remarks,
              remarks_2: x.sku,
            };
          }),
      customData: {
        materialType: this.formGroup.get('materialType')?.value,
        // Jenis uji tanah; kosong pada jenis material lain.
        soilTestName: this.formGroup.get('soilTestName')?.value || null,
        sampleMode: this.formGroup.get('sampleMode')?.value || null,
        deliveryDate: this.tanggalIso(this.formGroup.get('deliveryDate')?.value),
        sampleCount: Number(this.formGroup.get('sampleCount')?.value) || 0,
        testUnitPrice: Number(this.formGroup.get('testUnitPrice')?.value) || 0,
        testReportDays:
          Number(this.formGroup.get('testReportDays')?.value) || 0,
        // `paymentDueDate` DIBUANG: termin pembayaran sudah mengaturnya.
        materialTestRequired: !!this.formGroup.get('steelTestRequired')?.value,
        concreteTestRequired: !!this.formGroup.get('concreteTestRequired')
          ?.value,
        concreteTestCostBearer: this.formGroup.get('concreteTestCostBearer')
          ?.value,
        additionalClauses: this.additionalClauseValues,
        deliveryMethod: this.formGroup.get('deliveryMethod')?.value,
        deliveryAddress: this.formGroup.get('deliveryAddress')?.value,
        paymentTerm: this.formGroup.get('paymentTerm')?.value,
        creditTerm: this.formGroup.get('creditTerm')?.value,
        prepaidTerm: this.formGroup.get('prepaidTerm')?.value,
        supplierPICName: this.formGroup.get('supplierPICName')?.value,
        supplierPICPhoneNumber: this.formGroup.get('supplierPICPhoneNumber')
          ?.value,
        officePICName: this.formGroup.get('officePICName')?.value,
        officePICPhoneNumber: this.formGroup.get('officePICPhoneNumber')?.value,
        // rich-text agreement points / notes (HTML string)
        // steel (besi) mill-test clause — only meaningful when a steel item exists
        steelTestRequired: this.hasSteelItem
          ? !!this.formGroup.get('steelTestRequired')?.value
          : false,
        steelTestClause: this.hasSteelItem ? this.steelTestClause : null,
      },
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
          try {
            const printData = this.buildPrintData(
              res?.purchase_order_name ?? '',
            );
            if (this.isTestService) {
              printPurchaseOrderB(printData);
            } else {
              printPurchaseOrderG(printData);
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

}
