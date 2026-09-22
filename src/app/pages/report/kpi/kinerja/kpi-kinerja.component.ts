import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { firstValueFrom } from 'rxjs';

import { pastikanChart, rupiah } from 'src/app/helpers/chart-dasar.helper';
import { uangDokumen } from 'src/app/helpers/uang.helper';
import { ApiService } from 'src/app/services/api.service';
import { ServerMessageService } from 'src/app/services/server-message.service';
import { HitungNaikDirective } from '../../../../directives/hitung-naik.directive';

/*
 * chart.js v4 tidak mendaftarkan apa pun sendiri, dan pendaftarannya dipanggil
 * di tingkat MODUL — bukan sekali di `app.config`. Lihat keterangan panjang di
 * `posisi-keuangan.component.ts`: komponen yang lupa memanggilnya tetap tampak
 * benar asal halaman grafik LAIN pernah dibuka lebih dulu, dan menampilkan
 * kanvas kosong tanpa galat bagi yang membuka halaman ini duluan.
 */
pastikanChart();

/**
 * Deret satu seri marjin, dengan `null` untuk titik yang belum punya jendela.
 *
 * DI TINGKAT MODUL, bukan di dalam `dataMarjin`: ini bagian yang paling
 * mudah keliru di seluruh berkas, dan fungsi yang bersarang di dalam
 * computed hanya dapat diuji dengan menyalin isinya ke dalam pengujian —
 * salinan yang tetap hijau walaupun yang dikirim sudah berubah.
 *
 * `null`, BUKAN 0. chart.js memutus garisnya pada `null` (`spanGaps: false`),
 * dan garis yang putus jujur menyatakan datanya belum ada. Nol akan
 * menggambar marjin yang runtuh ke nol pada bulan-bulan awal — pembacaan
 * yang salah tentang usaha yang sebenarnya baik-baik saja.
 */
export function titikMarjin(deret: any[], kunci: string): (number | null)[] {
  return (deret ?? []).map((x) => {
    const j = x?.jendela;
    if (!j || j.belumCukup) return null;
    const n = j[kunci];
    return n === null || n === undefined ? null : Number(n) * 100;
  });
}

@Component({
  selector: 'app-kpi-kinerja',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    HitungNaikDirective,
    CommonModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressBarModule,
    MatSelectModule,
    MatTooltipModule,
    TranslateModule,
    BaseChartDirective,
  ],
  templateUrl: './kpi-kinerja.component.html',
  styleUrls: ['../kpi.shared.scss'],
})
export class KpiKinerjaComponent {
  private readonly api = inject(ApiService);
  private readonly pesanServer = inject(ServerMessageService);
  private readonly translate = inject(TranslateService);

  readonly memuat = signal(false);
  readonly galat = signal('');
  readonly data = signal<any>(null);
  readonly mundur = signal(12);

  constructor() {
    void this.muat();
  }

  // ------------------------------------------------------------------
  // Pengambilan
  // ------------------------------------------------------------------

  async muat(): Promise<void> {
    this.memuat.set(true);
    this.galat.set('');
    try {
      const res = await firstValueFrom(
        this.api.get('kpi/perusahaan', { mundur: this.mundur() }),
      );
      this.data.set(res);
    } catch (e) {
      this.data.set(null);
      this.galat.set(this.pesanServer.terjemahkan(e));
    } finally {
      this.memuat.set(false);
    }
  }

  gantiMundur(nilai: number): void {
    this.mundur.set(Number(nilai) || 12);
    void this.muat();
  }

  // ------------------------------------------------------------------
  // Pembacaan
  // ------------------------------------------------------------------

  readonly deret = computed<any[]>(() => this.data()?.bulan ?? []);

  /** Bulan paling akhir — yang dicetak besar di baris KPI. */
  readonly terkini = computed<any>(() => {
    const d = this.deret();
    return d.length ? d[d.length - 1] : null;
  });

  /**
   * Angka yang tidak terbaca sama sekali.
   *
   * DIBEDAKAN dari "belum ada dokumennya". Deret kosong karena kueri gagal
   * akan digambar sebagai perusahaan tanpa pendapatan — grafik rata di nol,
   * tanpa satu pun galat yang menyebutkan bahwa angkanya memang tidak
   * terbaca.
   */
  readonly gagalBaca = computed<boolean>(() => !!this.data()?.gagal);

  uang(n: any): string {
    return uangDokumen(Number(n) || 0);
  }

