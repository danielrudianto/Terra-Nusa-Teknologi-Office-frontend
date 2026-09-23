import { ServerMessageService } from 'src/app/services/server-message.service';
import {
  kalimatJadwalUpah,
  kalimatJadwalUpahPertama,
  tanggalPanjang as tanggalPanjangBersama,
} from '../../../../helpers/klausul-tenaga-kerja.helper';
import { Component, inject } from '@angular/core';
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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { pphDiputuskan, tarifPphNol } from 'src/app/utils/pph-wajib';
import { PphSelectorComponent } from '../../../../components/pph-selector/pph-selector.component';
import { HeaderTitleComponent } from '../../../../components/header-title/header-title.component';
import { ApiService } from '../../../../services/api.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  buildManpowerClauses,
  latestClauseVersion,
  buildStaffClauses,
} from '../../../../constants/clause-templates';
import { MatTooltipModule } from '@angular/material/tooltip';
import { printPurchaseOrderD } from '../../../../helpers/purchase-order-d.helper';
import { ProjectSelectorComponent } from '../../../../components/project-selector/project-selector.component';
import { tanggalLokal } from '../../../../utils/tanggal';
import { firstValueFrom } from 'rxjs';
import { PurchaseOrderViewComponent } from '../../../../pages/purchase-order/purchase-order-view/purchase-order-view.component';
import { AdendumService } from '../../../../services/adendum.service';
import { SupplierTerkunciComponent } from '../../../../components/supplier-terkunci/supplier-terkunci.component';

/**
 * Penanda baris lembur pada `remarks_2`.
 *
 * TIDAK diterjemahkan dan tidak pernah tampil di layar maupun dokumen.
 */
const PENANDA_LEMBUR = 'LEMBUR';

@Component({
  selector: 'app-purchase-order-create-d',
  standalone: true,
  providers: [provideNgxMask()],
  imports: [
    MatCheckboxModule,
    ProjectSelectorComponent,
    ClauseLineComponent,
    MatTooltipModule,
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
    SupplierTerkunciComponent,
  ],
  templateUrl: './purchase-order-create-d.component.html',
  styleUrl: './purchase-order-create-d.component.scss',
})
export class PurchaseOrderCreateDComponent {
  private readonly serverMessage = inject(ServerMessageService);

  private readonly translateSvc = inject(TranslateService);


  /**
   * Satuan berubah pada satu komponen upah.
   *
   * Untuk satuan borongan (LS) volumenya dikunci pada 1: nilainya memang
   * selalu dihitung satu, sehingga membiarkan kolomnya dapat diisi berarti
   * menawarkan angka yang diabaikan diam-diam.
   *
   * INI DULU TIDAK PERNAH BEKERJA, dan tidak pernah ketahuan.
   *
   * Ia membaca `quantity` dan `unit` pada grup PEKERJA — yang isinya cuma
   * `task` dan `wages`. Keduanya `null`, jadi seluruh isi fungsi ini
   * menghasilkan `null?.setValue(...)`: tidak melempar, tidak mengunci apa
   * pun, tidak meninggalkan jejak. Satu-satunya yang benar-benar berjalan
   * `selaraskanKlausulShift()` di ujungnya — dan karena yang satu itu
   * bekerja, tidak ada yang curiga sisanya tidak.
   *
   * Selama kolom volume belum ada, tidak menguncinya memang tidak berakibat
   * apa-apa. Sejak kolomnya ada, ia berakibat.
   */
  onUnitChange(i: number, j: number): void {
    const g = this.wageGroupAt(i, j);
    const qty = g.get('quantity');
    if (String(g.get('unit')?.value || '').toUpperCase() === 'LS') {
      qty?.setValue(1);
      qty?.disable();
    } else {
      qty?.enable();
    }

    // Upah per shift memerlukan ketentuan berapa jam satu shift; klausulnya
    // dinyalakan sendiri agar tidak tertinggal.
    this.selaraskanKlausulShift();
  }

  /** Kode jenis PO, dipakai pada pill di kepala halaman. */
  get typeCode(): string {
    return 'D';
  }

  /** Nama jenis PO, dipakai pada pill di kepala halaman. */
  get typeLabel(): string {
    return purchaseTypeLabel(this.translateSvc, 'D');
  }

  private readonly typeSwitcher = inject(PurchaseOrderTypeSwitcher);

