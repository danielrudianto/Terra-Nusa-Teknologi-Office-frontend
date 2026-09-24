import { CommonModule, formatDate } from '@angular/common';
import {
  Component,
  LOCALE_ID,
  OnInit,
  computed,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DATE_FORMATS } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog } from '@angular/material/dialog';
import { DeleteConfirmationComponent } from '../../../components/delete-confirmation/delete-confirmation.component';
import {
  AksiCop,
  AksiCopBerkonfirmasi,
  nomorCop,
  pesanBerhasilCop,
  teksKonfirmasiCop,
} from '../cop-konfirmasi';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import moment from 'moment';
import { firstValueFrom } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { HeaderTitleComponent } from 'src/app/components/header-title/header-title.component';
import { RefreshButtonComponent } from 'src/app/components/refresh-button/refresh-button.component';
import { CertificateOfPaymentViewComponent } from '../certificate-of-payment-view/certificate-of-payment-view.component';
import { PurchaseOrderViewComponent } from '../../purchase-order/purchase-order-view/purchase-order-view.component';
import {
  CertificateOfPayment,
  CertificateOfPaymentService,
} from 'src/app/services/certificate-of-payment.service';
import { PermissionService } from 'src/app/services/permission.service';
import { ServerMessageService } from 'src/app/services/server-message.service';
import { CanDirective } from 'src/app/directives/can.directive';
import { SettingsService } from 'src/app/services/setting.service';
import { KerangkaTabelDirective } from '../../../directives/kerangka-tabel.directive';
import { RupiahComponent } from '../../../components/rupiah/rupiah.component';
import { NamaBadanComponent, inisialBadan } from '../../../components/nama-badan/nama-badan.component';
import { PILIHAN_BARIS } from 'src/app/constants/paginasi.constant';

/**
 * Bentuk tanggal KHUSUS untuk kotak rentang di bilah perkakas.
 *
 * Bawaan aplikasi `DD MMMM yyyy` menulis "05 September 2026" — tujuh belas
 * aksara. DUA di antaranya berikut pemisah dan tombol silang tidak muat di
 * kotak penyaring mana pun yang masih menyisakan tempat bagi pencarian di
 * sebelahnya; yang tampil "05 Septem – 12 Septeml", dan rentang yang
 * SEDANG BERLAKU menjadi satu-satunya hal di layar yang tidak terbaca.
 *
 * Yang diperpendek hanya BENTUK KETIKNYA. Nama bulan penuh tetap dipakai
 * kalendernya, dan `parse` tetap menerima bentuk panjang — tanggal yang
 * disalin dari layar lain lalu ditempel di sini tetap terbaca.
 */
