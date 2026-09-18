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
   * Lebar batang, sebagai persen terhadap ember TERBESAR.
   *
   * Dibagi terhadap yang terbesar, bukan terhadap totalnya: yang dicari mana
   * yang menonjol, dan pembagian terhadap total membuat seluruh batang menjadi
   * sangat pendek begitu embernya banyak.
   */
  lebar(daftar: Ember[], e: Ember): number {
    const puncak = Math.max(...daftar.map((x) => Math.abs(x.nilai)), 0);
    if (puncak <= 0) return 0;
    return Math.round((Math.abs(e.nilai) / puncak) * 100);
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