  /** Buka pemilih jenis PO; isian yang sudah ada dikonfirmasi lebih dulu. */
  onChangeType() {
    this.typeSwitcher.open(this.formGroup?.dirty === true);
  }
  constructor(
    public adendum: AdendumService,
    private dialog: MatDialog,
    private formBuilder: FormBuilder,
    private apiService: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {}

  /**
   * Pilih kode objek PPh atas upah pekerja.
   *
   * Kodenya dipilih dari daftar, tidak diketik: tarifnya mengikuti kode objek
   * pajak, sehingga angka pada dokumen selalu sejalan dengan kodenya.
   *
   * `purchaseType: 'D'` membuat dua kode yang biasa dipakai muncul lebih
   * dulu — dan keduanya sama dengan yang ditawarkan layar faktur atas SPK
   * ini, supaya bukti potong cocok dengan dokumennya.
   */
  openPphSelector(): void {
    this.dialog
      .open(PphSelectorComponent, {
        data: { purchaseType: 'D' },
      })
      .afterClosed()
      .subscribe((data: any) => {
        /*
         * "Tanpa PPh" MENGHAPUS pilihan, berbeda dari membatalkan.
         *
         * Keduanya menutup dialog tanpa nilai; tanpa penanda `hapus`,
         * keduanya diperlakukan sebagai batal dan PPh yang terlanjur dipilih
         * tidak pernah bisa dikosongkan lagi.
         */
        if (data?.hapus) {
          // Mengosongkan kode mengembalikan SPK ke keadaan "belum
          // diputuskan" — pernyataan tanpa-PPh harus dicentang sendiri,
          // bukan diwariskan dari pilihan sebelumnya.
          this.formGroup.patchValue({
            pphCode: '',
            pphTaxObject: '',
            pphPercentage: 0,
            tanpaPph: false,
          });
          return;
        }
        if (!data) return;
        this.formGroup.patchValue({
          pphCode: data.code,
          pphTaxObject: data.taxObjectName,
          pphPercentage: data.tariff,
          // Memilih kode berarti bukan "tanpa PPh".
          tanpaPph: false,
        });
      });
  }

  ngOnInit(): void {
    this.ensureWorker();

    // Bila dibuka sebagai adendum, isinya diambil dari induknya.
    this.muatAdendum();
  }

  isSubmitting = false;

  formGroup: FormGroup = new FormGroup({
    date: new FormControl('', Validators.required),
    /*
     * Jangka waktu perjanjian. Inti dari perjanjian waktu tertentu justru
     * ada di batas waktunya; tanpa itu jangka waktunya menjadi tidak jelas.
     *
     * Dua bentuk yang dipakai di lapangan:
     *   tanggal  — mulai & berakhir pada tanggal tertentu
     *   proyek   — sampai pekerjaan pada proyek tersebut selesai
     */
    // Lokasi kerja; bila kosong, dokumen memakai nama proyeknya.
    workLocation: new FormControl(''),
    contractStart: new FormControl(''),
    contractEnd: new FormControl(''),
    contractUntilProjectDone: new FormControl(false),
    // Pekerja didatangkan dari luar kota — bawaannya mati agar SPK pekerja
    // setempat tidak ikut memuat poin transportasi dan hak pulang.
    includeTransportHome: new FormControl(false),
    includeHomeLeave: new FormControl(false),
    includeEquipmentEscort: new FormControl(false),
    purchaseType: new FormControl('D'),

    /*
     * PPh atas upah pekerja.
     *
     * Yang dibayar orang perseorangan, bukan badan — sehingga pemotongannya
     * PPh 21, bukan PPh 23 seperti pada sewa alat atau subkontraktor.
     *
     * Tidak wajib diisi. Sebagian pekerja berpenghasilan di bawah batas dan
     * tidak dipotong sama sekali; mewajibkannya membuat SPK yang benar tidak
     * dapat diterbitkan. Dua kode yang biasa dipakai diusulkan lebih dulu
     * oleh pemilihnya — lihat `USULAN_PPH['D']`, dan keduanya sama dengan
     * yang ditawarkan layar faktur atas SPK ini.
     */
    pphCode: new FormControl(''),
    pphTaxObject: new FormControl(''),
    pphPercentage: new FormControl(0),
    /*
     * Pernyataan "memang tidak dipotong".
     *
     * TIDAK dikirim ke server dan bukan kolom: yang tersimpan tetap kode
     * kosong dan tarif nol. Gunanya hanya memaksa PPh DIPUTUSKAN, bukan
     * dilewati — lihat `utils/pph-wajib.ts`.
     */
    tanpaPph: new FormControl(false),

    supplierID: new FormControl('', Validators.required),
    supplierName: new FormControl('', Validators.required),
    supplierPrefix: new FormControl(''),
    supplierCity: new FormControl(''),
    supplierNpwp: new FormControl(''),
    supplierAddress: new FormControl('', Validators.required),
    projectName: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[A-Z0-9]{4,5}$/),
    ]),
    overtimeRate: new FormControl(0, [Validators.min(0)]),
    /*
     * VOLUME lembur yang disepakati. Nol = tanpa plafon.
     *
     * Lembur dulu HANYA klausul: `overtimeRate` dan `overtimeUnit` disimpan
     * di `customData`, dan `customData` tidak pernah menjadi baris
     * `purchase_order_items`. Akibatnya lembur tidak pernah muncul di daftar
     * pagu Certificate of Payment sama sekali — padahal di lembar yang
     * dipakai lapangan ia baris tersendiri (mis. "Lembur 200 jam.orang ×
     * Rp50.000").
     *
     * Yang terjadi selama ini: lembur ditagih lewat pembuat faktur, di luar
     * CoP. Satu SPK ditagih lewat dua jalur — persis yang sedang ditutup.
     */
    overtimeVolume: new FormControl(0, [Validators.min(0)]),
    /*
     * Satuan upah lembur.
     *
     * Bawaannya `jam` — itu yang berlaku sebelum satuannya dapat dipilih,
     * sehingga dokumen lama terbaca persis seperti sebelumnya.
     *
     * Pada staf lapangan satuannya tidak dipakai: bekerja melewati pukul
     * 20:00 diganti uang makan satu hari, bukan dihitung per jam.
     */
    overtimeUnit: new FormControl<'jam' | 'hari'>('jam'),

