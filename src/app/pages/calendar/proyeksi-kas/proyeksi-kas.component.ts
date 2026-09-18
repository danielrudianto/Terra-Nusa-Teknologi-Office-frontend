import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BaseChartDirective } from 'ng2-charts';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ChartConfiguration, ChartData } from 'chart.js';

import { ApiService } from 'src/app/services/api.service';
import { PaymentPlanService } from 'src/app/services/payment-plan.service';
import {
  nominalSingkat,
  pastikanChart,
  rupiah,
} from 'src/app/helpers/chart-dasar.helper';

/*
 * Pendaftaran chart.js DIPANGGIL DI TINGKAT MODUL, bukan di dalam kelas.
 *
 * Alasannya dan kelas kegagalannya ada di `chart-dasar.helper` — ringkasnya:
 * tanpa ini kanvasnya kosong tanpa satu pun galat, dan kosongnya hanya bagi
 * yang membuka halaman ini lebih dulu.
 */
pastikanChart();

/** Satu titik pada garis proyeksi. */
export interface TitikProyeksi {
  /**
   * TANGGAL TITIK INI, `YYYY-MM-DD` — tanggal saldonya berlaku.
   *
   * Dulu bernama `mulai` dan berisi Senin AWAL pekan, sementara saldonya
   * saldo AKHIR pekan. Lihat keterangan panjang di `titikProyeksi`.
   */
  tanggal: string;
  label: string;
  /** Titik jangkar: kas hari ini, belum ada rencana yang diterapkan. */
  sekarang?: boolean;
  masuk: number;
  keluar: number;
  /** Saldo kas PADA `tanggal`, kumulatif dari kas hari ini. */
  saldo: number;
}

const NAMA_BULAN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

const satuHari = 86400000;

function urai(tgl: string): Date {
  const [y, b, h] = tgl.split('-').map(Number);
  // Konstruktor WAKTU SETEMPAT. `new Date('2026-09-15')` diurai sebagai
  // tengah malam UTC dan bergeser sehari di zona non-UTC — kekeliruan yang
  // sudah dua kali muncul di sistem ini.
  return new Date(y, b - 1, h);
}

