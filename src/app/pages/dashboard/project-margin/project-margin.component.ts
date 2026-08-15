import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';

import { ApiService } from 'src/app/services/api.service';

interface BarisMargin {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
  isCancelled: boolean;
  kontrak: number;
  tertagih: number;
  pembelian: number;
  pembelianInternal: number;
  draft: number;
  reimbursement: number;
  marginInternalMasuk: number;
  marginInternalKeluar: number;
}

/**
 * Ikhtisar margin per proyek, hanya untuk dibaca.
 *
 * Marginnya dihitung di sini dari angka mentah, bukan diminta ke server:
 * biaya sebuah proyek terdiri dari beberapa sumber yang berbeda sifatnya —
 * pembelian yang sudah tercatat, draf yang belum, dan reimbursement — dan
 * menyatukannya di server berarti layar ini tidak dapat lagi menunjukkan
 * asal selisihnya ketika angkanya mengejutkan.
 *
 * Proyek yang MASIH BERJALAN didahulukan server: di situlah marginnya masih
 * dapat diperbaiki.
 */
@Component({
  selector: 'app-project-margin',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    TranslatePipe,
  ],
  templateUrl: './project-margin.component.html',
  styleUrls: ['./project-margin.component.scss'],
})
export class ProjectMarginComponent implements OnInit {
  private readonly api = inject(ApiService);

  daftar: BarisMargin[] = [];
  isLoading = true;

  /**
   * Sertakan pembelian internal sebagai biaya.
   *
   * Bawaannya YA. Bagi proyek, barang yang dibeli dari perusahaan sendiri
   * tetap biaya nyata — ia dibayar, dicatat, dan mengurangi margin proyek
   * itu. Yang berbeda hanya sudut pandang pemilik grup, dan sudut pandang
   * itu adalah pengecualian, bukan bawaan.
   */
  sertakanInternal = true;
  gagal = false;

  ngOnInit(): void {
    this.muat();
  }

  /**
   * Ambil halaman pertama saja.
   *
   * Server mengunci `pageSize` maksimum SEPULUH, dan batas itu disengaja:
   * tiap baris berasal dari empat penjumlahan lintas tabel. Meminta lebih
   * ditolak sebagai galat, bukan dipotong.
   *
   * Untuk blok ini sepuluh sudah cukup — server mendahulukan proyek yang
   * masih berjalan, dan yang perlu terlihat sekilas adalah apakah ada yang
   * merah. Daftar lengkapnya ada di halaman Laporan Proyek.
   */
  muat(): void {
    this.isLoading = true;
    this.gagal = false;
    this.api
      .get('projects/margin-summary', { page: 1, pageSize: 10 })
      .subscribe({
        next: (res: any) => {
          this.daftar = (res?.data ?? []).filter(
            (p: BarisMargin) => !p.isCancelled,
          );
        },
        error: () => {
          this.daftar = [];
          this.gagal = true;
        },
      })
      .add(() => {
        this.isLoading = false;
      });
  }

  private angka(v: unknown): number {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  }

  /**
   * Seluruh biaya yang melekat pada proyek.
   *
   * Draf pembelian IKUT dihitung. Draf adalah biaya yang sudah terjadi
   * tetapi belum dicatat sebagai pembelian; mengabaikannya membuat margin
   * tampak lebih besar daripada keadaannya, dan justru pada proyek yang
   * pencatatannya paling tertinggal.
   */
  biaya(p: BarisMargin): number {
    /*
     * `marginInternalMasuk` dan `marginInternalKeluar` adalah MARGIN JADI,
     * bukan angka biaya. Menjumlahkannya ke sini membuat pembelian internal
     * terhitung DUA KALI — sekali di dalam `pembelian`, sekali lagi sebagai
     * selisih kedua margin itu.
     *
     * Yang dipakai sekarang angka mentahnya.
     */
    const dasar =
      this.angka(p.pembelian) +
      this.angka(p.draft) +
      this.angka(p.reimbursement);

    /*
     * Pembelian internal DIKURANGKAN bila tidak disertakan.
     *
     * Yang dibeli dari perusahaan sendiri bukan uang yang keluar dari grup;
     * bagi pemilik itu perpindahan, bukan biaya. Tetapi bagi proyek itu
     * tetap biaya nyata — karena itu keduanya perlu dapat dilihat, dan
     * bawaannya menyertakan.
     */
    return this.sertakanInternal
      ? dasar
      : dasar - this.angka(p.pembelianInternal);
  }

  /**
   * Yang sudah difakturkan ke klien.
   *
   * Inilah pembanding biaya, BUKAN nilai kontrak. Nilai kontrak adalah
   * pekerjaan yang akan dikerjakan; membandingkannya dengan biaya yang baru
   * sebagian membuat proyek berbiaya 500 juta berkontrak 40 miliar tampak
   * bermargin 98% — padahal belum satu rupiah pun ditagihkan, dan yang
   * sebenarnya terjadi adalah perusahaan menalangi 500 juta.
   */
  tertagih(p: BarisMargin): number {
    return this.angka(p.tertagih);
  }

  /**
   * Pekerjaan yang belum difakturkan.
   *
   * Selisih kontrak dan tagihan. Angka besar pada proyek yang hampir selesai
   * adalah tanda ada pekerjaan yang lupa ditagihkan — dan itu uang yang
   * sudah keluar tetapi belum diminta kembali.
   */
  belumTertagih(p: BarisMargin): number {
    return this.angka(p.kontrak) - this.tertagih(p);
  }

  /**
   * Margin atas pekerjaan yang SUDAH ditagihkan.
   *
   * Angkanya konservatif: proyek yang baru berjalan akan tampak merah karena
   * biayanya keluar lebih dulu daripada tagihannya. Itu memang keadaannya —
   * perusahaan sedang menalangi, dan menampilkannya sebagai untung besar
   * hanya menunda kesadaran itu.
   */
  margin(p: BarisMargin): number {
    return this.tertagih(p) - this.biaya(p);
  }

  /** Margin dalam persen; nol bila nilai kontraknya belum diisi. */
  persen(p: BarisMargin): number {
    const t = this.tertagih(p);
    if (t <= 0) return 0;
    return (this.margin(p) / t) * 100;
  }

  /**
   * Proyek yang nilai kontraknya belum diisi.
   *
   * Ditandai tersendiri, bukan ditampilkan sebagai margin negatif: yang
   * belum diketahui berbeda dari yang sudah diketahui buruk, dan
   * menyamakannya membuat daftar ini menakut-nakuti tanpa sebab.
   */
  /**
   * Belum ada satu pun tagihan.
   *
   * Marginnya belum dapat dinilai — bukan nol, dan bukan pula rugi sebesar
   * biayanya: biaya yang sudah keluar memang akan ditagihkan, hanya belum.
   * Menampilkannya sebagai angka merah besar membuat daftar ini
   * menakut-nakuti setiap kali ada proyek baru dimulai.
   */
  tanpaKontrak(p: BarisMargin): boolean {
    return this.tertagih(p) <= 0;
  }

  /** Lebar bilah margin, dibatasi agar tidak melebihi kolomnya. */
  lebarBilah(p: BarisMargin): number {
    return Math.min(100, Math.max(0, this.persen(p)));
  }
}