export const BENTUK_TANGGAL_SARING = {
  parse: { dateInput: ['DD MMM YYYY', 'DD MMMM YYYY', 'LL'] },
  display: {
    dateInput: 'DD MMM yyyy',
    monthYearLabel: 'MMMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

/**
 * Daftar Certificate of Payment.
 *
 * Tiga keadaan yang dibedakan — draf, diperiksa, disetujui — karena itulah
 * yang menentukan siapa harus berbuat apa berikutnya. Tombol periksa dan
 * setujui muncul mengikuti wewenang, tetapi keputusannya tetap di server.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-certificate-of-payment-list',
  standalone: true,
  imports: [
    NamaBadanComponent,
    RupiahComponent,
    KerangkaTabelDirective,
    CanDirective,
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatChipsModule,
    MatTooltipModule,
    MatProgressBarModule,
    TranslateModule,
    HeaderTitleComponent,
    RefreshButtonComponent,
  ],
  templateUrl: './certificate-of-payment-list.component.html',
  styleUrl: './certificate-of-payment-list.component.scss',
  // Hanya untuk layar ini — bentuk tanggal di seluruh formulir lain tidak
  // ikut berubah.
  providers: [{ provide: MAT_DATE_FORMATS, useValue: BENTUK_TANGGAL_SARING }],
})
export class CertificateOfPaymentListComponent implements OnInit {
  /** Pilihan baris per halaman — satu daftar untuk seluruh aplikasi. */
  readonly pilihanBaris = PILIHAN_BARIS;

  /** track by id: hindari render ulang seluruh baris saat data berubah. */
  trackById = (_: number, row: any): any => row?.id ?? _;

  private readonly service = inject(CertificateOfPaymentService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly setelan = inject(SettingsService);
  private readonly translate = inject(TranslateService);
  private readonly pesanServer = inject(ServerMessageService);
  readonly izin = inject(PermissionService);
  /** Dipakai `formatDate` pada ringkasan periode — "Sep" vs "Sept" vs "9月". */
  private readonly lokal = inject(LOCALE_ID);

  readonly data = signal<CertificateOfPayment[]>([]);
  /**
   * Kata pencarian.
   *
   * Dikirim ke server, bukan dipakai menyaring `data()`: daftar ini dipenggal
   * per halaman, dan menyaring satu halaman hanya mencari di baris yang
   * kebetulan sedang terbuka.
   */
  readonly cari = new FormControl<string>('');

  /**
   * Rentang tanggal dokumen. KOSONG saat layar dibuka.
   *
   * Daftar Beban memulai dengan bulan berjalan karena beban memang dibaca
   * per bulan. Berita acara tidak: yang dicari di sini hampir selalu satu
   * dokumen tertentu, dan separuhnya berumur lebih tua dari bulan ini.
   * Memasang bulan berjalan sebagai bawaan berarti layar yang baru dibuka
   * DIAM-DIAM menyembunyikan sebagian besar isinya — dan yang mencari CoP
   * bulan lalu mendapat "belum ada CoP" untuk dokumen yang jelas ada.
   *
   * Karena itu juga TIDAK wajib, dan kedua ujungnya berdiri sendiri:
   * mengisi "dari" saja berarti "sejak", mengisi "sampai" saja berarti
   * "hingga".
   */
  readonly rentang = new FormGroup({
    dari: new FormControl<moment.Moment | null>(null),
    sampai: new FormControl<moment.Moment | null>(null),
  });

  /** Ada tanggal terpasang? Menentukan tombol hapus rentang muncul. */
  readonly adaRentang = signal(false);

  /**
   * Nilai datepicker -> `YYYY-MM-DD`, atau `undefined`.
   *
   * Lewat `toISOString()` tanggalnya digeser ke UTC lebih dulu, dan bagi
   * WIB (+7) setiap tanggal mundur satu hari: rentang yang dipilih
   * 1–30 September terkirim sebagai 31 Agustus–29 September. Tidak ada
   * galat — hanya baris yang hilang di satu ujung dan baris asing di
   * ujung lain.
   */
  private tanggalKirim(nilai: moment.Moment | null | undefined): string | undefined {
    if (!nilai) return undefined;
    const m = moment(nilai);
    return m.isValid() ? m.format('YYYY-MM-DD') : undefined;
  }

  /** Lepas rentang tanggal — kembali ke seluruh daftar. */
  bersihkanRentang(): void {
    this.rentang.reset({ dari: null, sampai: null });
  }

  /*
   * Pengurutan DI SERVER, sama seperti pencariannya.
   *
   * Mengurutkan di layar hanya mengurutkan dua puluh baris yang kebetulan
   * terbuka. Yang mencari CoP bernilai terbesar akan menemukan yang terbesar
   * DI HALAMAN INI — angka yang tidak berarti apa-apa, dan tidak ada apa pun
   * di layar yang memberitahu bahwa itulah yang barusan terjadi.
   *
   * Bawaan `tanggal` menurun — SAMA dengan urutan bawaan server.
   *
   * Server mengurutkan `c.date DESC, c.id DESC` bila tidak diberi kolom, dan
   * `tanggal` menurun menghasilkan perintah yang persis sama. Jadi menyetel
   * bawaan di sini tidak mengubah baris yang keluar; ia hanya membuat kepala
   * kolomnya JUJUR — sebelumnya daftar jelas terurut menurut tanggal
   * sementara ketujuh kolomnya sama-sama menampilkan ikon "belum diurutkan".
   */
  readonly urutKolom = signal<string>('tanggal');
  readonly urutArah = signal<'asc' | 'desc'>('desc');

  /**
   * Tekan kolom yang sama membalik arah; kolom lain mulai dari menaik.
   *
   * Persis perilaku `changeSortBy` pada daftar Pembelian dan Purchase Order.
   * Keadaan ketiga — "tidak diurutkan" — SENGAJA tidak ada: ia tidak ada di
   * kedua daftar itu, dan satu daftar yang butuh tiga ketukan untuk kembali
   * ke awal sementara dua lainnya butuh dua adalah perbedaan yang hanya
   * ditemukan dengan salah menekan.
   */
  gantiUrutan(kolom: string): void {
    if (this.urutKolom() === kolom) {
      this.urutArah.set(this.urutArah() === 'asc' ? 'desc' : 'asc');
    } else {
      this.urutKolom.set(kolom);
      this.urutArah.set('asc');
    }
    // Kembali ke halaman pertama: urutan baru membuat "halaman ketiga"
    // menunjuk baris yang sama sekali lain.
    this.halaman = 0;
    void this.muat();
  }

  /** Kolom inikah yang sedang mengurutkan? Menentukan ikonnya redup atau tidak. */
  diurutkan(kolom: string): boolean {
    return this.urutKolom() === kolom;
  }

  /**
   * Ikon kepala kolom.
   *
   * `unfold_more` yang redup pada kolom yang sedang tidak mengurutkan bukan
   * hiasan: tanpanya tidak ada tanda sama sekali bahwa judulnya dapat
   * ditekan, dan pengurutannya hanya ditemukan orang yang kebetulan
   * menekannya.
   */
  urutIkon(kolom: string): string {
    if (!this.diurutkan(kolom)) return 'unfold_more';
    return this.urutArah() === 'asc' ? 'arrow_drop_up' : 'arrow_drop_down';
  }

  /** Penyaring keadaan: '', 'draft', 'bap', 'dibuat', 'disetujui', 'dihapus'. */
  readonly saring = signal<string>('');
  readonly total = signal(0);
  readonly memuat = signal(false);

  halaman = 0;
  /*
   * Ikut setelan "baris per halaman" milik pengguna, bukan angka tetap.
   *
   * Sebelumnya daftar ini menetapkan 20 sendiri — sehingga pengguna yang
   * memilih 10 di Pengaturan tetap mendapat 20 di sini, dan satu-satunya
   * daftar yang berbeda itu terbaca sebagai setelannya tidak bekerja.
   */
  ukuran: number = this.setelan.pageSize;

  readonly bolehLihatNilai = computed(() => this.izin.level() >= 2);
  readonly bolehBuat = computed(() =>
    this.izin.can('certificate_of_payment', 'create'),
  );
  readonly bolehPeriksa = computed(() => this.izin.level() >= 2);
  readonly bolehSetujuiBap = computed(() => this.izin.level() >= 4);
  readonly bolehSetujui = computed(() => this.izin.level() >= 4);

  /*
   * SPK dan PERIODE berdiri sebagai kolom sendiri.
   *
   * Keduanya dulu menumpang sebagai baris kedua di dalam sel tetangganya —
   * nomor SPK di bawah nomor CoP, periode kerja di bawah tanggal. Yang
   * didapat bukan kolom yang ringkas melainkan dua sel yang setinggi dua
   * baris dengan angka berbeda arti yang ditumpuk tanpa label: mana yang
   * nomor CoP dan mana yang nomor SPK hanya dapat dibedakan dari bentuk
   * penomorannya, dan keduanya tidak dapat diurutkan sama sekali.
   *
   * Sebagai kolom, keduanya mendapat kepala kolom yang menamainya dan ikon
   * pengurutan seperti kolom lain — dan barisnya kembali setinggi satu
   * baris.
   */
  /*
   * TANGGAL PALING KIRI, dan periode menyusul di sebelahnya.
   *
   * Bentuk yang sama dengan daftar Pembelian: `date`, lalu `masaPajak`,
   * baru `invoiceName`. Dua kolom tanggal berdampingan di tepi kiri, nomor
   * dokumen sesudahnya. Yang berpindah antar kedua daftar sepanjang hari
   * mencari tanggal di tempat yang sama, dan satu daftar yang menaruhnya
   * di tengah menuntut pencarian ulang tiap kali.
   *
   * Periode menempel pada tanggal, bukan tertinggal di tengah: keduanya
   * tanggal, dan yang membaca "17 Sep" hampir selalu perlu tahu pekerjaan
   * minggu mana yang diakui di dalamnya. Dipisahkan empat kolom, keduanya
   * harus dibandingkan dengan menyeberangi nama pemasok.
   */
  get kolom(): string[] {
    const dasar = [
      'tanggal',
      'periode',
      'nomor',
      'spk',
      'pemasok',
      'proyek',
      'keadaan',
      'pembuat',
    ];
    return this.bolehLihatNilai()
      ? [...dasar, 'nilai', 'aksi']
      : [...dasar, 'aksi'];
  }

  /**
   * Baris yang tampil.
   *
   * Penyaringnya sudah dikerjakan SERVER — lihat `keadaan` pada rute daftar.
   * Sebelumnya disaring di sini, dan itu keliru pada daftar berhalaman: yang
   * tersaring hanya dua puluh baris yang kebetulan terbuka, sementara
   * pemenggal halaman di bawahnya tetap menyebut jumlah SELURUHNYA. Memilih
   * "Draf" pada daftar berisi ratusan dokumen lalu menampilkan tiga baris di
   * atas keterangan "1–20 dari 340".
   */
  readonly terlihat = computed(() => this.data());

  pilihSaring(nilai: string): void {
    this.saring.set(nilai || '');
    // Kembali ke halaman pertama: penyaring baru membuat "halaman ketiga"
    // menunjuk baris yang sama sekali lain.
    this.halaman = 0;
    void this.muat();
  }

  /** Unduh CoP + lampiran BAP sebagai satu berkas PDF. */
  async unduh(c: CertificateOfPayment): Promise<void> {
    try {
      const berkas = (await firstValueFrom(
        this.service.unduhPdf(c.id),
      )) as Blob;
      this.simpanBerkas(berkas, `${(c.name || 'CoP').replace(/\//g, '-')}.pdf`);
    } catch (e) {
      this.pesan(e);
    }
  }

  /**
   * Simpan blob sebagai unduhan.
   *
   * URL sementaranya DICABUT setelah dipakai: tanpa itu tiap unduhan
   * menahan berkasnya di memori peramban sampai tabnya ditutup.
   */
  private simpanBerkas(blob: Blob, nama: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nama;
    a.click();
    URL.revokeObjectURL(url);
  }

  ngOnInit(): void {
    // Datang dari beranda ponsel dengan `?keadaan=draft|diperiksa`: keping
    // penyaringnya sudah terpilih saat layar terbuka, sehingga yang menekan
    // kartu "CoP perlu diperiksa" langsung melihat yang perlu diperiksa —
    // bukan seluruh daftar yang harus disaring ulang tangan.
    const awal = this.route.snapshot.queryParamMap.get('keadaan');
    if (awal) this.saring.set(awal);

    /*
     * Jeda 300ms sebelum server ditanya.
     *
     * Tanpa jeda, mengetik "R501" mengirimkan empat permintaan yang
     * jawabannya dapat tiba tidak berurutan — dan yang tiba terakhir,
     * jawaban untuk "R50", menimpa jawaban yang benar.
     */
    this.cari.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => {
        // Kembali ke halaman pertama: hasil pencarian baru hampir selalu
        // lebih pendek, dan bertahan di halaman ketiga menampilkan daftar
        // kosong untuk kata yang sebenarnya ada hasilnya.
        this.halaman = 0;
        void this.muat();
      });

    /*
     * Rentang tanggal memuat ulang HANYA bila kedua ujungnya sudah tenang.
     *
     * `mat-date-range-input` menembakkan perubahan dua kali untuk satu kali
     * pilih — sekali saat tanggal awal dipilih, sekali saat akhirnya. Tanpa
     * jeda, permintaan pertama dikirim untuk rentang setengah jadi
     * "1 Sep – kosong", dan jawabannya dapat tiba SESUDAH jawaban untuk
     * rentang yang benar lalu menimpanya.
     *
     * 250ms, bukan 300 seperti pencarian: memilih tanggal kedua pada
     * kalender selalu lebih lambat daripada mengetik huruf berikutnya, jadi
     * jeda yang lebih pendek pun tidak pernah memecah satu pilihan menjadi
     * dua permintaan.
     */
    this.rentang.valueChanges
      .pipe(debounceTime(250))
      .subscribe((nilai) => {
        // Dibaca dari nilai yang DITEMBAKKAN, bukan dari `rentang.value`:
        // di dalam langganan sebuah grup, nilai induknya belum tentu sudah
        // diperbarui.
        this.adaRentang.set(!!(nilai?.dari || nilai?.sampai));
        this.halaman = 0;
        void this.muat();
      });

    void this.muat();
  }

  private pesan(e: any): void {
    this.snackBar.open(
      this.pesanServer.terjemahkan(e),
      this.translate.instant('common.close'),
      { duration: 6000 },
    );
  }

  async muat(): Promise<void> {
    this.memuat.set(true);
    try {
      const hasil: any = await firstValueFrom(
        this.service.daftar({
          page: this.halaman,
          pageSize: this.ukuran,
          keyword: (this.cari.value || '').trim() || undefined,
          sortBy: this.urutKolom() || undefined,
          sortDir: this.urutArah() || undefined,
          keadaan: this.saring() || undefined,
          start: this.tanggalKirim(this.rentang.value.dari),
          end: this.tanggalKirim(this.rentang.value.sampai),
        }),
      );
      this.data.set(hasil?.data || []);
      this.total.set(hasil?.total || 0);
    } catch (e) {
      this.pesan(e);
    } finally {
      this.memuat.set(false);
    }
  }

  gantiHalaman(e: PageEvent): void {
    this.halaman = e.pageIndex;
    this.ukuran = e.pageSize;
    void this.muat();
  }

  /** Huruf pertama nama pemasok; "?" bila tidak ada. */
  inisialPemasok(c: CertificateOfPayment): string {
    return inisialBadan(c.supplierName, c.supplierPrefix);
  }

  /**
   * Periode kerja sebagai SATU kalimat, bukan dua tanggal utuh.
   *
   * "10 Sep 2026 – 16 Sep 2026" mengulang bulan dan tahun yang sama persis
   * dua kali dalam satu sel selebar 150px, dan yang benar-benar dibaca —
   * angka 10 dan 16 — tenggelam di antara pengulangannya. Bagian yang sama
   * karena itu ditulis sekali, di ujung:
   *
   *   sebulan, setahun   10 – 16 Sep 2026
   *   beda bulan         28 Sep – 4 Okt 2026
   *   beda tahun         28 Des 2025 – 4 Jan 2026
   *   satu hari          10 Sep 2026
   *
   * TAHUNNYA tidak pernah dibuang, meski hampir selalu tahun berjalan.
   * Daftar ini memuat dokumen lintas tahun, dan "10 – 16 Sep" yang
   * ternyata milik 2025 terbaca sebagai milik tahun ini tanpa ada apa pun
   * yang membantahnya.
   *
   * Nama bulannya lewat `formatDate` dengan lokal aktif — bukan disusun
   * dari daftar nama bulan sendiri, yang akan tetap berbahasa Indonesia
   * saat aplikasinya dipindah ke bahasa Inggris.
   */
  periodeTeks(c: CertificateOfPayment): string {
    const a = this.keTanggal(c.periodStart);
    const b = this.keTanggal(c.periodEnd);
    if (!a || !b) return '';

    const hari = (d: Date) => formatDate(d, 'd', this.lokal);
    const hariBulan = (d: Date) => formatDate(d, 'd MMM', this.lokal);
    const penuh = (d: Date) => formatDate(d, 'd MMM y', this.lokal);
    const tahun = (d: Date) => formatDate(d, 'y', this.lokal);

    if (a.getTime() === b.getTime()) return penuh(a);
    if (tahun(a) !== tahun(b)) return `${penuh(a)} – ${penuh(b)}`;
    if (a.getMonth() !== b.getMonth())
      return `${hariBulan(a)} – ${penuh(b)}`;
    return `${hari(a)} – ${penuh(b)}`;
  }

  /**
   * Teks tanggal dari server -> `Date`, atau `null`.
   *
   * `null` untuk yang tidak dapat diurai, BUKAN `new Date(teks)` apa
   * adanya: tanggal yang tidak sah menghasilkan `Invalid Date`, dan
   * `formatDate` melemparkan galat atasnya — satu baris berdata rusak
   * menjatuhkan seluruh tabel.
   */
  private keTanggal(nilai: string | null | undefined): Date | null {
    if (!nilai) return null;
    const d = new Date(nilai);
    return isNaN(d.getTime()) ? null : d;
  }

  /**
   * Nama panjang diringkas: "Nazula Lintang Rahmadhani" -> "Nazula L. R."
   *
   * Kolom "dibuat oleh" selebar 184px memuat sekitar dua puluh enam
   * aksara. Nama tiga kata melewatinya, dan yang tampil adalah elipsis di
   * tempat yang sama pada setiap baris — satu lajur berisi "Nazula Lintang
   * Rahma…" berulang-ulang, yang tidak membedakan apa pun sekaligus
   * memakan ruang paling banyak di seluruh tabel.
   *
   * NAMA DEPAN TETAP UTUH. Itulah yang dipakai orang memanggil dan
   * mengenali satu sama lain di sini; yang boleh menyusut sisanya.
   *
   * Hanya nama yang MEMANG tidak muat yang diringkas. "Daniel Tri" tidak
   * disentuh: meringkasnya menjadi "Daniel T." tidak memenangkan apa pun
   * dan hanya membuat satu nama tertulis lebih pendek daripada yang
   * sebenarnya tanpa sebab yang terlihat.
   *
   * Penuhnya tetap ada di tooltip — dua orang bernama depan sama tetap
   * dapat dibedakan tanpa meninggalkan layar.
   */
  private static readonly BATAS_NAMA = 20;

  namaRingkas(nama: string | null | undefined): string {
    const penuh = (nama || '').trim();
    if (!penuh) return '—';
    if (penuh.length <= CertificateOfPaymentListComponent.BATAS_NAMA) {
      return penuh;
    }
    const kata = penuh.split(/\s+/);
    if (kata.length < 2) return penuh;
    const inisial = kata
      .slice(1)
      .map((k) => k[0])
      .filter(Boolean)
      .map((h) => `${h.toUpperCase()}.`)
      .join(' ');
    return inisial ? `${kata[0]} ${inisial}` : penuh;
  }

  /**
   * Buka SPK-nya, dari daftar CoP.
   *
   * Pertanyaan yang muncul di depan sebuah berita acara hampir selalu
   * "pagunya berapa" atau "isi SPK-nya apa" — dan sampai sekarang
   * jawabannya harus dicari dengan meninggalkan layar ini, membuka daftar
   * Purchase Order, lalu mengetik ulang nomor yang barusan dibaca.
   *
   * DIALOG yang sama dengan yang dipakai daftar Purchase Order, bukan
   * salinan: SPK yang dibuka dari sini harus terbaca persis seperti SPK
   * yang dibuka dari sana.
   *
   * `stopPropagation` wajib — tanpanya baris di belakangnya ikut terpicu
   * dan dua dialog terbuka bertumpuk, dengan CoP menutupi SPK yang barusan
   * diminta.
   */
  bukaSpk(c: CertificateOfPayment, ev: Event): void {
    ev.stopPropagation();
    if (!c.purchaseOrderID) return;
    this.dialog.open(PurchaseOrderViewComponent, {
      data: { id: c.purchaseOrderID },
      maxWidth: '94vw',
      autoFocus: false,
    });
  }

  /**
   * Keadaan dokumen, untuk lencana.
   *
   * "Dihapus" didahulukan: ia BUKAN tahap perjalanan dokumen melainkan
   * keadaan lain sama sekali, dan dokumen yang terhapus tetap membawa
   * seluruh penanda tahapnya. Diperiksa belakangan, CoP yang sudah
   * disetujui lalu dihapus akan tampil sebagai "Disetujui" — persis
   * kebalikan dari yang perlu diketahui.
   */
  keadaan(
    c: CertificateOfPayment,
  ): 'draft' | 'bap' | 'dibuat' | 'disetujui' | 'dihapus' {
    if (c.isDelete) return 'dihapus';
    if (c.isApproved) return 'disetujui';
    if (c.isCopCreated) return 'dibuat';
    if (c.isBapApproved) return 'bap';
    return 'draft';
  }

  nilaiTotal(c: CertificateOfPayment): number | null {
    if (!this.bolehLihatNilai() || !c.items) return null;
    return c.items.reduce((t, i) => t + Number(i.amount || 0), 0);
  }

  buat(): void {
    this.router.navigate(['/Certificate-of-payment/Create']);
  }

  /**
   * Buka dokumen sebagai DIALOG, bukan berpindah halaman.
   *
   * Membaca satu CoP adalah pekerjaan sekilas: melihat volumenya, melihat
   * siapa yang sudah menandatangani, lalu kembali. Berpindah halaman
   * membuang kata pencarian, penyaring, urutan, dan halaman yang sedang
   * dibuka — dan yang memeriksa sepuluh dokumen berturut-turut harus
   * menyusunnya ulang sepuluh kali.
   *
   * Yang bukan sekilas — memeriksa, menyunting — tetap berpindah halaman;
   * keduanya menutup dialognya lebih dulu.
   */
  buka(c: CertificateOfPayment): void {
    this.dialog
      .open(CertificateOfPaymentViewComponent, {
        data: { id: c.id },
        width: '900px',
        maxWidth: '94vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((berubah) => {
        // Dimuat ulang HANYA bila ada yang berubah. Memuat ulang setiap kali
        // dialog ditutup membuat daftar berkedip tiap kali orang sekadar
        // melihat-lihat.
        if (berubah) void this.muat();
      });
  }

  ubah(c: CertificateOfPayment): void {
    this.router.navigate(['/Certificate-of-payment/Edit', c.id]);
  }

  /** Buka lembar periksa — tandanya dibubuhkan di sana, sebagai akibat simpan. */
  bukaPeriksa(c: CertificateOfPayment): void {
    this.router.navigate(['/Certificate-of-payment/Periksa', c.id]);
  }

  /**
   * Minta konfirmasi lebih dulu; `false` berarti dibatalkan.
   *
   * Teksnya datang dari `cop-konfirmasi`, dipakai bersama dialog lihat —
   * supaya peringatan yang muncul tidak bergantung pada dari layar mana
   * tombolnya ditekan.
   */
  private async konfirmasi(
    c: CertificateOfPayment,
    aksi: AksiCopBerkonfirmasi,
  ): Promise<boolean> {
    const setuju = await firstValueFrom(
      this.dialog
        .open(DeleteConfirmationComponent, {
          data: teksKonfirmasiCop(this.translate, aksi, nomorCop(c)),
        })
        .afterClosed(),
    );
    return !!setuju;
  }

  /** Pesan berhasil. Tanpa ini, yang menekan hanya melihat daftar berkedip. */
  private kabarkan(c: CertificateOfPayment, aksi: AksiCop): void {
    this.snackBar.open(
      pesanBerhasilCop(this.translate, aksi, nomorCop(c)),
      this.translate.instant('common.close'),
      { duration: 5000 },
    );
  }

  async setujuiBap(c: CertificateOfPayment): Promise<void> {
    if (!(await this.konfirmasi(c, 'setujuiBap'))) return;
    try {
      await firstValueFrom(this.service.setujuiBap(c.id, true));
      this.kabarkan(c, 'setujuiBap');
      await this.muat();
    } catch (e) {
      this.pesan(e);
    }
  }

  /*
   * Sakelar, bukan keputusan sekali jalan — dapat dicabut dari layar yang
   * sama. Karena itu tanpa konfirmasi: meminta konfirmasi pada tindakan yang
   * mudah dibatalkan melatih orang menekan "Ya" tanpa membaca, dan
   * konfirmasi pada HAPUS ikut kehilangan dayanya.
   */
  async periksa(c: CertificateOfPayment, checked: boolean): Promise<void> {
    try {
      await firstValueFrom(this.service.periksa(c.id, checked));
      this.kabarkan(c, checked ? 'periksa' : 'cabutPeriksa');
      await this.muat();
    } catch (e) {
      this.pesan(e);
    }
  }

  async setujui(c: CertificateOfPayment): Promise<void> {
    if (!(await this.konfirmasi(c, 'setujui'))) return;
    try {
      await firstValueFrom(this.service.setujui(c.id));
      this.kabarkan(c, 'setujui');
      await this.muat();
    } catch (e) {
      this.pesan(e);
    }
  }

  async hapus(c: CertificateOfPayment): Promise<void> {
    if (!(await this.konfirmasi(c, 'hapus'))) return;
    try {
      await firstValueFrom(this.service.hapus(c.id));
      // Dikabarkan SEBELUM memuat ulang: begitu daftarnya tergambar ulang,
      // barisnya sudah hilang dan tidak ada lagi yang menunjukkan bahwa
      // sesuatu memang terjadi.
      this.kabarkan(c, 'hapus');
      await this.muat();
    } catch (e) {
      this.pesan(e);
    }
  }
}
