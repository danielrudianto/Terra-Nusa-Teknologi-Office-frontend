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
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartConfiguration, ChartData, registerables } from 'chart.js';

import { ApiService } from 'src/app/services/api.service';
import { PaymentPlanService } from 'src/app/services/payment-plan.service';

/*
 * Controller chart.js WAJIB didaftarkan, dan kegagalannya TIDAK TERLIHAT.
 *
 * chart.js versi 4 tidak mendaftarkan apa pun sendiri. Tanpa baris ini,
 * `type: 'line'` tidak punya controller — kanvasnya tetap ada, tingginya
 * tetap 300px, dan yang tampil adalah kotak kosong. Tidak ada spanduk galat,
 * tidak ada pesan di layar; kartunya terlihat seperti grafik yang belum
 * selesai dibuat.
 *
 * Dua komponen grafik lain di aplikasi ini memanggilnya di tingkat modul juga.
 * Selama kebetulan salah satunya sudah termuat, grafik di halaman lain ikut
 * jalan — dan itu yang membuat kekeliruan ini menipu: ia hanya muncul pada
 * halaman yang dibuka TANPA halaman grafik lain pernah disentuh lebih dulu.
 * Persis yang terjadi di kalender.
 */
Chart.register(...registerables);

/** Satu pekan pada garis proyeksi. */
export interface TitikProyeksi {
  /** Senin pekan itu, `YYYY-MM-DD`. */
  mulai: string;
  label: string;
  masuk: number;
  keluar: number;
  /** Saldo kas pada AKHIR pekan itu, kumulatif dari saldo hari ini. */
  saldo: number;
}

const NAMA_BULAN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

/**
 * `YYYY-MM-DD` -> Senin pekan itu, tetap sebagai `YYYY-MM-DD`.
 *
 * Tanggalnya diurai menjadi angka lalu dibangun dengan `new Date(y, m, d)` —
 * konstruktor WAKTU SETEMPAT. Yang berbahaya adalah `new Date('2026-09-15')`,
 * yang diurai sebagai tengah malam UTC dan di zona barat UTC mundur sehari.
 * Kekeliruan itu sudah dua kali muncul di sistem ini; di sini akibatnya
 * memindahkan rencana ke pekan yang salah.
 */
export function seninPekan(tgl: string): string {
  const [y, b, h] = tgl.split('-').map(Number);
  const d = new Date(y, b - 1, h);
  // getDay(): 0 = Minggu. Digeser supaya Senin menjadi awal pekan.
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const dua = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}`;
}

function tambahPekan(tgl: string, n: number): string {
  const [y, b, h] = tgl.split('-').map(Number);
  const d = new Date(y, b - 1, h);
  d.setDate(d.getDate() + n * 7);
  const dua = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}`;
}

function labelPekan(tgl: string): string {
  const [, b, h] = tgl.split('-').map(Number);
  return `${h} ${NAMA_BULAN[b - 1]}`;
}

/**
 * Rencana kas -> garis proyeksi saldo, per PEKAN.
 *
 * KENAPA PEKANAN, BUKAN BULANAN
 *
 * Jangkauannya tiga bulan. Bulanan berarti TIGA titik — itu bukan garis, itu
 * tiga angka yang dihubungkan. Pekanan memberi 13 titik: cukup untuk melihat
 * pekan mana kasnya menipis, dan itulah satu-satunya hal yang dicari orang di
 * grafik ini.
 *
 * RENCANA YANG SUDAH TERLEWAT MASUK KE PEKAN PERTAMA
 *
 * Bukan dibuang, dan bukan pula ditaruh di tanggal aslinya yang sudah lewat.
 * Uangnya memang belum bergerak, kewajibannya belum hilang, dan yang membaca
 * proyeksi perlu melihatnya sebagai beban yang menunggu SEKARANG. Dibuang, ia
 * membuat proyeksinya terbaca lebih sehat daripada keadaannya.
 *
 * SALDO AWALNYA KAS SUNGGUHAN HARI INI
 *
 * Bukan saldo awal bulan yang sedang dibuka di kalender. Proyeksi menjawab
 * "mulai dari posisi sekarang, cukup atau tidak" — dan kalau titik mulainya
 * bukan uang yang benar-benar ada di rekening, seluruh garisnya menggeser
 * sebanyak selisih itu tanpa ada yang menyadarinya.
 */