  persen(n: any): string {
    if (n === null || n === undefined) return '—';
    return `${(Number(n) * 100).toFixed(1)}%`;
  }

  namaBulan(titik: any): string {
    if (!titik) return '';
    // Disusun sendiri, tanpa `Date`: `new Date(tahun, bulan - 1)` benar, tapi
    // seluruh berkas ini hanya perlu label, dan tanggal yang tidak pernah
    // dibuat tidak dapat tergeser zona waktu.
    const kunci = `bulanSingkat.${titik.bulan}`;
    const nama = this.translate.instant(kunci);
    return `${nama === kunci ? titik.bulan : nama} ${String(titik.tahun).slice(2)}`;
  }

  /**
   * Selisih terhadap pembanding, untuk satu bidang.
   *
   * `null` berarti pembandingnya TIDAK ADA — bulan pertama deret, atau tahun
   * lalu yang tidak ikut ditarik. Nol berarti memang tidak berubah. Keduanya
   * dibedakan: panah "tidak berubah" pada bulan yang tidak punya pembanding
   * menyatakan sesuatu yang tidak diketahui.
   */
  selisih(bidang: string, dasar: 'bulanLalu' | 'tahunLalu'): number | null {
    const b = this.terkini()?.banding?.[dasar];
    if (!b) return null;
    const n = b[bidang];
    return n === null || n === undefined ? null : Number(n);
  }

  arah(nilai: number | null): 'naik' | 'turun' | 'tetap' | 'tidakAda' {
    if (nilai === null) return 'tidakAda';
    if (nilai > 0) return 'naik';
    if (nilai < 0) return 'turun';
    return 'tetap';
  }

  ikonArah(nilai: number | null): string {
    const a = this.arah(nilai);
    if (a === 'naik') return 'trending_up';
    if (a === 'turun') return 'trending_down';
    if (a === 'tetap') return 'trending_flat';
    return 'remove';
  }

  /** Jendela marjin bulan terkini, atau null bila datanya belum cukup. */
  readonly jendela = computed<any>(() => {
    const j = this.terkini()?.jendela;
    return j && !j.belumCukup ? j : null;
  });

  readonly belumCukup = computed<boolean>(
    () => !!this.terkini()?.jendela?.belumCukup,
  );

  // ------------------------------------------------------------------
  // Grafik
  // ------------------------------------------------------------------

  readonly dataRupiah = computed<ChartData<'bar'>>(() => {
    const d = this.deret();
    return {
      labels: d.map((x) => this.namaBulan(x)),
      datasets: [
        {
          label: this.translate.instant('kpi.pendapatan'),
          data: d.map((x) => Number(x.pendapatan) || 0),
          backgroundColor: '#3b6fe0',
        },
        {
          label: this.translate.instant('kpi.hpp'),
          data: d.map((x) => Number(x.hpp) || 0),
          backgroundColor: '#e0a54e',
        },
        {
          label: this.translate.instant('kpi.bebanUsaha'),
          data: d.map((x) => Number(x.bebanUsaha) || 0),
          backgroundColor: '#b3322f',
        },
      ],
    };
  });

  readonly opsiRupiah: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        ticks: { callback: (v) => rupiah(Number(v)) },
      },
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (k) => `${k.dataset.label}: ${rupiah(Number(k.parsed.y))}`,
        },
      },
    },
  };

  readonly dataMarjin = computed<ChartData<'line'>>(() => {
    // Lihat `titikMarjin` untuk kenapa titik kosong berupa `null`.
    const d = this.deret();
    const ambil = (k: string) => titikMarjin(d, k);
    return {
      labels: d.map((x) => this.namaBulan(x)),
      datasets: [
        {
          label: this.translate.instant('kpi.marjinKotor'),
          data: ambil('marjinKotor') as any,
          borderColor: '#1a7f45',
          spanGaps: false,
          tension: 0.25,
        },
        {
          label: this.translate.instant('kpi.marjinBersih'),
          data: ambil('marjinBersih') as any,
          borderColor: '#3b6fe0',
          spanGaps: false,
          tension: 0.25,
        },
        {
          label: this.translate.instant('kpi.rasioOverhead'),
          data: ambil('rasioOverhead') as any,
          borderColor: '#b3322f',
          spanGaps: false,
          tension: 0.25,
        },
      ],
    };
  });

  readonly opsiMarjin: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { ticks: { callback: (v) => `${Number(v).toFixed(0)}%` } },
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (k) =>
            `${k.dataset.label}: ${Number(k.parsed.y).toFixed(1)}%`,
        },
      },
    },
  };
}
