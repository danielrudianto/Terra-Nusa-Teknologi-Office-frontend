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
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { firstValueFrom } from 'rxjs';

import { RouterLink } from '@angular/router';

import { ApiService } from 'src/app/services/api.service';
import { PermissionService } from 'src/app/services/permission.service';
import { KpiAntreanComponent } from '../kpi/antrean/kpi-antrean.component';
import { KpiKinerjaComponent } from '../kpi/kinerja/kpi-kinerja.component';
import { ServerMessageService } from 'src/app/services/server-message.service';
import { HeaderTitleComponent } from 'src/app/components/header-title/header-title.component';
import { RasioDialogComponent } from './rasio-dialog/rasio-dialog.component';
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

/**
 * Bagaimana tiap rasio dicetak: angka biasa, hari, atau persen.
 *
 * DI TINGKAT MODUL, bukan di dalam `daftarRasio()`. Petak rasio dan grafik
 * riwayat menggambar angka yang SAMA; bila masing-masing memegang petanya
 * sendiri, satu tambahan rasio di satu tempat membuat yang lain mencetak
 * "0,15" di sebelah "15,0%" untuk rasio yang sama, pada halaman yang sama.
 */
export const BENTUK_RASIO: Record<string, 'angka' | 'hari' | 'persen'> = {
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
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTooltipModule,
    TranslateModule,
    HeaderTitleComponent,
    BaseChartDirective,
    RouterLink,
    KpiKinerjaComponent,
    KpiAntreanComponent,
  ],
  templateUrl: './posisi-keuangan.component.html',
  styleUrl: './posisi-keuangan.component.scss',
})
export class PosisiKeuanganComponent {
  private readonly api = inject(ApiService);
  private readonly dialog = inject(MatDialog);
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

  /*
   * RIWAYAT RASIO — jalan keluar KETIGA, dan dimuat paling belakangan.
   *
   * Satu titik riwayat adalah delapan kueri; bawaannya dua belas titik.
   * Memuatnya bersama halaman berarti setiap orang yang cuma ingin melihat
   * saldo kas ikut membayar sembilan puluh enam kueri. Karena itu ia baru
   * berangkat ketika panelnya DIBUKA, dan hanya sekali.
   */
  readonly riwayat = signal<any | null>(null);
  readonly memuatRiwayat = signal(false);
  readonly galatRiwayat = signal('');
  readonly mundurRiwayat = signal(12);
  readonly rasioRiwayat = signal('quickRatio');

  readonly pilihanMundurRiwayat = [6, 12];

  /** Sudah pernah dibuka? Supaya membuka-tutup panel tidak memuat ulang. */
  private riwayatPernahDibuka = false;

  /**
   * Hasil riwayat per pilihan periode, disimpan selama halaman terbuka.
   *
   * Berpindah 12 bulan -> 6 bulan -> 12 bulan lagi adalah hal yang dilakukan
   * orang saat membaca grafiknya, dan tanpa simpanan ini setiap perpindahan
   * menghitung ulang seluruhnya dari dokumen. Perhitungan itu tidak murah
   * bahkan sesudah dibereskan, dan yang dibayar ulang adalah jawaban yang
   * sudah ada di tangan.
   *
   * Disimpan di MEMORI, bukan di peramban: angka keuangan perusahaan tidak
   * ditinggalkan di penyimpanan lokal, dan ia harus ikut hilang begitu
   * halamannya ditutup. Pita acuan yang diubah membuangnya — letak setiap
   * titik dihitung ulang terhadap pita yang baru.
   */
  private simpanan = new Map<number, any>();

  private readonly izin = inject(PermissionService);

  /**
   * Level minimum untuk membuka laba rugi.
   *
   * Angka yang SAMA dengan `minLevel` rute laba rugi dan dengan penjagaan
   * servernya. Disebut di tiga tempat memang tidak ideal, tetapi
   * menyembunyikan tautan berdasarkan tebakan lain — misalnya izin modul —
   * akan membuat kartunya muncul bagi orang yang tetap ditolak saat
   * menekannya.
   */
  private static readonly LEVEL_LABA_RUGI = 5;

  /** Kartu tautan laba rugi ditampilkan. */
  readonly bolehLabaRugi = computed<boolean>(
    () => this.izin.level() >= PosisiKeuanganComponent.LEVEL_LABA_RUGI,
  );

