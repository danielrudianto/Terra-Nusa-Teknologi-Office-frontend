import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { firstValueFrom } from 'rxjs';

import { ApiService } from 'src/app/services/api.service';
import { ServerMessageService } from 'src/app/services/server-message.service';
import { HeaderTitleComponent } from 'src/app/components/header-title/header-title.component';
import { pastikanChart, rupiah } from 'src/app/helpers/chart-dasar.helper';
import { uangDokumen } from 'src/app/helpers/uang.helper';

/*
 * chart.js v4 TIDAK mendaftarkan apa pun sendiri, dan pendaftarannya dipanggil
 * di tingkat MODUL tiap komponen grafik — bukan sekali di `app.config`.
 *
 * Sebabnya pendaftaran itu berlaku se-aplikasi: begitu satu halaman grafik
 * pernah dibuka, grafik di halaman lain ikut jalan. Jadi komponen yang lupa
 * mendaftarkannya tetap tampak benar bila diuji sesudah membuka halaman grafik
 * lain — dan salah hanya bagi orang yang membuka halaman ini lebih dulu. Yang
 * dilihatnya kanvas KOSONG: tingginya sesuai CSS, tanpa galat di layar maupun
 * konsol, dan build tetap bersih.
 */
pastikanChart();

/** Satu baris ember umur/tempo yang digambar sebagai batang. */
interface Ember {
  kunci: string;
  label: string;
  nilai: number;
  /** Ember ini yang paling mendesak — diwarnai berbeda. */
  mendesak?: boolean;
}

@Component({
  selector: 'app-posisi-keuangan',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatIconModule,
    MatProgressBarModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTooltipModule,
    TranslateModule,
    HeaderTitleComponent,
    BaseChartDirective,
  ],
  templateUrl: './posisi-keuangan.component.html',
  styleUrl: './posisi-keuangan.component.scss',
})
export class PosisiKeuanganComponent {
  private readonly api = inject(ApiService);
  private readonly translate = inject(TranslateService);
  private readonly pesanServer = inject(ServerMessageService);

  readonly data = signal<any | null>(null);
  readonly memuat = signal(false);
  readonly galat = signal('');

  /*
   * Akurasi rencana dimuat TERPISAH, dan kegagalannya tidak menjatuhkan
   * halaman.
   *
   * Ia empat kueri agregasi lintas bulan; posisi kas di atasnya tidak ada
   * hubungannya dengan itu. Satu jalan keluar untuk keduanya berarti sebuah
   * kegagalan di agregasi membuat angka kas ikut hilang — dan yang membuka
   * halaman ini membukanya untuk angka kas.
   */
  readonly akurasi = signal<any | null>(null);
  readonly memuatAkurasi = signal(false);
  readonly galatAkurasi = signal('');
  readonly mundur = signal(5);

  readonly pilihanMundur = [2, 5, 11];

  constructor() {
    void this.muat();
    void this.muatAkurasi();
  }

  // ------------------------------------------------------------------
  // Pengambilan
  // ------------------------------------------------------------------

  async muat(): Promise<void> {
    this.memuat.set(true);
    this.galat.set('');
    try {
      const res = await firstValueFrom(this.api.get('finance-status', {}));
      this.data.set(res);
    } catch (e) {
      this.data.set(null);
      this.galat.set(this.pesanServer.terjemahkan(e));
    } finally {
      this.memuat.set(false);
    }
  }

  async muatAkurasi(): Promise<void> {
    this.memuatAkurasi.set(true);
    this.galatAkurasi.set('');
    try {
      const res = await firstValueFrom(
        this.api.get('finance-status/akurasi-rencana', {
          mundur: this.mundur(),
        }),
      );
      this.akurasi.set(res);
    } catch (e) {
      this.akurasi.set(null);
      this.galatAkurasi.set(this.pesanServer.terjemahkan(e));
    } finally {
      this.memuatAkurasi.set(false);
    }
  }

  gantiMundur(nilai: number): void {
    this.mundur.set(Number(nilai) || 5);
    void this.muatAkurasi();
  }

  // ------------------------------------------------------------------
  // Angka
  // ------------------------------------------------------------------

  uang(n: unknown): string {
    return 'Rp ' + uangDokumen(n);
  }