export function titikProyeksi(
  rencana: any[],
  saldoAwal: number,
  mulai: string,
  pekan: number,
): TitikProyeksi[] {
  const awal = seninPekan(mulai);

  const ember = new Map<string, { masuk: number; keluar: number }>();
  const kunci: string[] = [];
  for (let i = 0; i < pekan; i++) {
    const k = tambahPekan(awal, i);
    kunci.push(k);
    ember.set(k, { masuk: 0, keluar: 0 });
  }
  const akhir = kunci[kunci.length - 1];

  for (const r of rencana ?? []) {
    if (r?.status !== 'rencana') continue;

    const tgl = String(r?.date ?? '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tgl)) continue;

    // Terlewat -> pekan pertama. Di luar jangkauan -> dilewati; jumlahnya
    // dilaporkan terpisah oleh komponennya supaya tidak hilang diam-diam.
    let k = seninPekan(tgl);
    if (k < awal) k = awal;
    if (k > akhir) continue;

    const e = ember.get(k)!;
    const n = Math.abs(Number(r?.amount) || 0);
    if (r?.planType === 'masuk') e.masuk += n;
    else e.keluar += n;
  }

  let saldo = Number(saldoAwal) || 0;
  return kunci.map((k) => {
    const e = ember.get(k)!;
    saldo += e.masuk - e.keluar;
    return { mulai: k, label: labelPekan(k), masuk: e.masuk, keluar: e.keluar, saldo };
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

  ngOnChanges(_: SimpleChanges): void {
    this.muat();
  }

  private hariIni(): string {
    const d = new Date();
    const dua = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}`;
  }

  private muat(): void {
    this.memuat.set(true);
    const mulai = this.hariIni();
    const akhir = tambahPekan(seninPekan(mulai), this.PEKAN);

    const idRekening = (this.bankAccounts ?? [])
      .filter((x) => x?.selected)
      .map((x) => x.id);

    this.api
      .get('dashboard/cash-position', { bankAccounts: idRekening })
      .subscribe({
        next: (r: any) => {
          this.terkunci.set(false);
          this.saldoSekarang.set(Number(r?.totalBalance) || 0);
        },
        error: (err: any) => {
          this.terkunci.set(err?.status === 403);
          this.saldoSekarang.set(null);
        },
      });

    /*
     * Rentangnya dimulai dari SENIN pekan ini, bukan dari hari ini.
     *
     * Rencana yang jatuh Senin-kemarin sementara hari ini Rabu tetap masuk
     * pekan pertama — dan kalau rentang permintaannya mulai hari ini, baris
     * itu tidak pernah terambil. Saringan "terlewat" di `titikProyeksi` hanya
     * dapat memindahkan baris yang memang ada di tangannya.
     */
    this.planService.rentang(seninPekan(mulai), akhir).subscribe({
      next: (res: any) => {
        this.rencana.set(Array.isArray(res?.data) ? res.data : []);
        this.memuat.set(false);
      },
      error: () => {
        this.rencana.set([]);
        this.memuat.set(false);
      },
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

  /** Saldo TERENDAH sepanjang proyeksi, bukan saldo di ujungnya. */
  readonly titikTerendah = computed<TitikProyeksi | null>(() => {
    const t = this.titik();
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
    const t = this.titik().find((x) => x.saldo < 0);
    return t ? t.label : null;
  });

  /** Rencana yang jatuh di LUAR jangkauan tiga bulan. */
  readonly diLuarJangkauan = computed(() => {
    const t = this.titik();
    if (!t.length) return 0;
    const akhir = t[t.length - 1].mulai;
    return this.rencana().filter((r) => {
      if (r?.status !== 'rencana') return false;
      const tgl = String(r?.date ?? '').slice(0, 10);
      return /^\d{4}-\d{2}-\d{2}$/.test(tgl) && seninPekan(tgl) > akhir;
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
          pointRadius: 2,
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
          label: (ctx) =>
            `Rp ${Number(ctx.parsed.y).toLocaleString('id-ID')}`,
        },
      },
    },
    scales: {
      y: {
        // TIDAK dikunci mulai nol — saldo yang menembus nol justru yang dicari.
        ticks: {
          callback: (v) => {
            const jt = Number(v) / 1_000_000;
            return Math.abs(jt) >= 1000
              ? `${(jt / 1000).toFixed(1)} M`
              : `${jt.toFixed(0)} jt`;
          },
        },
        grid: {
          color: (ctx: any) =>
            ctx.tick?.value === 0 ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.06)',
        },
      },
    },
  };
}
