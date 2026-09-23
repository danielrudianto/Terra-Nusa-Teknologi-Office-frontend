import { memoLarik } from 'src/app/utils/memo-larik';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  signal,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { ApiService } from 'src/app/services/api.service';
import { ServerMessageService } from 'src/app/services/server-message.service';
import { HeaderTitleComponent } from 'src/app/components/header-title/header-title.component';
import { unduhPdfLabaRugi } from './laba-rugi-pdf';

/**
 * Laba rugi konsolidasi — "versi kita".
 *
 * Menampilkan dua kolom: bulan berjalan dan akumulasi tahun berjalan (YTD),
 * pada basis AKRUAL (tanggal dokumen). Tiap kelompok biaya dapat dibuka untuk
 * melihat rinciannya per kategori — inilah yang dicocokkan dengan akuntan.
 *
 * Angkanya diambil dari `GET /reports/laba-rugi`, yang hanya melayani pemilik
 * usaha (level 5); layar ini pun hanya muncul di sidenav untuk level itu.
 */
@Component({
  selector: 'app-laba-rugi',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatProgressBarModule,
    MatButtonModule,
    TranslateModule,
    HeaderTitleComponent,
  ],
  templateUrl: './laba-rugi.component.html',
  styleUrl: './laba-rugi.component.scss',
})
export class LabaRugiComponent {
  private readonly api = inject(ApiService);
  private readonly translate = inject(TranslateService);
  private readonly pesanServer = inject(ServerMessageService);
  private readonly http = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);

  /**
   * Dipasang di dalam dialog, bukan sebagai halaman.
   *
   * Kepala halaman disembunyikan: dialognya sudah punya kepala sendiri, dan
   * dua judul "Laporan Laba Rugi" bertumpuk membuat yang membukanya mencari
   * apa bedanya.
   */
  readonly modeDialog = input(false);

  readonly mengunduh = signal(false);

  readonly bulan = signal(new Date().getMonth() + 1);
  readonly tahun = signal(new Date().getFullYear());
  readonly data = signal<any | null>(null);
  readonly memuat = signal(false);
  readonly galat = signal('');

  /** Kelompok mana yang sedang terbuka rinciannya. */
  readonly buka = signal<Record<string, boolean>>({
    hpp: true,
    bebanUsaha: true,
    bebanLain: false,
  });

  readonly tahunList: number[];
  readonly bulanList = [
    { v: 1, n: 'Januari' },
    { v: 2, n: 'Februari' },
    { v: 3, n: 'Maret' },
    { v: 4, n: 'April' },
    { v: 5, n: 'Mei' },
    { v: 6, n: 'Juni' },
    { v: 7, n: 'Juli' },
    { v: 8, n: 'Agustus' },
    { v: 9, n: 'September' },
    { v: 10, n: 'Oktober' },
    { v: 11, n: 'November' },
    { v: 12, n: 'Desember' },
  ];

  /**
   * Tahun paling awal yang datanya benar-benar ada di sistem. Sebelum ini
   * datanya belum lengkap, jadi tak perlu ditawarkan di pemilih tahun.
   */
  private static readonly TAHUN_MULAI = 2024;

  constructor() {
    const kini = new Date().getFullYear();
    const mulai = LabaRugiComponent.TAHUN_MULAI;
    // Dari tahun berjalan mundur sampai TAHUN_MULAI (mis. 2026 -> 2024).
    const jumlah = Math.max(1, kini - mulai + 1);
    this.tahunList = Array.from({ length: jumlah }, (_, i) => kini - i);
    void this.muat();
  }

  toggle(key: string): void {
    this.buka.update((s) => ({ ...s, [key]: !s[key] }));
  }
  terbuka(key: string): boolean {
    return !!this.buka()[key];
  }

  gantiBulan(v: number): void {
    this.bulan.set(Number(v));
    void this.muat();
  }
  gantiTahun(v: number): void {
    this.tahun.set(Number(v));
    void this.muat();
  }

  /**
   * Rincian satu kelompok, GABUNGAN kategori bulan & YTD.
   *
   * Kategori yang muncul di YTD tetapi belum di bulan ini (atau sebaliknya)
   * ikut ditampilkan — kalau tidak, kolomnya tampak berlubang dan yang
   * mencocokkan menyangka ada baris yang hilang.
   */
  /*
   * Dipanggil dari `*ngFor` untuk tiga kelompok sekaligus, jadi tanpa
   * ingatan ketiganya dirakit ulang pada tiap putaran deteksi perubahan —
   * lihat `memoLarik`. Kuncinya data laporan; selama ia belum dimuat ulang,
   * larik yang sama dikembalikan.
   */
  private readonly rinciMemo = new Map<string, () => any[]>();

  rinci(kelompok: string): any[] {
    let ambil = this.rinciMemo.get(kelompok);
    if (!ambil) {
      ambil = memoLarik(
        (): any[] => this.hitungRinci(kelompok),
        () => [this.data()],
      );
      this.rinciMemo.set(kelompok, ambil);
    }
    return ambil();
  }

  private hitungRinci(kelompok: string): any[] {
      const d = this.data();
      if (!d) return [];
      const b = d.bulan?.[kelompok]?.rincian || [];
      const y = d.ytd?.[kelompok]?.rincian || [];
      const peta = new Map<string, any>();
      for (const r of y) {
        peta.set(r.kategori, {
          kategori: r.kategori,
          label: r.label,
          bulan: 0,
          ytd: Number(r.nilai) || 0,
        });
      }
      for (const r of b) {
        const ada = peta.get(r.kategori) || {
          kategori: r.kategori,
          label: r.label,
          bulan: 0,
          ytd: 0,
        };
        ada.bulan = Number(r.nilai) || 0;
        ada.label = r.label;
        peta.set(r.kategori, ada);
      }
      return Array.from(peta.values()).sort((a, c) => c.ytd - a.ytd);
  }


  /**
   * Persentase sebuah nilai terhadap PENDAPATAN periode itu (common-size).
   *
   * Pendapatan = 100%; setiap baris dibaca sebagai porsi dari pendapatan —
   * cara membaca laporan laba rugi yang lazim ("berapa persen omzet yang
   * habis untuk ini"). Bila pendapatan 0 (belum ada penjualan pada periode),
   * persentasenya tak bermakna dan ditampilkan sebagai "—".
   */
  persen(nilai: number, periode: 'bulan' | 'ytd'): string {
    const d = this.data();
    const dasar = Number(d?.[periode]?.pendapatan) || 0;
    if (!dasar) return '—';
    const p = ((Number(nilai) || 0) / dasar) * 100;
    return (
      p.toLocaleString('id-ID', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }) + '%'
    );
  }

  /**
   * Label baris rincian yang sudah diterjemahkan.
   *
   * Server mengirim `kategori` (slug stabil) + `label` (Indonesia, cadangan).
   * Bila terjemahan `labaRugi.baris.<slug>` ada, pakai itu; jika tidak (mis.
   * kategori tak terpetakan seperti "Lainnya (X)"), jatuh ke label server.
   */
  labelBaris(r: any): string {
    const kunci = 'labaRugi.baris.' + (r?.kategori ?? '');
    const teks = this.translate.instant(kunci);
    return teks && teks !== kunci ? teks : r?.label || r?.kategori || '';
  }

  /**
   * PDF untuk bulan & tahun yang SEDANG DITAMPILKAN.
   *
   * Tombolnya ada di sebelah pemilih periode, bukan di kaki dialog: yang
   * dicetak harus jelas periode yang mana, dan periode itu tertulis tepat
   * di sebelahnya. Tombol di tempat lain dapat dibaca sebagai "cetak bulan
   * ini" padahal pemilihnya menunjuk bulan lain.
   */
  async unduhPdf(): Promise<void> {
    if (this.mengunduh()) return;
    this.mengunduh.set(true);
    try {
      await unduhPdfLabaRugi(this.http, this.bulan(), this.tahun());
    } catch (e) {
      this.snackBar.open(
        this.pesanServer.terjemahkan(e, 'labaRugi.gagalPdf'),
        this.translate.instant('common.close'),
        { duration: 6000 },
      );
    } finally {
      this.mengunduh.set(false);
    }
  }

  async muat(): Promise<void> {
    this.memuat.set(true);
    this.galat.set('');
    try {
      const hasil = await firstValueFrom(
        this.api.get('reports/laba-rugi', {
          month: this.bulan(),
          year: this.tahun(),
        }),
      );
      this.data.set(hasil);
    } catch (e) {
      this.data.set(null);
      this.galat.set(this.pesanServer.terjemahkan(e));
    } finally {
      this.memuat.set(false);
    }
  }
}