  /**
   * Quick ratio, atau tanda pisah bila TIDAK ADA utang usaha.
   *
   * Server mengirim `null` untuk keadaan itu, dan `null` di sini berarti
   * rasionya tak terhingga — keadaan terbaik, bukan terburuk. Mencetaknya
   * sebagai "0,00" akan membacanya persis terbalik.
   */
  rasio(): string {
    const q = this.data()?.quickRatio;
    if (q === null || q === undefined) return '—';
    return Number(q).toFixed(2);
  }

  /** Rasio di bawah 1 berarti kewajiban lancar melampaui yang mencairkannya. */
  rasioKurang(): boolean {
    const q = this.data()?.quickRatio;
    return q !== null && q !== undefined && Number(q) < 1;
  }

  readonly emberPiutang = computed<Ember[]>(() => {
    const u = this.data()?.piutang?.umur || {};
    return [
      { kunci: '0-30', label: 'posisiKeuangan.umur0', nilai: +u['0-30'] || 0 },
      { kunci: '31-60', label: 'posisiKeuangan.umur31', nilai: +u['31-60'] || 0 },
      { kunci: '61-90', label: 'posisiKeuangan.umur61', nilai: +u['61-90'] || 0 },
      {
        kunci: '90+',
        label: 'posisiKeuangan.umur90',
        nilai: +u['90+'] || 0,
        mendesak: true,
      },
    ];
  });

  readonly emberUtang = computed<Ember[]>(() => {
    const t = this.data()?.utangUsaha?.tempo || {};
    return [
      {
        kunci: 'lewat',
        label: 'posisiKeuangan.tempoLewat',
        nilai: +t['lewat'] || 0,
        mendesak: true,
      },
      { kunci: '0-30', label: 'posisiKeuangan.tempo0', nilai: +t['0-30'] || 0 },
      { kunci: '31-60', label: 'posisiKeuangan.tempo31', nilai: +t['31-60'] || 0 },
      { kunci: '60+', label: 'posisiKeuangan.tempo60', nilai: +t['60+'] || 0 },
    ];
  });

  /**
   * Lebar batang, sebagai persen terhadap nilai TERBESAR di daftarnya.
   *
   * Dibagi terhadap yang terbesar, bukan terhadap totalnya: yang dicari mana
   * yang menonjol, dan pembagian terhadap total membuat seluruh batang
   * menjadi sangat pendek begitu daftarnya panjang.
   *
   * MENERIMA ANGKA, BUKAN OBJEK — dan itu perbaikan, bukan selera.
   *
   * Versi sebelumnya menerima objek lalu membaca `x.nilai`. Daftar kewajiban
   * menyimpan nilainya pada `total`, bukan `nilai`, sehingga `x.nilai`
   * `undefined`, `Math.abs(undefined)` menjadi NaN, dan `Math.max` atas NaN
   * juga NaN. Penjaga `puncak <= 0` TIDAK menangkapnya: setiap perbandingan
   * dengan NaN bernilai salah. Yang keluar `width: NaN%` — CSS yang tidak
   * sah, diabaikan peramban, dan SELURUH batang tergambar penuh.
   *
   * Tiga baris bernilai 3 juta, 64 juta, dan 101 juta karena itu tampil sama
   * panjang. Tidak ada galat di layar maupun konsol.
   *
   * Ujinya pun sempat lolos — ia memanggil fungsi ini dengan bentuk objek
   * yang benar, yaitu bentuk yang tidak pernah dipakai kode aslinya.
   * Menerima angka menutup seluruh kelas kekeliruan itu: tidak ada nama
   * bidang yang dapat meleset.
   */
  /** Nilai-nilai ember, untuk dijadikan pembanding lebar batangnya. */
  nilaiEmber(daftar: Ember[]): number[] {
    return daftar.map((x) => x.nilai);
  }

  /** Nilai kewajiban lain; bidangnya `total`, BUKAN `nilai` — itu sumber bugnya. */
  nilaiKewajibanLain(): number[] {
    return this.rincianKewajibanLain().map((x: any) => x.total);
  }

  lebar(nilai: unknown, semua: unknown[]): number {
    const n = Math.abs(Number(nilai));
    const angka = semua
      .map((x) => Math.abs(Number(x)))
      .filter((x) => Number.isFinite(x));
    const puncak = angka.length ? Math.max(...angka) : 0;
    if (!Number.isFinite(n) || puncak <= 0) return 0;
    return Math.round((n / puncak) * 100);
  }

  // ------------------------------------------------------------------
  // Grafik akurasi rencana
  // ------------------------------------------------------------------