  /*
   * Dua panel KPI DIMUAT SAAT DIBUKA.
   *
   * Penandanya tidak pernah kembali ke `false`: menutup panelnya tidak
   * membuang datanya, jadi membuka lagi tidak memanggil server lagi.
   * Ini pola yang sama dengan `bukaRiwayat` di bawah.
   */
  readonly kinerjaDibuka = signal(false);
  readonly antreanDibuka = signal(false);

  bukaKinerja(): void {
    this.kinerjaDibuka.set(true);
  }

  bukaAntrean(): void {
    this.antreanDibuka.set(true);
  }

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

  /**
   * Dipanggil saat panel riwayat dibuka.
   *
   * Dijaga agar hanya memuat SEKALI: `(opened)` menyala setiap kali panelnya
   * dibuka, dan tanpa penjaga ini setiap buka-tutup melepas sembilan puluh
   * enam kueri lagi.
   */
  bukaRiwayat(): void {
    if (this.riwayatPernahDibuka) return;
    this.riwayatPernahDibuka = true;
    void this.muatRiwayat();
  }

  async muatRiwayat(paksa = false): Promise<void> {
    const periode = this.mundurRiwayat();

    const tersimpan = this.simpanan.get(periode);
    if (tersimpan && !paksa) {
      this.riwayat.set(tersimpan);
      this.galatRiwayat.set('');
      return;
    }

    this.memuatRiwayat.set(true);
    this.galatRiwayat.set('');
    try {
      const res = await firstValueFrom(
        this.api.get('finance-status/riwayat', { mundur: periode }),
      );
      // Hanya jawaban yang BERHASIL yang disimpan. Menyimpan kegagalan
      // berarti mencoba lagi tidak akan pernah menyentuh server.
      this.simpanan.set(periode, res);
      this.riwayat.set(res);
    } catch (e) {
      this.riwayat.set(null);
      this.galatRiwayat.set(this.pesanServer.terjemahkan(e));
    } finally {
      this.memuatRiwayat.set(false);
    }
  }

  gantiMundurRiwayat(nilai: number): void {
    this.mundurRiwayat.set(Number(nilai) || 12);
    void this.muatRiwayat();
  }

  gantiRasioRiwayat(kode: string): void {
    // TIDAK memuat ulang: seluruh rasio sudah ada pada setiap titik, jadi
    // berganti rasio cuma berganti bidang yang digambar. Memanggil server
    // lagi di sini berarti sembilan puluh enam kueri untuk data yang sudah
    // ada di tangan.
    this.rasioRiwayat.set(String(kode || 'quickRatio'));
  }

  // ------------------------------------------------------------------
  // Angka
  // ------------------------------------------------------------------