    /*
     * Jam kerja staf lapangan.
     *
     * Bawaannya mengikuti yang selama ini dipakai, sehingga SPK yang tidak
     * mengubahnya berbunyi persis seperti sebelumnya. Dijadikan isian karena
     * proyek yang berbeda punya jam yang berbeda — dan dokumen yang menyebut
     * jam yang tidak disepakati lebih buruk daripada yang tidak menyebutnya.
     */
    overtimeAfter: new FormControl('20:00'),
    workStart: new FormControl('08:00'),
    workEnd: new FormControl('17:00'),
    workStartSat: new FormControl('08:00'),
    workEndSat: new FormControl('15:00'),
    leaveNoticeDays: new FormControl(7, [Validators.min(0)]),
    resignNoticeDays: new FormControl(30, [Validators.min(0)]),
    // Dua poin pertama SPK tidak selalu berlaku; lihat clause-templates.
    includeShiftClause: new FormControl(true),
    includePlacementClause: new FormControl(true),
    /*
     * Klausul tempat tinggal sementara.
     *
     * Bawaannya menyala: sebagian besar pekerja PO-D memang didatangkan ke
     * lokasi proyek. Yang berdomisili di sekitar lokasi dimatikan sendiri.
     */
    includeHousingClause: new FormControl(true),
    // Staf lapangan: penagihan bulanan + uraian tugas
    isFieldStaff: new FormControl(false),
    jobDescriptions: new FormArray([]),
    // Shift maksimal 24 jam — lebih dari itu tidak masuk akal untuk 1 hari.
    shiftHours: new FormControl(8, [
      Validators.required,
      Validators.min(1),
      Validators.max(24),
    ]),
    includeSundayPolicy: new FormControl(false),
    additionalClauses: new FormArray([]),
    notes: new FormControl(''),
    // Satu SPK = satu pekerja, jadi array ini selalu berisi tepat 1 entri.
    workers: new FormArray([]),
  }, { validators: pphDiputuskan() });

  /** Tarif terpilih nol — ditegaskan, karena nol tidak terlihat sebagai nol. */
  get pphNol(): boolean {
    return tarifPphNol(this.formGroup);
  }

  get pphBelumDiputuskan(): boolean {
    return !!this.formGroup.errors?.['pphBelumDiputuskan'];
  }

  get f() {
    return this.formGroup.controls;
  }
  get t() {
    return this.formGroup.get('workers') as FormArray;
  }
  getFormGroupAt(i: number) {
    return this.t.at(i) as FormGroup;
  }
  removeAt(i: number) {
    this.t.removeAt(i);
  }

  /**
   * Ada komponen upah yang dihitung per SHIFT.
   *
   * Disimpulkan dari satuan yang benar-benar dipakai, bukan pilihan terpisah
   * — sama seperti PO-B, agar klausul yang tercetak tidak mungkin berbeda
   * dari dasar perhitungan yang dibayarkan.
   */
  get adaShift(): boolean {
    return this.t.controls.some(
      (c) => String(c.getRawValue().unit || '').toLowerCase() === 'shift',
    );
  }

  /**
   * Nyalakan klausul shift begitu ada komponen upah bersatuan shift.
   *
   * Sakelarnya tetap dapat dimatikan sendiri bila memang tidak diperlukan;
   * yang dihindari hanyalah dokumen terbit dengan upah per shift tetapi
   * tanpa satu pun ketentuan yang menyatakan berapa jam satu shift.
   */
  selaraskanKlausulShift(): void {
    if (!this.adaShift) return;
    const c = this.formGroup.get('includeShiftClause');
    if (c && !c.value) c.setValue(true);
  }

  /** Satu komponen upah: nominal + satuan + jadwal pembayarannya sendiri. */
  private buildWage(): FormGroup {
    return this.formBuilder.group({
      label: ['Upah harian', Validators.required],
      /*
       * VOLUME KONTRAK baris ini.
       *
       * Sebelumnya tidak ada sama sekali, dan setiap baris dikirim dengan
       * `quantity: 1` yang ditulis mati di kode — angka penambal supaya
       * bentuk muatan lama (`task/quantity/price/unit`) tetap terpakai.
       *
       * Angka penambal itu tidak terlihat sebagai penambal di tempat lain.
       * Sejak SPK tenaga kerja dilayani Certificate of Payment, ia dibaca
       * sebagai PLAFON: layar pencatatan volume menampilkan "Volume SPK 1 m'"
       * dan menolak volume berapa pun yang benar-benar terlaksana. Yang
       * mengisinya tidak punya jalan maju, dan tidak ada galat yang
       * menjelaskan kenapa.
       *
       * Nol berarti TIDAK DIPLAFON — dipakai untuk kontrak harga satuan yang
       * volumenya memang belum disepakati di muka.
       */
      quantity: [0, [Validators.min(0)]],
      amount: [0, [Validators.required, Validators.min(0)]],
      unit: ['hari', Validators.required],
      // weekly      = tiap pekan pada hari X
      // sameMonth   = tiap bulan pada tanggal X di bulan yang sama
      // nextMonth   = tiap bulan pada tanggal X di bulan berikutnya
      // semiMonthly = dua kali sebulan; cut-off tanggal X dan akhir bulan,
      //               dibayar pada hari tertentu di pekan berikutnya
      scheduleType: ['weekly', Validators.required],
      payDay: ['Sabtu'], // weekly & semiMonthly
      payDate: [10], // sameMonth / nextMonth
      cutoffDay: ['Rabu'], // weekly — periode mulai otomatis hari berikutnya
      cutoffDate: [15], // sameMonth — periode mulai otomatis tanggal berikutnya
      // semiMonthly: cut-off pertama; yang kedua selalu akhir bulan, karena
      // itulah yang membedakannya dari jadwal bulanan biasa.
      cutoffFirst: [15],
    });
  }

  wagesAt(i: number): FormArray {
    return this.getFormGroupAt(i).get('wages') as FormArray;
  }

  wageGroupAt(i: number, j: number): FormGroup {
    return this.wagesAt(i).at(j) as FormGroup;
  }

  addWage(i: number) {
    this.wagesAt(i).push(this.buildWage());
  }

  removeWage(i: number, j: number) {
    if (this.wagesAt(i).length > 1) this.wagesAt(i).removeAt(j);
  }

  /*
   * Satuan upah per baris komponen.
   *
   * `shift` berdiri sendiri, bukan disamakan dengan `hari`: satu hari kerja
   * dapat berisi lebih dari satu shift, dan panjang shiftnya disepakati per
   * dokumen — bukan angka baku.
   */
  readonly wageUnits = [
    'hari',
    'shift',
    'bulan',
    'jam',
    "m'",
    'titik',
    'lot',
  ];
  /** Tanggal 1–28 saja: 29–31 tidak ada di semua bulan. */
  readonly payDates = Array.from({ length: 28 }, (_, i) => i + 1);

  /**
   * Pilihan cut-off: tanggal 1–28, ditambah "akhir bulan".
   *
   * "Akhir bulan" bukan tanggal 28. Bulan yang panjangnya berbeda-beda
   * membuat tanggal tetap selalu meleset — memilih 28 pada bulan Maret
   * menyisakan tiga hari kerja yang jatuh ke periode berikutnya, dan itu
   * persis yang dipersoalkan pekerja saat upahnya kurang.
   */
  readonly AKHIR_BULAN = 'end';
  readonly cutoffDates: (number | string)[] = [
    ...Array.from({ length: 28 }, (_, i) => i + 1),
    'end',
  ];

  /**
   * value = yang disimpan & masuk kalimat klausul (SPK berbahasa Indonesia),
   * key   = label yang ditampilkan, ikut bahasa aplikasi.
   */
  readonly weekDays: { value: string; key: string }[] = [
    { value: 'Senin', key: 'common.monday' },
    { value: 'Selasa', key: 'common.tuesday' },
    { value: 'Rabu', key: 'common.wednesday' },
    { value: 'Kamis', key: 'common.thursday' },
    { value: 'Jumat', key: 'common.friday' },
    { value: 'Sabtu', key: 'common.saturday' },
    { value: 'Minggu', key: 'common.sunday' },
  ];

  /** Hari sesudah hari yang dipilih (periode mulai = sehari setelah cut-off). */
  private dayAfter(day: string): string {
    const i = this.weekDays.findIndex((d) => d.value === day);
    return i < 0 ? day : this.weekDays[(i + 1) % this.weekDays.length].value;
  }

  /**
   * Dua kalimat per komponen upah.
   *
   * Susunannya ada di `klausul-tenaga-kerja.helper.ts` dan dipakai bersama
   * halaman lihat serta cetak ulang — disalin, ketiganya akan berbeda kalimat
   * untuk dokumen yang sama, dan itulah yang sudah terjadi sebelumnya.
   */
  wageSentences(w: any, index: number): string[] {
    return kalimatJadwalUpah(w, index);
  }

  /** Jadwal upah dari pekerja pertama — dipakai untuk preview poin perjanjian. */
  private get wageSchedules(): string[] {
    return kalimatJadwalUpahPertama(this.t.getRawValue() as any[]);
  }

  /**
   * Susun kembali daftar pekerjaan dan upahnya dari dokumen lama.
   *
   * Saat disimpan, satu pekerjaan yang punya beberapa komponen upah
   * DIRATAKAN menjadi beberapa baris `items` — masing-masing membawa `task`
   * yang sama. Memuatnya kembali karena itu perlu MENGELOMPOKKAN ulang
   * berdasarkan `task`, bukan membuat satu baris per item.
   *
   * Sebelumnya baris ini dicari di `customData` lewat `larikCustom`, padahal
   * yang tersimpan di sana hanya pengaturannya — upah lembur, jam shift, dan
   * klausul. Akibatnya daftar upah selalu kosong, dan karena `task` wajib
   * diisi, formulirnya tidak pernah sah dan tombol simpannya mati terus.
   */
  private muatPekerjaan(induk: any): void {
    const semua: any[] = Array.isArray(induk?.items) ? induk.items : [];
    if (!semua.length) return;

    /*
     * Baris LEMBUR dipisahkan lebih dulu.
     *
     * Ia memakai `task` yang sama dengan baris upah, jadi tanpa pemisahan ini
     * ia ikut menjadi satu komponen upah tambahan setiap kali dokumennya
     * dibuka untuk disunting — dan menyimpannya kembali akan menggandakannya
     * lagi. Tidak ada galat; jumlah barisnya saja yang bertambah satu tiap
     * kali, dan nilai SPK ikut naik bersamanya.
     */
    const items = semua.filter(
      (x) => String(x?.remarks_2 ?? '') !== PENANDA_LEMBUR,
    );
    const lembur = semua.find(
      (x) => String(x?.remarks_2 ?? '') === PENANDA_LEMBUR,
    );
    if (lembur) {
      this.formGroup.patchValue({
        overtimeVolume: Number(lembur.quantity) || 0,
      });
    }
    if (!items.length) return;

    /*
     * Jadwal upah dibaca dari `customData.wageSchedules`.
     *
     * Baris item TIDAK pernah memuatnya: jadwalnya dikirim sebagai `schedule`
     * per baris, dan `purchase_order_items` tidak punya kolom itu, sehingga
     * backend membuangnya tanpa galat. Yang dibaca di bawah — `x.payDay`,
     * `x.cutoffDay` — karena itu selalu kosong, dan setiap dokumen yang
     * dibuka kembali kehilangan jadwalnya lalu kembali ke bawaan.
     *
     * Dokumen yang dibuat SEBELUM perbaikan ini memang tidak punya
     * `wageSchedules`; jadwalnya sudah hilang dan tidak dapat dipulihkan dari
     * mana pun. Yang seperti itu tetap jatuh ke bawaan.
     */
    const jadwal: any[] = Array.isArray(induk?.customData?.wageSchedules)
      ? induk.customData.wageSchedules
      : [];
    const jadwalPerTugas = new Map<string, any[]>();
    for (const j of jadwal) {
      jadwalPerTugas.set(String(j?.task ?? ''), (j?.wages as any[]) || []);
    }

    // Urutan pekerjaan dipertahankan seperti pada dokumennya; `Map` menjaga
    // urutan penyisipan, sehingga cetakannya tidak berubah susunan.
    const perTugas = new Map<string, any[]>();
    for (const x of items) {
      const tugas = String(x?.task ?? '');
      if (!perTugas.has(tugas)) perTugas.set(tugas, []);
      perTugas.get(tugas)!.push(x);
    }

    const larik = this.formGroup.get('workers') as FormArray;
    larik.clear();

    for (const [tugas, baris] of perTugas) {
      const g = this.buildWorker();
      g.patchValue({ task: tugas });

      const upah = g.get('wages') as FormArray;
      upah.clear();
      const jadwalTugas = jadwalPerTugas.get(tugas) || [];
      baris.forEach((x, i) => {
        // Nilainya dari baris item, jadwalnya dari `customData` pada urutan
        // yang sama — keduanya ditulis dari daftar yang sama saat disimpan.
        const j = jadwalTugas[i] || {};
        const w = this.buildWage();

        /*
         * Yang TIDAK tersimpan dibiarkan memakai bawaan isiannya, bukan
         * ditimpa `null`.
         *
         * Isian yang bernilai `null` tampil kosong sekaligus tidak sah,
         * sementara kalimat klausulnya tetap memakai bawaannya sendiri —
         * sehingga yang terlihat di layar dan yang tercetak berbeda pada
         * dokumen yang sama. Untuk dokumen lama yang jadwalnya memang hilang,
         * keduanya sama-sama menunjukkan bawaan, dan itu yang harus dibetulkan
         * orangnya.
         */
        const jadwalAda = (k: string) => j[k] !== undefined && j[k] !== null;
        w.patchValue({
          label: j.label || x?.remarks_3 || 'Upah harian',
          /*
           * Dokumen LAMA bervolume 1 dibaca sebagai NOL — tanpa plafon.
           *
           * Satu adalah angka penambal yang ditulis mati, bukan kesepakatan.
           * Membacanya apa adanya membuat dokumen lama yang dibuka untuk
           * disunting tampak berplafon 1, dan menyimpannya kembali akan
           * MENGUNCI angka penambal itu menjadi plafon sungguhan.
           */
          quantity: Number(x?.quantity) === 1 ? 0 : Number(x?.quantity) || 0,
          amount: Number(x?.price) || 0,
          unit: x?.unit || 'hari',
          ...(jadwalAda('scheduleType') ? { scheduleType: j.scheduleType } : {}),
          ...(jadwalAda('payDay') ? { payDay: j.payDay } : {}),
          ...(jadwalAda('payDate') ? { payDate: j.payDate } : {}),
          ...(jadwalAda('cutoffDay') ? { cutoffDay: j.cutoffDay } : {}),
          ...(jadwalAda('cutoffDate') ? { cutoffDate: j.cutoffDate } : {}),
          ...(jadwalAda('cutoffFirst') ? { cutoffFirst: j.cutoffFirst } : {}),
        });
        upah.push(w);
      });
      if (!upah.length) upah.push(this.buildWage());

      larik.push(g);
    }
  }

  /**
   * Baris item untuk LEMBUR — kosong bila tarifnya tidak diisi.
   *
   * Ditaruh PALING DEPAN, bukan di belakang: pada lembar berita acara ia
   * dibaca berpasangan dengan upah pokoknya, dan baris yang terselip di
   * ujung daftar mudah terlewat saat volumenya dicatat.
   *
   * `remarks_3` diisi "Lembur" karena itulah yang membedakannya dari baris
   * upah lain — seluruhnya memakai `task` yang sama, yaitu nama pekerjaannya.
   */
  /**
   * Tarif lembur yang sedang terisi — dipakai templat untuk memutuskan
   * apakah isian volume lembur ditampilkan.
   *
   * SATU sumber dengan `barisLembur()`, sengaja. Bila templat memakai
   * ambangnya sendiri, isian volume dapat tampil dan terisi pada tarif yang
   * `barisLembur()` anggap kosong — volumenya diketik, dokumennya tersimpan,
   * dan baris lemburnya tidak pernah ada. Itu kehilangan yang tidak
   * menghasilkan galat apa pun.
   */
  tarifLembur(): number {
    return Number(this.formGroup.get('overtimeRate')?.value) || 0;
  }

  private barisLembur(): any[] {
    const tarif = this.tarifLembur();
    if (tarif <= 0) return [];

    const pekerja = this.worker?.getRawValue?.() ?? {};
    return [
      {
        task: pekerja.task || '',
        quantity: Number(this.formGroup.get('overtimeVolume')?.value) || 0,
        price: tarif,
        unit: this.formGroup.get('overtimeUnit')?.value || 'jam',
        remarks_1: this.formGroup.get('supplierName')?.value,
        /*
         * PENANDA MESIN, bukan tulisan untuk dibaca orang.
         *
         * Dipakai saat dokumen dibuka kembali, untuk memisahkan baris ini
         * dari baris upah biasa — keduanya memakai `task` yang sama.
         *
         * `remarks_3` TIDAK dipakai sebagai penanda meski ia yang berisi
         * "Lembur": isinya label yang dibaca orang, dan kelak ia dapat
         * diterjemahkan atau diketik sendiri. Penanda yang ikut berubah
         * bahasa berhenti menjadi penanda, dan yang terjadi bukan galat —
         * baris lemburnya sekadar muncul sebagai komponen upah tambahan
         * setiap kali dokumennya disunting.
         *
         * `itemKind` juga tidak dipakai: daftarnya tertutup
         * (`mobilisasi`/`demobilisasi`) dan nilai di luar itu DIBUANG server.
         * Ia pun menentukan penggabungan baris anak ke induknya, dan lembur
         * bukan anak baris mana pun.
         */
        remarks_2: PENANDA_LEMBUR,
        remarks_3: this.translateSvc.instant('poD.lemburBaris'),
        /*
         * TANPA `schedule`.
         *
         * Lembur dibayar mengikuti jadwal upah pokoknya, bukan jadwalnya
         * sendiri. Mengarang jadwal di sini akan memunculkan satu kalimat
         * klausul tambahan yang tidak pernah disepakati siapa pun.
         */
        schedule: null,
      },
    ];
  }

  private buildWorker(): FormGroup {
    return this.formBuilder.group({
      task: ['', [Validators.required, Validators.maxLength(100)]], // nama pekerjaan
      // Upah bisa terdiri dari beberapa komponen dengan satuan & jadwal bayar
      // berbeda (mis. gaji pokok bulanan + uang makan harian + insentif per m').
      wages: this.formBuilder.array([this.buildWage()]),
    });
  }

  /** Satu SPK = satu pekerja: pastikan selalu ada tepat satu baris. */
  private ensureWorker() {
    if (this.t.length === 0) this.t.push(this.buildWorker());
    while (this.t.length > 1) this.t.removeAt(this.t.length - 1);
  }

  get worker(): FormGroup {
    return this.getFormGroupAt(0);
  }

  /**
   * Nilai satu komponen upah: VOLUME x TARIF.
   *
   * Volume nol berarti tidak diplafon, dan nilainya jatuh ke tarifnya saja —
   * sama seperti sebelum kolom volume ada. Tanpa cadangan itu, seluruh SPK
   * harga satuan bernilai nol, dan yang menandatanganinya melihat "Rp 0"
   * pada dokumen yang mengikat.
   */
  nilaiUpah(w: any): number {
    const vol = Number(w?.quantity) || 0;
    const tarif = Number(w?.amount) || 0;
    return vol > 0 ? vol * tarif : tarif;
  }

  /** Total nominal seluruh komponen upah milik satu pekerja. */
  lineTotal(i: number): number {
    const wages = (this.wagesAt(i)?.getRawValue() as any[]) || [];
    return wages.reduce((acc, w) => acc + this.nilaiUpah(w), 0);
  }

  get rawTotal(): number {
    return this.t.controls.reduce((acc, _c, i) => acc + this.lineTotal(i), 0);
  }

  get grandTotal(): number {
    return this.rawTotal;
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
    // PO-D adalah SPK untuk pekerja perorangan — bukan PKP, jadi tidak
    // pernah ada PPN. DPP = total upah apa adanya.
    const dpp = this.rawTotal;
    const ppn = 0;
    const projectCode = this.formGroup.get('projectName')?.value;
    return {
      date: this.toISO(this.formGroup.get('date')?.value),
      supplierID: this.formGroup.get('supplierID')?.value,
      purchaseType: 'D',
      projectName: projectCode,
      projectCode: projectCode,
      // Penanda induk bila dokumen ini ADENDUM; server yang
      // menghitung nomor adendumnya.
      parentPurchaseOrderID: this.adendum.indukId ?? undefined,
      forceNumber: this.adendum.nomorPaksa ?? undefined,
      name: '',
      dpp: dpp,
      ppn: ppn,
      // SPK pekerja tidak memakai termin vendor; jadwalnya ada di
      // tiap komponen upah.
      payment_term: '',
      // Dikirim `null` bila kosong, bukan '' — kolomnya nullable, dan teks
      // kosong terbaca sebagai kode yang pernah dipilih lalu dihapus.
      pphCode: this.formGroup.get('pphCode')?.value || null,
      pphTaxObject: this.formGroup.get('pphTaxObject')?.value || null,
      pphPercentage: Number(this.formGroup.get('pphPercentage')?.value) || 0,
      templateVersion: this.templateVersion,
      billing_requirements: {},
      // manpower lines -> purchase_order_items
      // Satu baris item per komponen upah, supaya bentuk payload lama
      // (task/quantity/price/unit) tetap terpakai apa adanya.
      /*
       * Baris upah, DITAMBAH satu baris lembur bila tarifnya diisi.
       *
       * Lembur dijadikan `purchase_order_item` supaya ia punya pagu dan dapat
       * dicatat volumenya di berita acara — sebelumnya ia hanya klausul di
       * `customData`, yang tidak pernah menjadi baris apa pun, sehingga
       * satu-satunya jalan menagihnya lewat pembuat faktur di luar CoP.
       */
      items: this.barisLembur().concat(this.t.controls.flatMap((c) => {
        const x = c.getRawValue();
        const wages = (x.wages as any[]) || [];
        return wages.map((w) => ({
          task: x.task, // nama pekerjaan (tukang cor, mandor cor, dll)
          /*
           * Volume yang DIISI. Nol berarti tidak diplafon, dan dikirim apa
           * adanya — bukan diubah menjadi 1.
           *
           * Satu pernah dipakai sebagai penambal di sini, dan penambal itu
           * terbaca sebagai plafon oleh Certificate of Payment. Nol tidak
           * dapat disalahartikan begitu: ia tidak mungkin menjadi plafon yang
           * masuk akal, sehingga yang membacanya harus memutuskan artinya —
           * dan `melayaniPagu()` di server memutuskannya satu kali, di satu
           * tempat.
           */
          quantity: Number(w.quantity) || 0,
          price: Number(w.amount) || 0,
          unit: w.unit,
          // Pekerja = supplier yang dipilih, jadi identitasnya tidak
          // diketik ulang di sini; backend punya datanya lewat supplierID.
          remarks_1: this.formGroup.get('supplierName')?.value,
          remarks_2: '',
          remarks_3: w.label, // komponen upah (gaji pokok, uang makan, dll)
          // Jadwal disimpan sebagai DATA, bukan kalimat jadi. Kalimat
          // klausul dirakit ulang saat render/edit dari template + data ini,
          // sehingga mengedit PO tidak perlu mengubah teks yang tersimpan.
          schedule: {
            type: w.scheduleType, // weekly | sameMonth | nextMonth
            payDay: w.scheduleType === 'weekly' ? w.payDay : null,
            payDate:
              w.scheduleType === 'weekly' ? null : Number(w.payDate) || null,
            cutoffDay: w.scheduleType === 'weekly' ? w.cutoffDay : null,
            cutoffDate:
              w.scheduleType === 'sameMonth'
                ? Number(w.cutoffDate) || null
                : null,
          },
        }));
      })),
      customData: {
        /*
         * PENANDA: volume pada baris SPK ini DISEPAKATI, bukan penambal.
         *
         * Formulir SPK D dulu tidak punya kotak volume sama sekali dan
         * mengirim `quantity: 1` pada setiap baris upah. Certificate of
         * Payment membaca angka itu sebagai PLAFON, sehingga seluruh SPK D
         * yang sudah terbit menolak berita acara bervolume sebenarnya —
         * "Volume SPK 1 hari" pada pekerja yang sehari menyelesaikan 60
         * meter.
         *
         * Penandanya ada pada DOKUMEN, bukan pada angkanya. Menebak "1
         * berarti penambal" akan salah pada SPK baru: begitu kotaknya ada,
         * seseorang boleh mengetik 1 dan memaksudkannya sungguh-sungguh, dan
         * yang diketik akan berbeda dari yang ditegakkan — tanpa galat.
         *
         * Dokumen lama tidak memilikinya, jadi CoP memperlakukan seluruh
         * barisnya sebagai harga satuan tanpa plafon. Tidak ada data yang
         * perlu disentuh, dan tidak ada SPK yang perlu disunting ulang.
         */
        volumeDiisi: true,
        // Hanya data sumber — poin perjanjian TIDAK disimpan sebagai teks.
        // Renderer merakitnya dari templateVersion + data di bawah ini.
        overtimeRate: Number(this.formGroup.get('overtimeRate')?.value) || 0,
        overtimeUnit: this.formGroup.get('overtimeUnit')?.value || 'jam',
        // Tetap disimpan di sini JUGA, bukan hanya sebagai baris item:
        // klausul kontraknya dirakit dari `customData`, dan memindahkannya
        // akan mengubah teks SPK yang sudah tercetak dan ditandatangani.
        overtimeVolume:
          Number(this.formGroup.get('overtimeVolume')?.value) || 0,
        overtimeAfter: this.formGroup.get('overtimeAfter')?.value,
        workStart: this.formGroup.get('workStart')?.value,
        workEnd: this.formGroup.get('workEnd')?.value,
        workStartSat: this.formGroup.get('workStartSat')?.value,
        workEndSat: this.formGroup.get('workEndSat')?.value,
        leaveNoticeDays:
          Number(this.formGroup.get('leaveNoticeDays')?.value) || 7,
        resignNoticeDays:
          Number(this.formGroup.get('resignNoticeDays')?.value) || 30,
        shiftHours: Math.min(
          24,
          Math.max(1, Number(this.formGroup.get('shiftHours')?.value) || 8),
        ),
        includeShiftClause: !!this.formGroup.get('includeShiftClause')?.value,
        includePlacementClause: !!this.formGroup.get('includePlacementClause')
          ?.value,
        includeHousingClause: !!this.formGroup.get('includeHousingClause')?.value,

        isFieldStaff: this.isFieldStaff,
        // Jangka waktu perjanjian: tanggal, atau terikat selesainya proyek.
        workLocation: this.formGroup.get('workLocation')?.value,
        contractStart: this.toISO(this.formGroup.get('contractStart')?.value),
        contractEnd: this.toISO(this.formGroup.get('contractEnd')?.value),
        contractUntilProjectDone: !!this.formGroup.get(
          'contractUntilProjectDone',
        )?.value,
        includeTransportHome: !!this.formGroup.get('includeTransportHome')
          ?.value,
        includeHomeLeave: !!this.formGroup.get('includeHomeLeave')?.value,
        includeEquipmentEscort: !!this.formGroup.get('includeEquipmentEscort')
          ?.value,
        jobDescriptions: this.jobDescriptionValues,
        /*
         * Jadwal upah disimpan DI SINI, bukan pada baris itemnya.
         *
         * Sebelumnya tiap baris item membawa `schedule`, dan
         * `purchase_order_items` tidak punya kolom itu — backend membuangnya
         * tanpa galat. Akibatnya seluruh tata cara pembayaran runtuh menjadi
         * satu kalimat "Upah dibayarkan sesuai kesepakatan" pada setiap
         * dokumen yang dibaca kembali, termasuk yang dicetak dan
         * ditandatangani.
         *
         * Yang disimpan DATA jadwalnya, bukan kalimatnya: kalimat dirakit
         * ulang saat dibaca, sehingga memperbaiki susunannya tidak menuntut
         * dokumen lama ikut ditulis ulang.
         */
        wageSchedules: (this.t.getRawValue() as any[]).map((w) => ({
          task: w?.task ?? '',
          wages: ((w?.wages as any[]) || []).map((u) => ({
            label: u?.label ?? '',
            scheduleType: u?.scheduleType ?? 'weekly',
            payDay: u?.payDay ?? null,
            payDate: u?.payDate ?? null,
            cutoffDay: u?.cutoffDay ?? null,
            cutoffDate: u?.cutoffDate ?? null,
            // Ikut disimpan; tanpa ini jadwal dua kali sebulan selalu kembali
            // ke tanggal 15 saat dokumennya dibuka lagi.
            cutoffFirst: u?.cutoffFirst ?? null,
          })),
        })),
        includeSundayPolicy: !!this.formGroup.get('includeSundayPolicy')?.value,
        // poin custom yang memang diketik sendiri oleh user
        additionalClauses: (this.additionalClauses.value as string[])
          .map((c) => (c || '').trim())
          .filter((c) => c.length > 0),
        // rich-text agreement points / notes (HTML string)
        notes: this.formGroup.get('notes')?.value,
      },
    };
  }

  /** Susun data cetak SPK dari isian form (klausul dirakit di helper). */
  private buildPrintData(purchaseOrderName: string) {
    const v = this.formGroup.getRawValue();
    const worker = this.t.at(0)?.getRawValue();
    const wages = (worker?.wages as any[]) || [];
    return {
      purchaseOrderName,
      date: v.date,
      projectName: v.projectName,
      // Pekerja = supplier yang dipilih pada formulir
      workerName: v.supplierName,
      workerPrefix: v.supplierPrefix,
      workerAddress: v.supplierAddress,
      workerCity: v.supplierCity,
      workerNpwp: v.supplierNpwp,
      task: worker?.task,
      items: wages.map((w) => ({
        label: w.label,
        amount: Number(w.amount) || 0,
        unit: w.unit,
      })),
      templateVersion: this.templateVersion,
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
        this.adendum.denganVersi(this.formatData()),
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
            printPurchaseOrderD(
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
            this.serverMessage.terjemahkan(error),
            'Close',
            { duration: 3000 },
          ),
      })
      .add(() => (this.isSubmitting = false));
  }

  templateVersion = latestClauseVersion('D');

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

  get isFieldStaff(): boolean {
    return !!this.formGroup.get('isFieldStaff')?.value;
  }

  get jobDescriptions(): FormArray {
    return this.formGroup.get('jobDescriptions') as FormArray;
  }

  addJobDescription() {
    this.jobDescriptions.push(new FormControl(''));
  }

  removeJobDescription(i: number) {
    this.jobDescriptions.removeAt(i);
  }

  private get jobDescriptionValues(): string[] {
    return ((this.jobDescriptions.value as string[]) || [])
      .map((x) => (x || '').trim())
      .filter((x) => x.length > 0);
  }

  /** Seksi tambahan khusus staf lapangan; kosong untuk pekerja harian. */
  get staffSections(): { title?: string; items: (string | string[])[] }[] {
    if (!this.isFieldStaff) return [];
    return buildStaffClauses({
      jobDescriptions: this.jobDescriptionValues,
    });
  }

  private clauseContext() {
    const v = this.formGroup.getRawValue();
    return {
      isFieldStaff: this.isFieldStaff,
      jobDescriptions: this.jobDescriptionValues,
      includeShiftClause: !!this.formGroup.get('includeShiftClause')?.value,
      includePlacementClause: !!this.formGroup.get('includePlacementClause')
        ?.value,
      /*
       * Ikut disertakan meski sudah tersimpan ke `customData`.
       *
       * Pembangun klausul memeriksanya dengan `!== false`, sehingga yang
       * TIDAK disebutkan di sini terbaca sebagai "nyala". Akibatnya klausul
       * mes tetap tercetak walau kotaknya sengaja dilepas — dan hanya pada
       * pratinjau, karena dokumen yang dibaca kembali merakit konteksnya dari
       * `customData` yang memang menyimpannya.
       */
      includeHousingClause: !!this.formGroup.get('includeHousingClause')?.value,
      overtimeRate: v.overtimeRate,
      overtimeUnit: v.overtimeUnit || 'jam',
      overtimeAfter: v.overtimeAfter,
      workStart: v.workStart,
      workEnd: v.workEnd,
      workStartSat: v.workStartSat,
      workEndSat: v.workEndSat,
      leaveNoticeDays: v.leaveNoticeDays,
      resignNoticeDays: v.resignNoticeDays,
      shiftHours: v.shiftHours,
      includeSundayPolicy: v.includeSundayPolicy,
      includeTransportHome: !!v.includeTransportHome,
      includeHomeLeave: !!v.includeHomeLeave,
      includeEquipmentEscort: !!v.includeEquipmentEscort,
      wageSchedules: this.wageSchedules,
      // Informasi umum: lokasi kerja dan jangka waktu perjanjian.
      workLocation: v.workLocation,
      projectName: v.projectName,
      contractStartText: this.tanggalPanjang(v.contractStart),
      contractEndText: this.tanggalPanjang(v.contractEnd),
      contractUntilProjectDone: !!v.contractUntilProjectDone,
    };
  }

  /** Tanggal dalam penulisan panjang; susunannya dipakai bersama. */
  private tanggalPanjang(nilai: any): string {
    return tanggalPanjangBersama(nilai);
  }

  /**
   * Pratinjau catatan perjanjian, terbagi bagian seperti dokumennya.
   *
   * Memakai sumber yang sama dengan pencetakan, sehingga apa yang terbaca
   * di layar tidak bisa berbeda dari yang keluar di PDF.
   */
  get previewSections() {
    return buildManpowerClauses(
      this.clauseContext(),
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
      this.isUbah ? 'poForm.judulUbah' : 'poForm.titleD',
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
        this.muatPekerjaan(induk);
        /*
         * Poin perjanjian tambahan ikut diwarisi.
         *
         * `isiFormulir` melewati setiap FormArray, sehingga poin khusus yang
         * sudah disepakati pada dokumen induk tidak pernah terbawa — dan
         * yang membaca adendumnya menganggap poin itu memang tidak ada.
         */
        /*
         * Rincian pekerjaan staf ikut diwarisi.
         *
         * Disimpan di `customData.jobDescriptions`, bukan sebagai baris
         * pekerjaan — sehingga `barisInduk()` tidak menyentuhnya. Tanpa ini,
         * adendum atas SPK yang memuat rincian tugas kehilangan seluruhnya,
         * dan seksi itu tidak tercetak sama sekali.
         */
        const tugasInduk = this.adendum.larikCustom(induk, 'jobDescriptions');
        this.jobDescriptions.clear();
        for (const teks of tugasInduk) {
          this.addJobDescription();
          this.jobDescriptions
            .at(this.jobDescriptions.length - 1)
            .setValue(teks ?? '');
        }

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