  readonly grafik = computed<ChartData<'bar'>>(() => {
    const baris: any[] = this.akurasi()?.bulanan || [];
    return {
      labels: baris.map((b) => this.labelBulan(b.bulan)),
      datasets: [
        {
          label: this.translate.instant('posisiKeuangan.rencanaKeluar'),
          data: baris.map((b) => Number(b.rencanaKeluar) || 0),
          backgroundColor: 'rgba(229, 72, 77, 0.35)',
          borderColor: 'rgba(229, 72, 77, 0.9)',
          borderWidth: 1,
        },
        {
          label: this.translate.instant('posisiKeuangan.aktualKeluar'),
          data: baris.map((b) => Number(b.aktualKeluar) || 0),
          backgroundColor: 'rgba(229, 72, 77, 0.9)',
          borderColor: 'rgba(229, 72, 77, 1)',
          borderWidth: 1,
        },
        {
          label: this.translate.instant('posisiKeuangan.rencanaMasuk'),
          data: baris.map((b) => Number(b.rencanaMasuk) || 0),
          backgroundColor: 'rgba(48, 164, 108, 0.35)',
          borderColor: 'rgba(48, 164, 108, 0.9)',
          borderWidth: 1,
        },
        {
          label: this.translate.instant('posisiKeuangan.aktualMasuk'),
          data: baris.map((b) => Number(b.aktualMasuk) || 0),
          backgroundColor: 'rgba(48, 164, 108, 0.9)',
          borderColor: 'rgba(48, 164, 108, 1)',
          borderWidth: 1,
        },
      ],
    };
  });