function teks(d: Date): string {
  const dua = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}`;
}

/** `YYYY-MM-DD` -> Senin pekan itu. */
export function seninPekan(tgl: string): string {
  const d = urai(tgl);
  // getDay(): 0 = Minggu. Digeser supaya Senin menjadi awal pekan.
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return teks(d);
}

/** `YYYY-MM-DD` -> Minggu pekan itu, yaitu hari TERAKHIR pekannya. */
export function mingguPekan(tgl: string): string {
  const d = urai(seninPekan(tgl));
  d.setDate(d.getDate() + 6);
  return teks(d);
}

export function tambahHari(tgl: string, n: number): string {
  const d = urai(tgl);
  d.setDate(d.getDate() + n);
  return teks(d);
}

function tambahPekan(tgl: string, n: number): string {
  return tambahHari(tgl, n * 7);
}

/**
 * `2026-09-18` -> `18 Sep`.
 *
 * Namanya `labelTitik`, bukan `labelPekan`: titiknya sudah per hari, dan nama
 * yang menyebut pekan akan menyesatkan yang membacanya berikutnya.
 */
function labelTitik(tgl: string): string {
  const [, b, h] = tgl.split('-').map(Number);
  return `${h} ${NAMA_BULAN[b - 1]}`;
}

/**
 * Rencana kas -> garis proyeksi saldo.
 *
 * ------------------------------------------------------------------
 * SETIAP TITIK DIBERI LABEL TANGGAL SALDONYA BERLAKU
 * ------------------------------------------------------------------
 *
 * Ini perbaikan atas kekeliruan yang dilaporkan: kalender menyebut saldo
 * akhir 14 September 788 juta, sementara titik proyeksi berlabel "14 Sep"
 * menyebut 777 juta. Keduanya benar; yang salah LABELNYA.
 *
 * Versi sebelumnya memberi label SENIN AWAL pekan pada titik yang saldonya
 * saldo AKHIR pekan itu — jadi setiap titik tertulis sampai enam hari lebih
 * awal daripada keadaannya. Dan titik pertamanya lebih kacau lagi: jangkarnya
 * kas HARI INI (15 Sep), embernya pekan 14–20 Sep, labelnya "14 Sep". Tiga
 * tanggal berbeda dalam satu titik, dan tidak ada satu pun yang salah secara
 * mencolok — angkanya masuk akal, garisnya mulus, cuma tidak menjawab
 * pertanyaan yang tertulis di sumbunya.
 *
 * Sekarang:
 *
 *   * **Titik 0 = HARI INI.** Saldonya kas hari ini apa adanya, tanpa satu
 *     rencana pun diterapkan. Ia dapat dicocokkan langsung dengan KPI "Kas
 *     hari ini" dan dengan kalender — dan titik jangkar yang dapat dicocokkan
 *     itulah yang membuat sisa garisnya dapat dipercaya.
 *
 *   * **Titik 1..n = MINGGU (hari terakhir) tiap pekan.** Saldonya saldo pada
 *     tanggal itu, sesudah seluruh rencana sampai tanggal itu. Labelnya
 *     tanggal itu juga.
 *
 * ------------------------------------------------------------------
 * RENCANA YANG SUDAH TERLEWAT MASUK KE TITIK PERTAMA SESUDAH HARI INI
 * ------------------------------------------------------------------
 *
 * Bukan dibuang, dan bukan ditaruh di tanggal aslinya yang sudah lewat.
 * Uangnya memang belum bergerak — statusnya masih `rencana` — dan kewajibannya
 * belum hilang. Dibuang, proyeksinya terbaca lebih sehat daripada keadaannya.
 *
 * Yang TIDAK boleh: menguranginya dari titik "hari ini". Kas hari ini adalah
 * angka yang dapat dicocokkan ke rekening; mengurangi apa pun darinya membuat
 * jangkarnya berhenti dapat dicocokkan.
 *
 * ------------------------------------------------------------------
 * SALDO AWALNYA KAS SUNGGUHAN HARI INI
 * ------------------------------------------------------------------
 *
 * Bukan saldo awal bulan yang sedang dibuka di kalender. Kalau titik mulainya
 * bukan uang yang benar-benar ada di rekening, seluruh garisnya menggeser
 * sebanyak selisih itu tanpa ada yang menyadarinya.
 */
export function titikProyeksi(
  rencana: any[],
  saldoAwal: number,
  mulai: string,
  pekan: number,
): TitikProyeksi[] {
  const hariIni = String(mulai ?? '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(hariIni)) return [];

  /*
   * Batas tiap titik: SATU TITIK PER HARI, mulai hari ini.
   *
   * DULU PER PEKAN, dan pekan menyembunyikan justru yang dicari.
   *
   * Kas tidak habis "pada pekan ke-3"; ia habis pada sebuah TANGGAL, dan
   * tanggal itulah yang menentukan kapan uang harus sudah masuk. Titik
   * mingguan hanya menyimpan saldo hari Minggu, sehingga lembah di tengah
   * pekan — bayar gaji Rabu, uang masuk Jumat — tidak pernah tergambar sama
   * sekali. Garisnya mulus, angkanya masuk akal, dan hari paling berbahaya
   * dalam tiga bulan itu tidak ada di grafiknya.
   *
   * `pekan` tetap menjadi satuan JANGKAUAN — 13 pekan, tiga bulan — supaya
   * pemanggilnya tidak berubah arti. Yang berubah kerapatan titiknya.
   */
  const batas: string[] = [hariIni];
  for (let i = 1; i <= pekan * 7; i++) {
    batas.push(tambahHari(hariIni, i));
  }

  const ember = new Map<string, { masuk: number; keluar: number }>();
  for (const b of batas) ember.set(b, { masuk: 0, keluar: 0 });

  const akhir = batas[batas.length - 1];
  /** Titik pertama SESUDAH hari ini; ke sinilah yang terlewat dibebankan. */
  const pertamaSesudahIni = batas.length > 1 ? batas[1] : null;

  for (const r of rencana ?? []) {
    if (r?.status !== 'rencana') continue;

    const tgl = String(r?.date ?? '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tgl)) continue;
    // Di luar jangkauan -> dilewati; jumlahnya dilaporkan terpisah oleh
    // komponennya supaya tidak hilang diam-diam.
    if (tgl > akhir) continue;

    /*
     * Titik pertama yang tanggalnya >= tanggal rencana ini.
     *
     * Rencana TERLEWAT (tanggalnya <= hari ini) ikut ke titik pertama
     * sesudah hari ini, BUKAN ke titik hari ini: titik hari ini adalah kas
     * sungguhan, dan ia harus tetap cocok dengan rekening.
     */
    let kunci: string | null = null;
    if (tgl <= hariIni) {
      kunci = pertamaSesudahIni;
    } else {
      for (const b of batas) {
        if (b >= tgl) {
          kunci = b;
          break;
        }
      }
    }
    if (!kunci || kunci === hariIni) continue;

    const e = ember.get(kunci)!;
    const n = Math.abs(Number(r?.amount) || 0);
    if (r?.planType === 'masuk') e.masuk += n;
    else e.keluar += n;
  }

  let saldo = Number(saldoAwal) || 0;
  return batas.map((b, i) => {
    const e = ember.get(b)!;
    saldo += e.masuk - e.keluar;
    return {
      tanggal: b,
      label: labelTitik(b),
      sekarang: i === 0,
      masuk: e.masuk,
      keluar: e.keluar,
      saldo,
    };
  });
}

@Component({
  selector: 'app-proyeksi-kas',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatTooltipModule,
    TranslatePipe,
    BaseChartDirective,
    MatExpansionModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './proyeksi-kas.component.html',
  styleUrl: './proyeksi-kas.component.scss',
})
export class ProyeksiKasComponent implements OnChanges {
  private readonly api = inject(ApiService);
  private readonly planService = inject(PaymentPlanService);
  private readonly translate = inject(TranslateService);

  /** Rekening yang dipilih di kalender — supaya angkanya SEPAKAT dengan kisinya. */
  @Input('bankAccounts') bankAccounts: any[] = [];
  @Input('penyegar') penyegar = 0;

  /** Tiga bulan ke depan, dibulatkan ke 13 pekan. */
  readonly PEKAN = 13;

  readonly saldoSekarang = signal<number | null>(null);
  readonly rencana = signal<any[]>([]);
  readonly memuat = signal(false);

  /**
   * 403 = divisinya tidak memegang `bank`.
   *
   * Rute `dashboard/cash-position` dijaga `bank:read`, bukan izin dasbor —
   * yang dikembalikannya saldo rekening. Yang tidak berhak tidak melihat
   * kartunya sama sekali; kalender di atasnya tetap utuh.
   */
  readonly terkunci = signal(false);

  /**
   * Tidak ada satu pun rekening yang dicentang.
   *
   * Dibedakan dari "tidak ada rencana": yang ini bukan keadaan kas, melainkan
   * saringan yang menutup semuanya. Menggambar grafik untuk keadaan ini
   * berarti menebak — dan tebakan server adalah SELURUH rekening, yang
   * kebalikan dari yang dimaksud.
   */
  readonly tanpaRekening = signal(false);

  /**
   * Panelnya sedang terbuka. Tertutup secara bawaan — dan itu disengaja.
   *
   * Yang dijawab kartu ini pertanyaan yang tidak ditanyakan setiap kali
   * kalender dibuka. Terbuka secara bawaan, ia menarik dua permintaan dan
   * menggeser seluruh halaman ke bawah untuk setiap orang yang sebenarnya
   * cuma mau melihat bulan ini.
   */
  readonly dibuka = signal(false);

  /**
   * Datanya sudah tidak sesuai dengan saringan yang sekarang.
   *
   * Saat panelnya tertutup, perubahan rekening atau bulan TIDAK langsung
   * menarik ulang — ditandai saja, lalu ditarik pada saat dibuka. Menarik
   * ulang untuk panel yang tidak terlihat berarti satu permintaan tiap kali
   * orang mencentang rekening, dan tidak ada yang melihat hasilnya.
   */
  private basi = true;

  ngOnChanges(_: SimpleChanges): void {
    this.basi = true;
    if (this.dibuka()) this.muat();
  }

  onBuka(): void {
    this.dibuka.set(true);
    if (this.basi) this.muat();
  }

  onTutup(): void {
    this.dibuka.set(false);
  }

  private hariIni(): string {
    const d = new Date();
    const dua = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}`;
  }

  /**
   * Menarik KEDUA sumbernya sekaligus, dan menyetel keduanya BERSAMAAN.
   *
   * Sebelumnya dua langganan terpisah, dan `memuat` hanya mengikuti yang
   * kedua. Saldo dan rencana karena itu tiba pada saat yang berbeda, dan
   * grafiknya digambar ulang di antaranya: sekali dengan saldo awal nol,
   * sekali lagi setelah saldonya datang. Sumbu Y-nya berubah skala di antara
   * keduanya, jadi seluruh garisnya melompat — terlihat seperti kedipan, dan
   * tidak ada galat apa pun yang menyebabkannya.
   *
   * `forkJoin` menunggu keduanya. Dua `set` pada akhir berada dalam satu
   * putaran deteksi perubahan, jadi grafiknya digambar SEKALI, sudah utuh.
   */
  private muat(): void {
    this.memuat.set(true);
    this.basi = false;

    const mulai = this.hariIni();
    const akhir = tambahPekan(seninPekan(mulai), this.PEKAN);

    const idRekening = (this.bankAccounts ?? [])
      .filter((x) => x?.selected)
      .map((x) => x.id);

    /*
     * TIDAK ADA rekening yang dicentang: berhenti, jangan menebak.
     *
     * Daftar kosong dikirim sebagai parameter yang HILANG SAMA SEKALI —
     * `HttpParams` membuang larik kosong — dan server memperlakukan penyaring
     * yang tidak ada sebagai "seluruh rekening". Jadi mencentang nol rekening
     * justru menghasilkan angka TERBESAR yang mungkin, termasuk deposito dan
     * escrow yang sengaja dikecualikan dari kalender.
     *
     * Itu kebalikan dari yang dimaksud siapa pun, dan tidak ada apa pun di
     * layar yang menunjukkannya.
     */
    if (!idRekening.length) {
      this.tanpaRekening.set(true);
      this.saldoSekarang.set(null);
      this.rencana.set([]);
      this.memuat.set(false);
      return;
    }
    this.tanpaRekening.set(false);

    forkJoin({
      posisi: this.api
        .get('dashboard/cash-position', { bankAccounts: idRekening })
        .pipe(
          // Galatnya diubah menjadi nilai supaya `forkJoin` tidak gugur
          // seluruhnya; 403 tetap dibedakan, karena itu yang menentukan
          // kartunya disembunyikan atau tidak.
          catchError((err: any) => of({ __galat: true, status: err?.status })),
        ),
      /*
       * Rentangnya dimulai dari SENIN pekan ini, bukan dari hari ini.
       *
       * Rencana yang jatuh Senin-kemarin sementara hari ini Rabu tetap masuk
       * pekan pertama — dan kalau rentang permintaannya mulai hari ini, baris
       * itu tidak pernah terambil. Saringan "terlewat" di `titikProyeksi` hanya
       * dapat memindahkan baris yang memang ada di tangannya.
       */
      rencana: this.planService
        /*
         * Rekening yang SAMA dengan yang dipakai saldonya.
         *
         * Dulu tidak disaring sama sekali: saldonya dari rekening yang
         * dicentang, rencananya dari seluruh rekening. Dua sisi dari satu
         * perhitungan memakai kumpulan rekening yang berbeda — dan hasilnya
         * tetap angka yang masuk akal, jadi tidak ada yang curiga.
         */
        .rentang(seninPekan(mulai), akhir, '', idRekening)
        .pipe(catchError(() => of({ data: [] }))),
    }).subscribe(({ posisi, rencana }: any) => {
      if (posisi?.__galat) {
        this.terkunci.set(posisi.status === 403);
        this.saldoSekarang.set(null);
      } else {
        this.terkunci.set(false);
        this.saldoSekarang.set(Number(posisi?.totalBalance) || 0);
      }

      this.rencana.set(Array.isArray(rencana?.data) ? rencana.data : []);
      this.memuat.set(false);
    });
  }

  readonly titik = computed<TitikProyeksi[]>(() =>
    titikProyeksi(
      this.rencana(),
      this.saldoSekarang() ?? 0,
      this.hariIni(),
      this.PEKAN,
    ),
  );

  readonly adaRencana = computed(() =>
    this.rencana().some((r) => r?.status === 'rencana'),
  );

  readonly totalKeluar = computed(() =>
    this.titik().reduce((a, x) => a + x.keluar, 0),
  );
  readonly totalMasuk = computed(() =>
    this.titik().reduce((a, x) => a + x.masuk, 0),
  );

  /** Tanggal titik jangkar — dicetak di kartu supaya dapat dicocokkan. */
  readonly tanggalJangkar = computed<string>(() => this.titik()[0]?.label ?? '');

  /**
   * Rekening yang ikut dihitung, untuk dicetak di kartunya.
   *
   * DASAR perhitungan disebut di muka. Kartu ini dan kisi di atasnya memakai
   * saringan rekening yang sama, dan satu-satunya cara memastikannya bagi yang
   * membacanya adalah kalau kartunya mengatakannya.
   */
  readonly rekeningDipakai = computed<string>(() => {
    const dipilih = (this.bankAccounts ?? []).filter((x) => x?.selected);
    const semua = (this.bankAccounts ?? []).length;
    if (!semua || dipilih.length === semua) return '';
    return dipilih
      .map((x) => x?.bankName ?? x?.bankAccountName ?? '-')
      .join(', ');
  });

  /** Saldo TERENDAH sepanjang proyeksi, bukan saldo di ujungnya. */
  readonly titikTerendah = computed<TitikProyeksi | null>(() => {
    // Yang dicari titik terendah PROYEKSINYA; kas hari ini sudah punya
    // KPI-nya sendiri di sebelah, dan menampilkannya dua kali saat ia
    // kebetulan yang terendah membuat kartunya menyebut satu angka sebagai
    // dua hal berbeda.
    const t = this.titik().filter((x) => !x.sekarang);
    if (!t.length) return null;
    return t.reduce((a, b) => (b.saldo < a.saldo ? b : a));
  });

  /**
   * Pekan pertama saldonya menembus nol.
   *
   * Saldo di UJUNG proyeksi dapat kembali positif setelah tagihan cair,
   * sementara kasnya sempat minus di tengah jalan — dan yang minus di tengah
   * itulah yang harus dibereskan lebih dulu.
   */
  readonly pekanMinusPertama = computed<string | null>(() => {
    // Titik "hari ini" tidak ikut: ia kas sungguhan, bukan proyeksi. Kas yang
    // sudah minus hari ini adalah keadaan, bukan peringatan tentang masa depan.
    const t = this.titik().find((x) => !x.sekarang && x.saldo < 0);
    return t ? t.label : null;
  });

  /** Rencana yang jatuh di LUAR jangkauan tiga bulan. */
  readonly diLuarJangkauan = computed(() => {
    const t = this.titik();
    if (!t.length) return 0;
    const akhir = t[t.length - 1].tanggal;
    /*
     * Dibandingkan TANGGALNYA langsung, bukan Senin pekannya.
     *
     * `seninPekan(tgl) > akhir` menggeser perbandingannya sampai enam hari,
     * sehingga rencana pada pekan terakhir yang SUDAH ikut digambar tetap
     * terhitung sebagai "di luar jangkauan" — angkanya lalu menuduh ada
     * rencana yang hilang padahal tidak.
     */
    return this.rencana().filter((r) => {
      if (r?.status !== 'rencana') return false;
      const tgl = String(r?.date ?? '').slice(0, 10);
      return /^\d{4}-\d{2}-\d{2}$/.test(tgl) && tgl > akhir;
    }).length;
  });

  readonly data = computed<ChartData<'line'>>(() => {
    const t = this.titik();
    return {
      labels: t.map((x) => x.label),
      datasets: [
        {
          label: this.translate.instant('proyeksiKas.seriBalance'),
          data: t.map((x) => x.saldo),
          borderColor: '#154dec',
          backgroundColor: 'rgba(21, 77, 236, 0.10)',
          borderWidth: 2.5,
          fill: true,
          // Lurus, sama seperti grafik arus kas proyek: segmen lurus tidak
          // dapat melampaui kedua ujungnya, jadi tidak ada nilai yang
          // digambar tetapi tidak pernah direncanakan.
          tension: 0,
          /*
           * TITIKNYA TIDAK DIGAMBAR, tetapi tetap dapat disentuh.
           *
           * Sejak per hari, ada 91 titik pada lebar yang sama. Bulatan 2px
           * pada tiap titik menyatu menjadi pita tebal dan bentuk garisnya —
           * satu-satunya yang dibaca dari grafik ini — tertutup olehnya.
           *
           * `pointHitRadius` dipertahankan supaya tooltip tetap menangkap
           * tanggal terdekat; yang dibuang gambarnya, bukan sasarannya.
           */
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHitRadius: 8,
        },
      ],
    };
  });

  readonly opsi: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => rupiah(ctx.parsed.y),
        },
      },
    },
    scales: {
      x: {
        /*
         * Label tanggal TIDAK dimiringkan.
         *
         * Dengan 91 titik harian, Chart.js akan memutar labelnya sampai tegak
         * begitu ruangnya kurang — dan label tegak memakan sepertiga tinggi
         * grafiknya. `maxRotation: 0` membuatnya MELEWATI label yang tidak
         * muat alih-alih memutarnya.
         *
         * Yang hilang cuma tulisannya, bukan titiknya: tooltip tetap menyebut
         * tanggal persisnya, dan bentuk garislah yang dibaca dari sumbu ini.
         */
        ticks: { maxRotation: 0, autoSkip: true },
      },
      y: {
        // TIDAK dikunci mulai nol — saldo yang menembus nol justru yang dicari.
        ticks: {
          callback: (v) => nominalSingkat(v),
        },
        grid: {
          color: (ctx: any) =>
            ctx.tick?.value === 0 ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.06)',
        },
      },
    },
  };
}
