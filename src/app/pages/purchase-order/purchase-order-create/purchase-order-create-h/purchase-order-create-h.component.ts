import { Component, inject, OnInit } from '@angular/core';
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
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SupplierSelectorComponent } from '../../../../components/supplier-selector/supplier-selector.component';
import { HeaderTitleComponent } from '../../../../components/header-title/header-title.component';
import { ApiService } from '../../../../services/api.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
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
  dokumenPasal5,
  type LampiranPasal5,
  bangunPasal4,
  type PenanggungAsuransi,
} from '../../../../constants/clause-templates';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { printPurchaseOrderH } from '../../../../helpers/purchase-order-h.helper';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { PphSelectorComponent } from '../../../../components/pph-selector/pph-selector.component';
import { IPPh } from '../../../../utils/pph';
import { ProjectSelectorComponent } from '../../../../components/project-selector/project-selector.component';
import { tanggalLokal } from '../../../../utils/tanggal';
import { firstValueFrom } from 'rxjs';
import { PurchaseOrderViewComponent } from '../../../../pages/purchase-order/purchase-order-view/purchase-order-view.component';
import { AdendumService } from '../../../../services/adendum.service';

@Component({
  selector: 'app-purchase-order-create-h',
  standalone: true,
  providers: [provideNgxMask()],
  imports: [
    ProjectSelectorComponent,
    ClauseLineComponent,
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
export class PurchaseOrderCreateHComponent implements OnInit {
  private readonly translateSvc = inject(TranslateService);


  // ---- termin pembayaran ----
  //
  // Kolom kredit dan uang muka dikunci bila terminnya tidak memakainya:
  // angka yang tertinggal di sana ikut tersimpan dan tercetak, padahal
  // ketentuannya tidak menyebut tempo sama sekali.
  private readonly CREDIT_TERMS = ['PPD', 'CR', 'CRD'];
  private readonly PREPAID_TERMS = ['PPD', 'CRD'];

  ngOnInit(): void {
    // Bila dibuka sebagai adendum ATAU koreksi, isinya diambil dari dokumen
    // lamanya.
    //
    // Sebelumnya baris ini berada SETELAH `return` pada sebuah getter,
    // sehingga tidak pernah berjalan sama sekali — adendum terbuka dengan
    // formulir kosong tanpa satu pun galat.
    if (this.adendum.memuatDokumenLama) this.muatAdendum();
  }

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
    return 'H';
  }

  /** Nama jenis PO, dipakai pada pill di kepala halaman. */
  get typeLabel(): string {
    // Tipe H tidak punya satu nama: bentuknya ditentukan jenis
    // subkontraktornya, dan itulah yang berguna dilihat di kepala halaman.
    return purchaseTypeLabel(this.translateSvc, 'H');
  }

  private readonly typeSwitcher = inject(PurchaseOrderTypeSwitcher);

  /** Buka pemilih jenis PO; isian yang sudah ada dikonfirmasi lebih dulu. */
  onChangeType() {
    this.typeSwitcher.open(this.formGroup?.dirty === true);
  }
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
    // Subkontraktor perorangan tidak boleh tanpa kode objek pajak: kodenya
    // sudah baku, sehingga mengosongkannya hanya menghasilkan PO tanpa dasar
    // pemotongan. Dikembalikan ke kode baku, bukan dikosongkan.
    if (!this.isEntity) {
      this.applyPeroranganPph();
      this.onPphNoteChange();
      return;
    }

    this.formGroup.patchValue({
      pphCode: '',
      pphTaxObject: '',
      pphPercentage: 0,
    });
  }

  /**
   * Penjaga terakhir sebelum PO tersimpan.
   *
   * Menyembunyikan tombol saja tidak cukup: kode objek pajak bisa hilang
   * lewat jalur lain (mis. berpindah jenis subkontraktor). Tombol simpan
   * ikut dikunci agar PO perorangan tidak mungkin terbit tanpa PPh.
   */
  get pphMissingForPerorangan(): boolean {
    return !this.isEntity && !this.formGroup.get('pphCode')?.value;
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
  readonly MAX_CUTOFF = 5;

  get cutoffDays(): FormArray {
    return this.formGroup.get('cutoffDays') as FormArray;
  }

  /** Daftar tanggal yang sah, terurut dan tanpa kembar. */
  get cutoffValues(): number[] {
    const nilai = (this.cutoffDays.value as any[])
      .map((x) => Number(x))
      .filter((d) => Number.isFinite(d) && d >= 1 && d <= 31);
    return [...new Set(nilai)].sort((a, b) => a - b);
  }

  /**
   * Pratinjau kalimat penagihan.
   *
   * Angka telanjang di kotak isian sulit dibayangkan hasilnya; kalimatnya
   * membuat salah isi langsung terlihat sebelum dokumen dibuat.
   */
  get cutoffPreview(): string {
    const d = this.cutoffValues;
    if (!d.length) return 'Belum ada tanggal cutoff yang diisi.';
    const akhir = d[d.length - 1];
    const teks =
      d.length === 1
        ? `tanggal ${akhir}`
        : `tanggal ${d.slice(0, -1).join(', ')} dan ${akhir}`;
    return `Penagihan dilakukan setiap ${teks} pada setiap bulan.`;
  }

  addCutoff() {
    if (this.cutoffDays.length >= this.MAX_CUTOFF) return;
    this.cutoffDays.push(new FormControl(null));
  }

  removeCutoff(i: number) {
    // Satu tanggal harus tetap ada; tanpa cutoff, klausul penagihannya
    // kehilangan dasar dan barisnya hilang dari dokumen.
    if (this.cutoffDays.length <= 1) return;
    this.cutoffDays.removeAt(i);
  }

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
  /**
   * Jenis pekerjaan bawaan untuk tiap jenis mandor.
   *
   * Diisikan otomatis supaya penulisannya seragam antar dokumen — isian
   * bebas menghasilkan "pengeboran", "Pengeboran", "bor pile" untuk
   * pekerjaan yang sama, dan itu menyulitkan penelusuran nanti.
   */
  private readonly JOB_TYPE_DEFAULTS: Record<string, string> = {
    'mandor-bor': 'Pekerjaan Pengeboran',
    'mandor-cor': 'Pekerjaan Pengecoran',
    'mandor-besi': 'Pekerjaan Pembesian',
  };

  onWorkScopeChange() {
    if (this.isBuangLumpur) {
      this.w.clear();
    } else if (!this.isEntity && this.w.length === 0) {
      this.addWorker();
    }

    // Hanya diisikan bila masih kosong atau masih memakai salah satu isian
    // bawaan. Yang sudah disunting sendiri tidak ditimpa — pengguna bisa
    // saja menulis "Pekerjaan Pengeboran D-400".
    const baru = this.JOB_TYPE_DEFAULTS[this.formGroup.get('workScope')?.value];
    if (!baru) return;

    const jobType = this.formGroup.get('jobType');
    const kini = String(jobType?.value || '').trim();
    if (kini === '' || Object.values(this.JOB_TYPE_DEFAULTS).includes(kini)) {
      jobType?.setValue(baru);
    }
  }

  get isBorongan(): boolean {
    return this.formGroup.get('workScope')?.value === 'borongan';
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
    private adendum: AdendumService,
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
    // Bentuk lama 'sejak-mulai' dibuang: yang dipakai di lapangan adalah
    // tanggal cutoff, bukan hitungan sejak pekerjaan dimulai.
    billingCycleMode: new FormControl('cutoff-tanggal'),
    // Tanggal cutoff dalam sebulan, mis. [15, 30]. Maksimal 5.
    cutoffDays: new FormArray([new FormControl(30)]),
    billingTermDays: new FormControl(14, [Validators.min(0)]),
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
    /*
     * Bukti penerimaan pekerjaan pada Pasal 5.
     *
     * Tidak semua proyek memakai Certificate of Payment: sebagian memakai
     * Berita Acara Serah Terima, sebagian lagi tidak mensyaratkan keduanya.
     * Memaksakan CoP membuat vendor menagihkan dokumen yang tidak pernah
     * dibuat siapa pun, dan penagihannya tertahan menunggu berkas itu.
     */
    /*
     * Lampiran penagihan sebagai sakelar, bukan daftar teks bebas.
     *
     * Invoice, kwitansi, dan SPK selalu diminta sehingga tidak punya sakelar.
     * Faktur pajak tidak selalu ada. Bukti penerimaan berbeda tiap proyek:
     * CoP, Berita Acara, keduanya, atau tidak sama sekali — karena itu
     * masing-masing berdiri sendiri, bukan satu pilihan tiga cabang.
     */
    lampiranFakturPajak: new FormControl(true),
    lampiranCop: new FormControl(true),
    lampiranBeritaAcara: new FormControl(false),

    // Pasal 3 & 4 — isi bawaan yang tetap bisa diubah per poin
    kewajiban: new FormArray(H_PASAL_3_DEFAULT.map((t) => new FormControl(t))),
    /*
     * Poin tambahan Pasal 3, terpisah dari yang baku.
     *
     * Yang baku tidak disunting — isinya sama di semua pekerjaan borongan.
     * Kesepakatan khusus ditambahkan di sini dan tercetak MELANJUTKAN
     * penomoran yang baku, bukan menggantikannya.
     */
    kewajibanTambahan: new FormArray([]),
    /*
     * Pasal 4: dua poin terakhir mengikuti kesepakatan, bukan angka bawaan.
     *
     * Asuransi kadang ditanggung PIHAK KEDUA, kadang tidak berlaku sama
     * sekali. Biaya standby berbeda tiap proyek. Menuliskannya tetap membuat
     * dokumen menyebut nominal yang tidak pernah disepakati siapa pun.
     */
    penanggungAsuransi: new FormControl<PenanggungAsuransi>('pertama'),
    standbyBerlaku: new FormControl(true),
    standbyBiaya: new FormControl(5000000, [Validators.min(0)]),
    standbyHari: new FormControl(3, [Validators.min(0)]),
    keterangan: new FormArray([]),
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

  /**
   * Kode objek pajak untuk subkontraktor perorangan.
   *
   * Ditetapkan berdasarkan arahan konsultan pajak AKN: mandor perorangan
   * diperlakukan sebagai bukan pegawai, bukan sebagai penyedia jasa
   * konstruksi yang dikenakan PPh Final Pasal 4 ayat (2).
   *
   * Karena itu kodenya tunggal dan tidak dapat dipilih di sini — mengubahnya
   * berarti mengubah dasar perpajakan seluruh PO perorangan, jadi harus
   * lewat konsultan pajak, bukan lewat pengguna form.
   */
  private readonly PPH_PERORANGAN = {
    code: '21-100-09',
    taxObject:
      'Tidak final - Bukan Pegawai yang Menerima Penghasilan yang Tidak Bersifat Berkesinambungan',
    tariff: 2.5,
  };

  /**
   * Kode PPh untuk mandor dengan Sertifikat Badan Usaha kualifikasi kecil.
   *
   * Dipakai bila keterangan PPh yang dipilih menyebut tarif 1,75%.
   */
  private readonly PPH_SBU_KECIL = {
    code: '28-409-22',
    taxObject:
      'Pekerjaan konstruksi yang dilakukan oleh Penyedia Jasa yang memiliki sertifikat badan usaha kualifikasi kecil atau sertifikat kompetensi kerja untuk usaha orang perseorangan.',
    tariff: 1.75,
  };

  /**
   * Samakan kode objek pajak dengan keterangan PPh yang dipilih.
   *
   * Keterangan PPh dicetak pada dokumen, sedangkan kode objek pajak yang
   * tersimpan dipakai untuk pelaporan. Bila keduanya tidak disamakan,
   * dokumen bisa menyebut 1,75% sementara yang terlapor 2,5% — bertentangan
   * di dalam satu dokumen yang sama.
   *
   * Keterangan yang diketik sendiri di luar dua pilihan baku tidak mengubah
   * kode apa pun; kodenya tetap seperti terakhir dipilih.
   */
  onPphNoteChange() {
    const note = String(this.formGroup.get('pphNote')?.value || '');
    if (note.includes('1,75')) {
      this.formGroup.patchValue({
        pphCode: this.PPH_SBU_KECIL.code,
        pphTaxObject: this.PPH_SBU_KECIL.taxObject,
        pphPercentage: this.PPH_SBU_KECIL.tariff,
      });
    } else if (note.includes('2,5')) {
      this.applyPeroranganPph();
    }
  }

  /** Terapkan kode PPh baku untuk subkontraktor perorangan. */
  applyPeroranganPph() {
    this.formGroup.patchValue({
      pphCode: this.PPH_PERORANGAN.code,
      pphTaxObject: this.PPH_PERORANGAN.taxObject,
      pphPercentage: this.PPH_PERORANGAN.tariff,
    });
  }

  /** first screen: pick the subcontractor kind */
  chooseSubType(value: 'H1' | 'H2') {
    this.subType = value;
    this.formGroup.patchValue({ purchaseType: value });

    if (value === 'H2') {
      // Perorangan bukan Pengusaha Kena Pajak, sehingga tidak dapat
      // menerbitkan Faktur Pajak. Pilihan PPN dimatikan, bukan sekadar
      // disembunyikan, agar tidak ada PO perorangan yang terlanjur
      // tersimpan dengan PPN.
      this.formGroup.patchValue({ includePPN: false });
      this.formGroup.get('includePPN')?.disable();
      this.applyPeroranganPph();
      // Keterangan PPh mungkin sudah terpilih lebih dulu; samakan kodenya.
      this.onPphNoteChange();
    } else {
      this.formGroup.get('includePPN')?.enable();
    }
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
  /** Keadaan sakelar lampiran, dibaca klausul dan pratinjau. */
  get lampiranPasal5(): LampiranPasal5 {
    const v = this.formGroup.getRawValue();
    return {
      fakturPajak: !!v.lampiranFakturPajak,
      cop: !!v.lampiranCop,
      beritaAcara: !!v.lampiranBeritaAcara,
    };
  }

  /** Baris lampiran yang akan tercetak; disusun ulang tiap sakelar berubah. */
  get dokumenLampiran(): string[] {
    return dokumenPasal5(this.lampiranPasal5);
  }

  /** Poin Pasal 4 yang tercetak: baku menurut pilihan, lalu tambahan. */
  get pasal4Preview(): string[] {
    const v = this.formGroup.getRawValue();
    return [
      ...bangunPasal4({
        penanggungAsuransi: v.penanggungAsuransi,
        standbyBerlaku: v.standbyBerlaku,
        standbyBiaya: v.standbyBiaya,
        standbyHari: v.standbyHari,
      }),
      ...this.keteranganValues,
    ];
  }

  get standbyBerlaku(): boolean {
    return !!this.formGroup.get('standbyBerlaku')?.value;
  }

  get kewajibanTambahan(): FormArray {
    return this.formGroup.get('kewajibanTambahan') as FormArray;
  }

  addKewajibanTambahan(): void {
    this.kewajibanTambahan.push(new FormControl(''));
  }

  removeKewajibanTambahan(i: number): void {
    this.kewajibanTambahan.removeAt(i);
  }

  private get kewajibanTambahanValues(): string[] {
    return ((this.kewajibanTambahan.value as string[]) || [])
      .map((x) => (x || '').trim())
      .filter((x) => x.length > 0);
  }

  /** Baris lampiran yang dipakai klausul; disusun dari sakelar. */
  private get billingDocumentValues(): string[] {
    return this.dokumenLampiran;
  }

  /** Pratinjau Pasal 5 supaya isian yang belum terisi langsung terlihat. */
  get pasal5Preview(): (string | string[])[] {
    const v = this.formGroup.getRawValue();
    return buildPasal5(
      {
        billingPeriod: v.billingPeriod,
        billingCycleMode: v.billingCycleMode,
        weekStartDay: v.weekStartDay,
        weekEndDay: v.weekEndDay,
        cutoffDays: this.cutoffValues,
        billingTermDays: v.billingTermDays,
        paymentDays: v.paymentDays,
        finalPaymentDays: v.finalPaymentDays,
        hasDownPayment: v.hasDownPayment,
        downPaymentPercent: v.downPaymentPercent,
        downPaymentDays: v.downPaymentDays,
        hasRetention: v.hasRetention,
        retentionPercent: v.retentionPercent,
        retentionReleaseDays: v.retentionReleaseDays,
        lampiran: this.lampiranPasal5,
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
      cutoffDays: this.cutoffValues,
      billingTermDays: v.billingTermDays,
      weekEndDay: v.weekEndDay,
    };

    const extra = this.additionalClauseValues;
    /**
     * Poin tambahan menjadi seksi tersendiri, bukan menempel di ekor seksi
     * terakhir.
     *
     * Menempelkannya membuat poin bebas terbaca sebagai bagian dari pasal
     * yang sudah baku — pembaca tidak bisa membedakan mana ketentuan tetap
     * dan mana tambahan khusus PO ini. Sama seperti PO-A, PO-D, dan 6.4.1
     * yang sudah memakai seksi terpisah.
     */
    const withExtra = (
      sections: { title?: string; items: (string | string[])[] }[],
    ) => {
      if (!extra.length) return sections;
      return [
        ...sections,
        { title: 'Catatan Tambahan', items: extra as (string | string[])[] },
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

  /**
   * Pasal 3 ditampilkan, bukan disunting.
   *
   * Isinya ketentuan baku yang sama di semua pekerjaan borongan. FormArray-nya
   * dipertahankan supaya nilainya tetap ikut tersimpan dan dokumen lama yang
   * pernah disunting tetap terbaca apa adanya — yang dihilangkan hanya
   * kemampuan menyuntingnya dari layar.
   */
  get kewajibanPreview(): string[] {
    return [...this.kewajibanValues, ...this.kewajibanTambahanValues];
  }

  get kewajibanValues(): string[] {
    return ((this.kewajiban.value as string[]) || [])
      .map((x) => (x || '').trim())
      .filter((x) => x.length > 0);
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

  /**
   * Jenis harga sebagai kartu berketerangan.
   *
   * Label memakai kunci i18n; yang disimpan tetap `value` — klausul dan
   * perhitungan membaca `'lumpsum'`, bukan labelnya, sehingga menerjemahkan
   * label tidak mengubah isi dokumen.
   */
  readonly pilihanRate = [
    { value: 'unit', label: 'poH.unitRate', ket: 'poH.unitRateKet' },
    { value: 'lumpsum', label: 'poH.lumpSum', ket: 'poH.lumpSumKet' },
  ];

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

    // Baris baru memakai satuan borongan, sehingga volumenya langsung
    // dikunci — tanpa ini kolomnya terbuka sampai satuannya disentuh.
    this.onUnitChange(this.t.length - 1);
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



  private toISO(d: any): string | null {
    return d ? tanggalLokal(d) : null;
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
      // Penanda induk bila dokumen ini ADENDUM; server yang
      // menghitung nomor adendumnya.
      parentPurchaseOrderID: this.adendum.indukId ?? undefined,
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
        // Sakelar lampiran; menentukan kalimat kewajiban dan baris dokumen
        // pada Pasal 5 saat dokumennya dibaca kembali.
        lampiran: this.lampiranPasal5,
        // Siklus penagihan beserta rinciannya; menjadi dasar klausul
        // penagihan saat dokumen dicetak ulang. Tanpa billingCycleMode,
        // cetak ulang jatuh ke keterangan bebas dan kalimatnya berubah.
        billingCycleMode: this.formGroup.get('billingCycleMode')?.value,
        weekStartDay: this.formGroup.get('weekStartDay')?.value,
        weekEndDay: this.formGroup.get('weekEndDay')?.value,
        cutoffDays: this.cutoffValues,
        billingTermDays:
          Number(this.formGroup.get('billingTermDays')?.value) || 0,
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
        /*
         * Penanda formulir asal.
         *
         * `purchaseType` bernilai 'H1' atau 'H2' — membedakan badan usaha
         * dari perorangan — sedangkan templat klausulnya terdaftar sebagai
         * 'H'. Tanpa penanda ini, pencarian templat tidak menemukan apa pun
         * dan pratinjau tampil TANPA satu klausul pun, sementara dokumen
         * yang dicetak tetap lengkap karena tidak lewat jalur ini.
         *
         * Polanya sama dengan PO-B: penanda ini yang menentukan bentuk
         * klausulnya, bukan kode jenisnya.
         */
        formOrigin: 'H',
        billingDocuments: this.billingDocumentValues,
        kewajiban: this.kewajibanPreview,
        keterangan: this.pasal4Preview,
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
      kewajiban: this.kewajibanPreview,
      keterangan: this.pasal4Preview,
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
                    cutoffDays: this.cutoffValues,
                    billingTermDays: v.billingTermDays,
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
          // Buka PDF-nya; gagal cetak tidak membatalkan SPK yang tersimpan.
          try {
            printPurchaseOrderH(
              this.buildPrintData(res?.purchase_order_name ?? ''),
            );
          } catch (e) {
            console.error('Gagal membuat PDF surat perintah kerja:', e);
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
        error: (error) =>
          this.snackBar.open(
            error?.error?.detail ?? 'Gagal membuat purchase order',
            'Close',
            { duration: 3000 },
          ),
      })
      .add(() => (this.isSubmitting = false));
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
    return this.translateSvc.instant(
      this.isUbah ? 'poForm.judulUbah' : 'poForm.titleH',
    );
  }

  /** Dokumen induk yang diadendum; null bila dokumen baru. */
  induk: any = null;

  /**
   * Isi formulir dari dokumen induk saat layar dibuka sebagai adendum.
   *
   * Varian ini TIDAK menyimpan isinya sebagai baris barang: uraiannya berada
   * di dalam `customData`, sehingga lariknya dibaca dari sana.
   */
  private muatAdendum(): void {
    this.adendum.muatInduk().subscribe({
      next: (induk: any) => {
        if (!induk) return;
        this.induk = induk;
        this.adendum.isiFormulir(this.formGroup, induk);
        this.adendum.kunciIsian(this.formGroup);
        /*
         * Lingkup kerja dimuat dari `items`, bukan `customData`.
         *
         * Saat menyimpan, `scopes` disusun menjadi `items` — `customData`
         * hanya memuat pengaturan seperti lokasi, jenis pekerjaan, dan
         * periode penagihan. Mencarinya di sana membuat daftarnya selalu
         * kosong, dan karena `task` wajib diisi, formulirnya tidak pernah
         * sah dan tombol simpannya mati terus.
         */
        this.adendum.isiLarik(
          this.formGroup,
          'scopes',
          this.adendum.barisInduk(induk),
          (x) =>
            this.adendum.terapkanNilaiBaris(this.buildScope(), x),
        );
        this.adendum.isiLarik(
          this.formGroup,
          'workers',
          this.adendum.larikCustom(induk, 'workers'),
          (x) => {
            const g = this.buildWorker();
            g.patchValue(x);
            return g;
          },
        );
      },
      error: () => {},
    });
  }

}