  readonly opsi: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 12 } },
      tooltip: {
        callbacks: {
          /*
           * Lewat `rupiah()`, bukan `toLocaleString` langsung.
           *
           * `toLocaleString('id-ID')` menampilkan sampai tiga desimal, jadi
           * galat pembulatan `float` bocor ke layar sebagai
           * "Rp 535.401.957,759" di sebelah "535.401.958" pada kartu KPI.
           */
          label: (ctx) => `${ctx.dataset.label}: ${rupiah(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      x: { ticks: { maxRotation: 0, autoSkip: true } },
      y: {
        beginAtZero: true,
        ticks: { callback: (v) => rupiah(Number(v)) },
      },
    },
  };

  /** "2026-09" -> "Sep 2026". */
  labelBulan(kunci: string): string {
    const [t, b] = String(kunci || '').split('-');
    const bulan = Number(b);
    if (!t || !Number.isFinite(bulan)) return kunci;
    const nama = [
      'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
      'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
    ];
    return `${nama[bulan - 1] ?? b} ${t}`;
  }

  /**
   * Debt to equity, atau tanda pisah bila ekuitasnya nol atau minus.
   *
   * Server mengirim `null` untuk keadaan itu — dan `null` di sini BUKAN nol.
   * `580 / -120` adalah -4,83: angka yang terbaca terukur, pada keadaan yang
   * justru paling perlu dibicarakan orang. Tanda pisah memaksa
   * pertanyaannya diajukan.
   */
  dte(): string {
    const v = this.data()?.neraca?.debtToEquity;
    if (v === null || v === undefined) return '—';
    return Number(v).toFixed(2);
  }

  /** Ekuitas minus — keadaan yang harus terlihat, bukan diperhalus. */
  ekuitasMinus(): boolean {
    return Number(this.data()?.neraca?.ekuitas ?? 0) < 0;
  }

  /**
   * Acuan D/E untuk konstruksi.
   *
   * CFMA (Construction Financial Management Association), konstruksi Amerika,
   * lintas jenis usaha: sehat 0,5–1,5; penjamin (surety) lebih menyukai di
   * bawah 1,0.
   *
   * ORIENTASI, BUKAN VONIS. Ia tidak disusun dari subkontraktor MEP di
   * Indonesia, dan pitanya dicetak menempel pada angkanya supaya yang
   * membaca dapat menimbangnya sendiri — bukan disembunyikan lalu keluar
   * sebagai kata "sehat".
   */
  readonly acuanDte = { bawah: 0.5, atas: 1.5, sumber: 'CFMA' };

  /** Kewajiban lain, per jenis, untuk dirinci di layar. */
  readonly rincianKewajibanLain = computed(() => {
    const r = this.data()?.kewajibanLain?.rincian || {};
    return [
      { kunci: 'beban', label: 'posisiKeuangan.kwBeban', ...(r['beban'] || {}) },
      {
        kunci: 'reimbursement',
        label: 'posisiKeuangan.kwReimbursement',
        ...(r['reimbursement'] || {}),
      },
      { kunci: 'gaji', label: 'posisiKeuangan.kwGaji', ...(r['gaji'] || {}) },
    ].map((x: any) => ({
      ...x,
      total: Number(x.total) || 0,
      jumlahDokumen: Number(x.jumlahDokumen) || 0,
    }));
  });

  /**
   * Quick ratio versi LAMA — hanya untuk menjelaskan penurunannya.
   *
   * Angkanya turun dibanding yang sempat dilihat orang, karena penyebutnya
   * kini memuat beban, reimbursement, dan gaji yang belum cair. Tanpa
   * menyebut selisihnya, siapa pun yang mencatat angka minggu lalu akan
   * mengira ada yang rusak — dan angka yang dicurigai berhenti dipakai, yang
   * lebih buruk daripada angka yang salah.
   */
  rasioLama(): string {
    const v = this.data()?.selisihVersiLama?.quickRatioVersiLama;
    if (v === null || v === undefined) return '—';
    return Number(v).toFixed(2);
  }

  /** Selisihnya memang ada — spanduk penjelasnya hanya tampil bila begitu. */
  adaSelisih(): boolean {
    return Number(this.data()?.selisihVersiLama?.tambahan ?? 0) > 0;
  }

  /**
   * Daftar rasio siap gambar: angka, letaknya terhadap pita, dan ARTINYA.
   *
   * Versi sebelumnya hanya mencetak angka beserta pitanya sebagai tulisan
   * kecil, dengan alasan tidak mau memvonis. Akibatnya layar berhenti
   * menjawab pertanyaan yang membuat orang membukanya: "2,03 itu bagus atau
   * tidak?" Peringatannya lebih panjang dan lebih menonjol daripada
   * jawabannya.
   *
   * Yang diperbaiki BUKAN dengan mencetak kata SEHAT pada perusahaannya —
   * label seperti itu membuat orang berhenti bertanya. Yang ditambahkan:
   * di mana angkanya berdiri, apa ARTINYA berada di situ, dan APA
   * RISIKONYA. Ketiganya tentang angkanya, bukan tentang perusahaannya.
   */
  readonly daftarRasio = computed(() => {
    const d = this.data();
    if (!d) return [];

    const nilai: Record<string, any> = {
      quickRatio: d.quickRatio,
      debtToEquity: d.neraca?.debtToEquity,
      dso: d.rasio?.dso,
      dpo: d.rasio?.dpo,
      siklusModalKerja: d.rasio?.siklusModalKerja,
      piutangTua: d.rasio?.piutangTua,
      konsentrasiPiutang: d.rasio?.konsentrasiPiutang,
      marjinKotor: d.rasio?.marjinKotor,
      marjinBersih: d.rasio?.marjinBersih,
      rasioOverhead: d.rasio?.rasioOverhead,
      roe: d.rasio?.roe,
    };

    /** Bagaimana tiap rasio dicetak: angka biasa, hari, atau persen. */
    const bentuk: Record<string, 'angka' | 'hari' | 'persen'> = {
      quickRatio: 'angka',
      debtToEquity: 'angka',
      dso: 'hari',
      dpo: 'hari',
      siklusModalKerja: 'hari',
      piutangTua: 'persen',
      konsentrasiPiutang: 'persen',
      marjinKotor: 'persen',
      marjinBersih: 'persen',
      rasioOverhead: 'persen',
      roe: 'persen',
    };

    return Object.keys(nilai)
      .filter((k) => nilai[k] !== null && nilai[k] !== undefined)
      .map((kode) => {
        const pita = d.ambang?.[kode] || {};
        const nilaiPenilaian = d.penilaian?.[kode] || {};
        return {
          kode,
          nilai: Number(nilai[kode]),
          teks: this.cetak(Number(nilai[kode]), bentuk[kode]),
          bentuk: bentuk[kode],
          posisi: nilaiPenilaian.posisi as string | null,
          baik: nilaiPenilaian.baik as boolean | null,
          pita,
          pitaTeks: this.pitaTeks(pita, bentuk[kode]),
          /*
           * Kunci arti disusun dari kode + letaknya. Yang belum punya
           * terjemahan jatuh ke keterangan umum rasio itu, BUKAN ke teks
           * kosong — baris tanpa penjelasan mengembalikan persoalan yang
           * sedang diperbaiki.
           */
          kunciArti: `posisiKeuangan.arti.${kode}.${
            nilaiPenilaian.posisi || 'umum'
          }`,
          kunciArtiCadangan: `posisiKeuangan.arti.${kode}.umum`,
        };
      });
  });

  /** Baris hitungan mana yang sedang dibuka. */
  readonly hitunganTerbuka = signal<Record<string, boolean>>({});

  bukaHitungan(kode: string): void {
    this.hitunganTerbuka.update((s) => ({ ...s, [kode]: !s[kode] }));
  }

  terbuka(kode: string): boolean {
    return !!this.hitunganTerbuka()[kode];
  }

  /**
   * Penyusun satu rasio: pembilang, penyebut, dan rinciannya.
   *
   * Rasio yang tidak dapat ditelusuri ke komponennya adalah rasio yang hanya
   * dapat DIPERCAYA — dan yang dipercaya tanpa dapat dicek akan ditanyakan
   * berulang kali, sampai yang menjawab membuka laporan lain untuk
   * membuktikannya. "Overhead 18,5%" tidak berguna sampai terlihat 18,5%
   * dari apa, dan isinya apa saja.
   */
  hitungan(kode: string): any | null {
    return this.data()?.hitungan?.[kode] || null;
  }

  /** Rincian penyusun; daftar kosong bila memang tidak dirinci. */
  rincian(sisi: any): any[] {
    return Array.isArray(sisi?.rincian) ? sisi.rincian : [];
  }

  /** Label komponen: terjemahan bila ada, apa adanya bila tidak. */
  labelKomponen(x: any): string {
    const kunci = 'posisiKeuangan.komponen.' + (x?.kategori ?? '');
    const t = this.translate.instant(kunci);
    if (t && t !== kunci) return t;
    return x?.label || x?.kategori || '—';
  }

  /** Angka rasio sesuai bentuknya. */
  cetak(n: number, bentuk: 'angka' | 'hari' | 'persen'): string {
    if (bentuk === 'persen') {
      return (n * 100).toFixed(1) + '%';
    }
    if (bentuk === 'hari') {
      return Math.round(n).toLocaleString('id-ID');
    }
    return n.toFixed(2);
  }

  /** "0,5–1,5" / "maks 95" / "min 15,0%" — sisi yang kosong tidak dicetak. */
  pitaTeks(pita: any, bentuk: 'angka' | 'hari' | 'persen'): string {
    const b = pita?.bawah;
    const a = pita?.atas;
    const f = (x: number) => this.cetak(Number(x), bentuk);
    if (b !== null && b !== undefined && a !== null && a !== undefined) {
      return `${f(b)}–${f(a)}`;
    }
    if (a !== null && a !== undefined) {
      return this.translate.instant('posisiKeuangan.maks') + ' ' + f(a);
    }
    if (b !== null && b !== undefined) {
      return this.translate.instant('posisiKeuangan.min') + ' ' + f(b);
    }
    return '—';
  }

  /** Terjemahan arti, dengan cadangan bila letaknya belum punya teks. */
  arti(r: any): string {
    const utama = this.translate.instant(r.kunciArti);
    if (utama && utama !== r.kunciArti) return utama;
    const cadangan = this.translate.instant(r.kunciArtiCadangan);
    return cadangan && cadangan !== r.kunciArtiCadangan ? cadangan : '';
  }

  /** Disposisi satu status; nol bila statusnya tidak muncul sama sekali. */
  disposisi(status: string): { jumlah: number; total: number } {
    const d = this.akurasi()?.disposisi?.[status];
    return {
      jumlah: Number(d?.jumlah) || 0,
      total: Number(d?.total) || 0,
    };
  }

  /** Total seluruh rencana pada periode — penyebut bagi persentasenya. */
  readonly totalRencana = computed(() => {
    const d = this.akurasi()?.disposisi || {};
    return Object.values(d).reduce(
      (a: number, x: any) => a + (Number(x?.jumlah) || 0),
      0,
    );
  });

  /**
   * Persentase satu status terhadap seluruh rencana periode itu.
   *
   * `null` bila belum ada rencana sama sekali — BUKAN nol. "0% terpakai" pada
   * perusahaan yang memang belum pernah membuat rencana adalah tuduhan, bukan
   * pengukuran.
   */
  persen(status: string): number | null {
    const total = this.totalRencana();
    if (!total) return null;
    return Math.round((this.disposisi(status).jumlah / total) * 100);
  }
}