  uang(n: unknown): string {
    // Spasi TAK-PUTUS: lihat `uangDokumenRp` untuk alasannya.
    return 'Rp\u00a0' + uangDokumen(n);
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

  // ------------------------------------------------------------------
  // Grafik riwayat rasio
  // ------------------------------------------------------------------

  /** Bentuk cetak rasio yang sedang dilihat. */
  private bentukRiwayat(): 'angka' | 'hari' | 'persen' {
    return BENTUK_RASIO[this.rasioRiwayat()] || 'angka';
  }

  /**
   * Nilai satu titik untuk rasio yang sedang dilihat, SUDAH diskalakan.
   *
   * Rasio berbentuk persen disimpan sebagai pecahan (0,15) dan dicetak
   * sebagai 15,0%. Grafiknya harus memakai skala yang sama dengan
   * sumbunya, jadi penskalaan dilakukan SEKALI di sini — bukan di sumbu,
   * bukan di tooltip, bukan di tabel. Tiga tempat berarti tiga peluang
   * untuk berselisih, dan yang berselisih di sini membuat garis dan
   * angkanya menyebut dua hal berbeda.
   */
  private angkaRiwayat(t: any): number | null {
    const v = t?.[this.rasioRiwayat()];
    if (v === null || v === undefined) return null;
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return this.bentukRiwayat() === 'persen' ? n * 100 : n;
  }

  /**
   * Rupiah, atau tanda pisah bila nilainya TIDAK ADA.
   *
   * `uang(null)` mencetak "Rp 0,00", dan nol di kolom kas berarti rekening
   * kosong — pernyataan yang sama sekali berbeda dari "saldo bulan itu tidak
   * dapat dibaca". Keduanya harus dapat dibedakan di tabel yang sama.
   */
  uangAtau(n: unknown): string {
    return n === null || n === undefined ? '—' : this.uang(n);
  }

  /** Ada titik yang saldo kasnya gagal disusun ulang? */
  adaKasTidakTerbaca(): boolean {
    const titik: any[] = this.riwayat()?.titik || [];
    return titik.some((t) => !!t?.kasTidakTerbaca);
  }

  /** Berapa bulan yang kasnya tidak terbaca — disebut angkanya. */
  jumlahKasTidakTerbaca(): number {
    const titik: any[] = this.riwayat()?.titik || [];
    return titik.filter((t) => !!t?.kasTidakTerbaca).length;
  }

  /** Nilai satu titik, sebagai teks — untuk tabel angka di bawah grafik. */
  nilaiRiwayat(t: any): string {
    const v = t?.[this.rasioRiwayat()];
    if (v === null || v === undefined) {
      /*
       * `—`, BUKAN nol.
       *
       * Titik kosong berarti rasionya tidak terdefinisi pada bulan itu:
       * tanpa kewajiban lancar, quick ratio tak terhingga; tanpa pendapatan,
       * DSO tidak ada. Mencetak "0" pada keadaan itu membacanya persis
       * terbalik — keadaan terbaik ditulis sebagai yang terburuk.
       */
      return '—';
    }
    return this.cetak(Number(v), this.bentukRiwayat());
  }

  /** Satu sisi pita acuan, pada skala yang sama dengan garisnya. */
  private ambangRiwayat(sisi: 'bawah' | 'atas'): number | null {
    const pita = this.riwayat()?.ambang?.[this.rasioRiwayat()];
    const v = pita?.[sisi];
    if (v === null || v === undefined) return null;
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return this.bentukRiwayat() === 'persen' ? n * 100 : n;
  }

  readonly grafikRiwayat = computed<ChartData<'line'>>(() => {
    const titik: any[] = this.riwayat()?.titik || [];
    const label = titik.map((t) => this.labelTanggal(t.tanggal));

    const set: any[] = [
      {
        label: this.translate.instant(
          'posisiKeuangan.namaRasio.' + this.rasioRiwayat(),
        ),
        data: titik.map((t) => this.angkaRiwayat(t)),
        borderColor: 'rgba(37, 99, 235, 1)',
        backgroundColor: 'rgba(37, 99, 235, 0.12)',
        borderWidth: 2,
        tension: 0.25,
        fill: true,
        pointRadius: 3,
        /*
         * `spanGaps: false` — bulan yang rasionya tidak terdefinisi
         * ditinggalkan PUTUS, bukan disambung.
         *
         * Disambung, garisnya menarik satu garis lurus melintasi bulan yang
         * datanya tidak ada, dan yang melihatnya membaca interpolasi itu
         * sebagai pengukuran.
         */
        spanGaps: false,
      },
    ];

    /*
     * Pita acuan digambar sebagai GARIS, bukan hanya disebut di teks.
     *
     * Angka rasio tanpa acuannya tidak dapat dinilai siapa pun yang bukan
     * orang keuangan — dan halaman ini justru dibuat untuk mereka.
     */
    const bawah = this.ambangRiwayat('bawah');
    const atas = this.ambangRiwayat('atas');
    if (bawah !== null) {
      set.push({
        label: this.translate.instant('posisiKeuangan.batasBawah'),
        data: label.map(() => bawah),
        borderColor: 'rgba(148, 163, 184, 0.9)',
        borderDash: [6, 4],
        borderWidth: 1,
        pointRadius: 0,
        fill: false,
      });
    }
    if (atas !== null) {
      set.push({
        label: this.translate.instant('posisiKeuangan.batasAtas'),
        data: label.map(() => atas),
        borderColor: 'rgba(148, 163, 184, 0.9)',
        borderDash: [2, 3],
        borderWidth: 1,
        pointRadius: 0,
        fill: false,
      });
    }

    return { labels: label, datasets: set };
  });

  readonly opsiRiwayat = computed<ChartConfiguration<'line'>['options']>(() => {
    const bentuk = this.bentukRiwayat();
    const cetakSumbu = (v: number) => {
      if (bentuk === 'persen') return v.toFixed(0) + '%';
      if (bentuk === 'hari') return Math.round(v).toLocaleString('id-ID');
      return v.toFixed(2);
    };
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12 } },
        tooltip: {
          callbacks: {
            label: (ctx: any) =>
              `${ctx.dataset.label}: ${cetakSumbu(Number(ctx.parsed.y))}`,
          },
        },
      },
      scales: {
        x: { ticks: { maxRotation: 0, autoSkip: true } },
        y: {
          /*
           * TIDAK dipaksa mulai dari nol.
           *
           * Quick ratio bergerak antara 0,9 dan 1,2; dipaksa dari nol,
           * seluruh pergerakannya menjadi satu garis mendatar di sepertiga
           * atas kanvas — dan perubahan yang justru dicari orang menjadi
           * tidak terlihat. Yang dibandingkan di sini bukan besaran uang,
           * melainkan posisinya terhadap pita acuan, dan pitanya ikut
           * digambar.
           */
          beginAtZero: false,
          ticks: { callback: (v: any) => cetakSumbu(Number(v)) },
        },
      },
    };
  });

  /** "Agu 2026" dari "2026-08-31". */
  labelTanggal(iso: string): string {
    const bagian = String(iso || '').split('-');
    if (bagian.length < 2) return String(iso || '');
    return this.labelBulan(`${bagian[0]}-${bagian[1]}`);
  }

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
   * ORIENTASI, BUKAN VONIS. Ia tidak disusun dari kontraktor pondasi di
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

    const bentuk = BENTUK_RASIO;

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

  /**
   * Buka rincian satu rasio sebagai DIALOG.
   *
   * Artinya, risikonya, dan hitungannya dipindah ke sini — di petaknya hanya
   * angka dan letaknya. Sebelas paragraf arti yang tergelar sekaligus
   * menenggelamkan hal yang justru dicari orang: membandingkan angkanya.
   */
  bukaRasio(r: any): void {
    this.dialog.open(RasioDialogComponent, {
      width: '640px',
      maxWidth: '95vw',
      autoFocus: false,
      data: {
        kode: r.kode,
        teks: r.teks,
        posisi: r.posisi,
        baik: r.baik,
        pitaTeks: r.pitaTeks,
        acuan: r.pita?.acuan ?? null,
        // Diselesaikan DI SINI, bukan di dialognya: cadangan kunci arti
        // sudah ada di `arti()`, dan menyalinnya ke dialog berarti dua
        // tempat yang harus sepakat soal kunci mana yang dipakai.
        arti: this.arti(r),
        hitungan: this.hitungan(r.kode),
        // Bentuk cetaknya ikut, karena kotak isian pita harus memakai
        // SKALA yang sama dengan yang dibaca orang: pita persen disimpan
        // sebagai pecahan (0,15) dan dibaca sebagai 15%.
        bentuk: BENTUK_RASIO[r.kode] || 'angka',
        // Pita dalam bentuk SIMPANANNYA, bukan teksnya: `pitaTeks` sudah
        // diformat ("maks 15,0%") dan tidak dapat dibaca balik menjadi
        // angka tanpa menebak.
        pita: r.pita ? { bawah: r.pita.bawah, atas: r.pita.atas } : null,
      },
    })
      .afterClosed()
      .subscribe((hasil: any) => {
        /*
         * PITA YANG BERUBAH MENGUBAH SELURUH HALAMAN, bukan satu petak.
         *
         * Letak "di dalam / di bawah / di atas acuan" dihitung di SERVER
         * untuk kesebelas rasio sekaligus. Menyegarkan petak yang barusan
         * diubah saja akan membiarkan yang lain menyebut letak yang sudah
         * tidak berlaku — dan tidak ada apa pun di layar yang menandainya.
         *
         * Riwayat ikut dimuat ulang HANYA bila sudah pernah dibuka: ia
         * menggambar pita acuan sebagai garis, jadi garisnya akan tertinggal
         * di tempat lama. Yang belum pernah dibuka tidak perlu dibangunkan
         * — sembilan puluh enam kueri untuk panel yang tertutup.
         */
        if (!hasil?.ambangBerubah) return;
        void this.muat();
        // Simpanan DIBUANG: letak tiap titik dihitung terhadap pita acuan,
        // dan pitanya baru saja berubah. Memakai simpanan lama berarti
        // grafiknya menggambar acuan baru di atas letak yang lama.
        this.simpanan.clear();
        if (this.riwayat()) void this.muatRiwayat(true);
      });
  }

  // ------------------------------------------------------------------
  // Kesimpulan
  // ------------------------------------------------------------------
  //
  // Seluruhnya disusun di SERVER dan datang sebagai KODE, bukan kalimat.
  // Yang dikerjakan di sini hanya menerjemahkan dan mengurutkan tampilannya.
  //
  // Sengaja begitu: kalimat yang disusun di peramban hanya pernah benar
  // dalam satu bahasa, dan gerbang levelnya — kalimat laba hanya untuk
  // level 5 — harus di server, sebab yang disaring di peramban tetap
  // terkirim ke sana dan tinggal dibuka di alat pengembang.

  kesimpulan(): any | null {
    return this.data()?.kesimpulan || null;
  }

  /** Kalimat pokoknya, sudah diterjemahkan beserta angkanya. */
  pokok(): string {
    const k = this.kesimpulan()?.pokok;
    if (!k?.kode) return '';
    const a = k.angka || {};
    return this.translate.instant('posisiKeuangan.pokok.' + k.kode, {
      ...a,
      // Nama rasio ikut diterjemahkan supaya kalimatnya berbunyi wajar,
      // bukan menyebut kode mentah seperti "quickRatio".
      teratas: a.teratas
        ? this.translate.instant('posisiKeuangan.namaRasio.' + a.teratas)
        : '',
      ekuitas: a.ekuitas !== undefined ? this.uang(a.ekuitas) : '',
    });
  }

  /**
   * Seberapa jauh sebuah butir berada di luar acuannya, sebagai persen.
   *
   * Disebutkan supaya urutannya dapat DIBANTAH: yang membaca daftar ini
   * berhak tahu kenapa satu butir berada di atas butir lain, dan "lewat
   * 200% dari batas" menjawabnya tanpa perlu membuka kode.
   */
  lewatAcuan(butir: any): string {
    const j = Number(butir?.jarakDariPita);
    if (!Number.isFinite(j) || j <= 0) return '';
    return Math.round(j * 100) + '%';
  }

  /** Nilai butir mendesak, dicetak sesuai bentuk rasionya. */
  nilaiButir(butir: any): string {
    const n = Number(butir?.nilai);
    if (!Number.isFinite(n)) return '—';
    return this.cetak(n, BENTUK_RASIO[butir?.kode] || 'angka');
  }

  /** Kunci arti untuk butir mendesak — dipakai juga oleh dialognya. */
  artiButir(butir: any): string {
    const kunci =
      'posisiKeuangan.arti.' + butir?.kode + '.' + (butir?.posisi || 'umum');
    const t = this.translate.instant(kunci);
    if (t && t !== kunci) return t;
    const cadangan = 'posisiKeuangan.arti.' + butir?.kode + '.umum';
    const c = this.translate.instant(cadangan);
    return c && c !== cadangan ? c : '';
  }

  /** Satu temuan kombinasi, sudah diterjemahkan beserta angkanya. */
  teksKombinasi(x: any): string {
    const a = x?.angka || {};
    const siap: Record<string, string> = {};
    for (const [kode, nilai] of Object.entries(a)) {
      const n = Number(nilai);
      if (!Number.isFinite(n)) {
        siap[kode] = '—';
        continue;
      }
      // `pinjaman` rupiah; sisanya rasio dengan bentuknya masing-masing.
      siap[kode] =
        kode === 'pinjaman'
          ? this.uang(n)
          : this.cetak(n, BENTUK_RASIO[kode] || 'angka');
    }
    return this.translate.instant(
      'posisiKeuangan.kombinasi.' + x?.kode,
      siap,
    );
  }

  /** Nama rasio yang sudah aman — untuk daftar yang diciutkan. */
  namaAman(): string[] {
    const aman: string[] = this.kesimpulan()?.aman || [];
    return aman.map((k) =>
      this.translate.instant('posisiKeuangan.namaRasio.' + k),
    );
  }

  /** Berapa butir mendesak yang TIDAK ikut ditampilkan. */
  sisaMendesak(): number {
    const k = this.kesimpulan();
    if (!k) return 0;
    return Math.max(0, (k.jumlahMendesak || 0) - (k.mendesak?.length || 0));
  }

  /** Penyusun satu rasio: pembilang, penyebut, dan rinciannya. */
  hitungan(kode: string): any | null {
    return this.data()?.hitungan?.[kode] || null;
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
