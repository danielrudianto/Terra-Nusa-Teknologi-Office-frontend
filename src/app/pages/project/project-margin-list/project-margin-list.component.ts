import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { debounceTime } from 'rxjs';

import { ApiService } from '../../../services/api.service';

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

type Urut =
  | 'code'
  | 'kontrak'
  | 'tertagih'
  | 'belum'
  | 'biaya'
  | 'margin'
  | 'persen';

/**
 * Daftar proyek beserta marginnya; pintu masuk ke laporan rinci.
 *
 * Margin adalah PERTANYAAN, bukan jawaban. Yang melihat sebuah proyek rugi
 * tidak berhenti di angkanya — ia ingin tahu sebabnya, dan yang menjawab itu
 * adalah laporan rinci proyek tersebut. Menaruh keduanya di halaman terpisah
 * memaksa orang mengingat kode proyeknya lalu mencarinya lagi.
 *
 * Karena itu daftar ini sekaligus ikhtisar margin dan jalan masuknya: satu
 * klik pada barisnya membuka laporan proyek itu.
 */
@Component({
  selector: 'app-project-margin-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    TranslatePipe,
  ],
  templateUrl: './project-margin-list.component.html',
  styleUrls: ['./project-margin-list.component.scss'],
})
export class ProjectMarginListComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly cari = new FormControl('');

  semua: BarisMargin[] = [];
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

  /** Tampilkan proyek yang sudah selesai. */
  sertakanSelesai = false;

  urut: Urut = 'persen';
  naik = false;

  ngOnInit(): void {
    this.muat();
    this.cari.valueChanges.pipe(debounceTime(250)).subscribe();
  }

  /**
   * Ambil seluruh proyek, SEPULUH per permintaan.
   *
   * Server mengunci `pageSize` maksimum sepuluh dan alasannya ditulis di
   * sana: tiap baris berasal dari empat penjumlahan lintas tabel. Meminta
   * lebih ditolak sebagai galat, bukan dipotong — sehingga halaman ini harus
   * mengambil bertahap, bukan menaikkan batasnya.
   *
   * Berhenti bila halaman terakhir sudah terbaca, bila jumlahnya sudah
   * terkumpul, atau setelah lima puluh permintaan. Batas terakhir itu
   * pengaman terhadap `total` yang keliru; tanpa itu satu kesalahan di
   * server membuat layar ini meminta tanpa henti.
   */
  async muat(): Promise<void> {
    this.isLoading = true;
    this.gagal = false;
    const kumpul: BarisMargin[] = [];

    try {
      for (let halaman = 1; halaman <= 50; halaman++) {
        const res: any = await new Promise((selesai, gagal) => {
          this.api
            .get('projects/margin-summary', { page: halaman, pageSize: 10 })
            .subscribe({ next: selesai, error: gagal });
        });

        const baris: BarisMargin[] = res?.data ?? [];
        kumpul.push(...baris);

        const total = Number(res?.total ?? 0);
        if (!baris.length || (total > 0 && kumpul.length >= total)) break;
      }
      this.semua = kumpul.filter((p) => !p.isCancelled);
    } catch {
      this.semua = [];
      this.gagal = true;
    } finally {
      this.isLoading = false;
    }
  }

  private angka(v: unknown): number {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  }

  /**
   * Seluruh biaya yang melekat pada proyek.
   *
   * Draf pembelian IKUT dihitung: draf adalah biaya yang sudah terjadi tetapi
   * belum dicatat sebagai pembelian. Mengabaikannya membuat margin tampak
   * lebih besar daripada keadaannya — dan justru pada proyek yang
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

  persen(p: BarisMargin): number {
    const t = this.tertagih(p);
    return t > 0 ? (this.margin(p) / t) * 100 : 0;
  }

  /**
   * Nilai kontraknya belum diisi.
   *
   * Ditandai tersendiri, bukan ditampilkan sebagai margin negatif: yang belum
   * diketahui berbeda dari yang sudah diketahui buruk, dan menyamakannya
   * membuat daftar ini menakut-nakuti tanpa sebab.
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

  gantiUrut(kolom: Urut): void {
    if (this.urut === kolom) {
      this.naik = !this.naik;
    } else {
      this.urut = kolom;
      this.naik = false;
    }
  }

  get daftar(): BarisMargin[] {
    const kata = (this.cari.value ?? '').trim().toLowerCase();

    let hasil = this.semua.filter((p) => {
      if (!this.sertakanSelesai && !p.isActive) return false;
      if (!kata) return true;
      return (
        (p.code ?? '').toLowerCase().includes(kata) ||
        (p.name ?? '').toLowerCase().includes(kata)
      );
    });

    /*
     * Proyek TANPA nilai kontrak selalu diletakkan di bawah.
     *
     * Marginnya nol menurut perhitungan, sehingga ikut mengurut akan
     * menempatkannya di tengah-tengah proyek yang benar-benar bermargin nol
     * — dan keduanya berarti hal yang sama sekali berbeda.
     */
    const nilai = (p: BarisMargin): number => {
      switch (this.urut) {
        case 'kontrak':
          return this.angka(p.kontrak);
        case 'tertagih':
          return this.tertagih(p);
        case 'belum':
          return this.belumTertagih(p);
        case 'biaya':
          return this.biaya(p);
        case 'margin':
          return this.margin(p);
        case 'persen':
          return this.persen(p);
        default:
          return 0;
      }
    };

    hasil = [...hasil].sort((a, b) => {
      const aKosong = this.tanpaKontrak(a);
      const bKosong = this.tanpaKontrak(b);
      if (aKosong !== bKosong) return aKosong ? 1 : -1;

      if (this.urut === 'code') {
        const c = (a.code ?? '').localeCompare(b.code ?? '');
        return this.naik ? c : -c;
      }
      const d = nilai(a) - nilai(b);
      return this.naik ? d : -d;
    });

    return hasil;
  }

  /** Total seluruh proyek yang sedang tampil. */
  get total(): {
    kontrak: number;
    tertagih: number;
    belum: number;
    biaya: number;
    margin: number;
  } {
    return this.daftar.reduce(
      (a, p) => ({
        kontrak: a.kontrak + this.angka(p.kontrak),
        tertagih: a.tertagih + this.tertagih(p),
        belum: a.belum + this.belumTertagih(p),
        biaya: a.biaya + this.biaya(p),
        margin: a.margin + this.margin(p),
      }),
      { kontrak: 0, tertagih: 0, belum: 0, biaya: 0, margin: 0 },
    );
  }

  buka(p: BarisMargin): void {
    this.router.navigate(['/Project/Report', p.code]);
  }
}
