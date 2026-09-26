// Lihat keterangannya di berkas itu — dialog ini memuat pdf.js sendiri
// lewat impor dinamis, jadi tambalannya disebut di sini juga.
import '../../../polyfill-peta';
import { CommonModule } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';

import { DialogGeserDirective } from '../../../directives/dialog-geser.directive';
import { JALUR_WORKER_PDF } from '../pdf-main.component';

/**
 * Satu coretan pada halaman — bentuknya sama persis dengan yang dipakai
 * halaman PDF, sengaja tidak diturunkan menjadi tipe tersendiri di sini
 * agar keduanya tidak dapat berbeda diam-diam.
 */
export interface AnotasiSunting {
  jenis: 'tutup' | 'catatan';
  x: number;
  y: number;
  lebar?: number;
  tinggi?: number;
  teks?: string;
}

export interface DataSuntingHalaman {
  /** PDF satu halaman, base64 tanpa awalan data-uri. */
  pdf: string;
  /** Nomor halaman sebagaimana tampil di layar. */
  nomor: number;
  fileName: string;
  /** Sudut putar tampilan, kelipatan 90. */
  rotation: number;
  anotasi: AnotasiSunting[];
}

/**
 * SUNTING SATU HALAMAN PDF DI DALAM DIALOG.
 *
 * Sebelumnya coretan ditaruh langsung di atas kartu thumbnail. Kartunya
 * selebar dua ratus piksel, sehingga kotak penutup setebal satu baris teks
 * menjadi setipis dua piksel dan isian teksnya tidak terbaca sama sekali —
 * yang mengetik tidak dapat melihat apa yang diketiknya, apalagi memeriksa
 * letaknya jatuh tepat di atas angka yang hendak ditutup.
 *
 * Di sini halamannya digambar ulang besar, dan koordinatnya tetap disimpan
 * sebagai pecahan (0–1), sehingga hasilnya sama persis ketika disimpan ke
 * berkasnya.
 *
 * Satu hal yang IKUT BETUL karena pindah ke sini: pratinjaunya diputar oleh
 * pdf.js, bukan oleh CSS. Pada kartu, gambarnya diputar `transform` tetapi
 * lapisan coretannya tidak — sehingga pada halaman yang diputar, letak yang
 * ditunjuk di layar bukan letak yang tersimpan. Penggambaran ke PDF sudah
 * lama memetakan balik sudut putarnya; yang keliru justru tampilannya.
 */
@Component({
  selector: 'app-sunting-halaman',
  standalone: true,
  templateUrl: './sunting-halaman.component.html',
  styleUrl: './sunting-halaman.component.scss',
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    TranslatePipe,
    DialogGeserDirective,
  ],
})
export class SuntingHalamanComponent implements OnInit, OnDestroy {
  private readonly dialog = inject(MatDialogRef<SuntingHalamanComponent>);

  /** Salinan kerja — yang asli baru tersentuh bila ditekan Simpan. */
  anotasi: AnotasiSunting[] = [];

  gambar = '';
  memuat = true;
  gagal = false;

  alatAktif: 'tutup' | 'catatan' | null = null;

  /** Indeks coretan yang sedang digeser/diubah ukurannya. */
  private seret: {
    i: number;
    mode: 'geser' | 'ukur';
    mulaiX: number;
    mulaiY: number;
    asal: AnotasiSunting;
    kotak: DOMRect;
  } | null = null;

  constructor(@Inject(MAT_DIALOG_DATA) public data: DataSuntingHalaman) {
    this.anotasi = (data.anotasi || []).map((a) => ({ ...a }));
  }

  async ngOnInit(): Promise<void> {
    try {
      this.gambar = await this.gambarHalaman();
    } catch (e) {
      console.error('Gagal menggambar halaman untuk disunting:', e);
      this.gagal = true;
    } finally {
      this.memuat = false;
    }
  }

  ngOnDestroy(): void {
    this.lepasPendengar();
  }

  /**
   * Gambar halamannya sebesar yang masih masuk akal untuk layar.
   *
   * Skala dihitung dari lebar halaman, bukan dipatok: halaman A4 tegak dan
   * gambar kerja A1 melintang berbeda jauh, dan skala tetap membuat yang
   * satu buram sementara yang lain menghabiskan memori tanpa perlu.
   */
  private async gambarHalaman(): Promise<string> {
    const pdfjslib: any = await import('pdfjs-dist');
    // Alamat yang SAMA dengan halaman PDF — termasuk penanda versinya.
    // Dua alamat berbeda berarti dua worker diunduh untuk satu pekerjaan.
    pdfjslib.GlobalWorkerOptions.workerSrc = JALUR_WORKER_PDF;

    const bita = Uint8Array.from(atob(this.data.pdf), (c) => c.charCodeAt(0));
    const dok = await pdfjslib.getDocument({ data: bita }).promise;
    try {
      const hal = await dok.getPage(1);
      // Rotasi DITERAPKAN DI SINI, bukan lewat CSS: lapisan coretan harus
      // berada pada kerangka yang sama dengan gambarnya, kalau tidak letak
      // yang ditunjuk bukan letak yang tersimpan.
      const putar = ((this.data.rotation || 0) % 360 + 360) % 360;
      const satuan = hal.getViewport({ scale: 1, rotation: putar });
      const lebarTarget = Math.min(1100, Math.max(700, satuan.width));
      const skala = Math.min(3, lebarTarget / satuan.width);
      const viewport = hal.getViewport({ scale: skala, rotation: putar });

      const kanvas = document.createElement('canvas');
      kanvas.width = Math.floor(viewport.width);
      kanvas.height = Math.floor(viewport.height);
      await hal.render({
        canvasContext: kanvas.getContext('2d')!,
        viewport,
      }).promise;
      return kanvas.toDataURL('image/jpeg', 0.92);
    } finally {
      try {
        await dok.cleanup?.();
        await dok.destroy?.();
      } catch {}
    }
  }

  pilihAlat(alat: 'tutup' | 'catatan'): void {
    this.alatAktif = this.alatAktif === alat ? null : alat;
  }

  /** Taruh coretan baru pada titik yang ditekan. */
  taruh(ev: MouseEvent): void {
    if (!this.alatAktif) return;
    const kotak = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    const x = (ev.clientX - kotak.left) / kotak.width;
    const y = (ev.clientY - kotak.top) / kotak.height;

    if (this.alatAktif === 'tutup') {
      this.anotasi.push({
        jenis: 'tutup',
        x: this.jepit(x - 0.12),
        y: this.jepit(y - 0.012),
        lebar: 0.24,
        tinggi: 0.024,
        teks: '',
      });
    } else {
      this.anotasi.push({
        jenis: 'catatan',
        x: this.jepit(x),
        y: this.jepit(y),
        teks: '',
      });
    }
    this.alatAktif = null;
  }

  hapus(i: number): void {
    this.anotasi.splice(i, 1);
  }

  /**
   * Mulai menggeser atau mengubah ukuran.
   *
   * Pendengar dipasang pada `window`, bukan pada kotaknya: menggeser cepat
   * membuat penunjuk meninggalkan kotak kecil itu, dan geserannya berhenti
   * di tengah jalan.
   */
  mulaiSeret(
    ev: MouseEvent,
    i: number,
    mode: 'geser' | 'ukur',
    wadah: HTMLElement,
  ): void {
    ev.preventDefault();
    ev.stopPropagation();
    this.seret = {
      i,
      mode,
      mulaiX: ev.clientX,
      mulaiY: ev.clientY,
      asal: { ...this.anotasi[i] },
      kotak: wadah.getBoundingClientRect(),
    };
    window.addEventListener('mousemove', this.saatGerak);
    window.addEventListener('mouseup', this.saatLepas);
  }

  private readonly saatGerak = (ev: MouseEvent): void => {
    const s = this.seret;
    if (!s) return;
    const dx = (ev.clientX - s.mulaiX) / s.kotak.width;
    const dy = (ev.clientY - s.mulaiY) / s.kotak.height;
    const a = this.anotasi[s.i];
    if (!a) return;

    if (s.mode === 'geser') {
      a.x = this.jepit((s.asal.x ?? 0) + dx);
      a.y = this.jepit((s.asal.y ?? 0) + dy);
    } else {
      // Ukuran terkecil dijaga: kotak yang menyusut menjadi nol hilang dari
      // layar dan tidak dapat diambil kembali selain dengan menghapusnya.
      a.lebar = Math.min(1, Math.max(0.02, (s.asal.lebar ?? 0.24) + dx));
      a.tinggi = Math.min(1, Math.max(0.008, (s.asal.tinggi ?? 0.024) + dy));
    }
  };

  private readonly saatLepas = (): void => {
    this.seret = null;
    this.lepasPendengar();
  };

  private lepasPendengar(): void {
    window.removeEventListener('mousemove', this.saatGerak);
    window.removeEventListener('mouseup', this.saatLepas);
  }

  private jepit(n: number): number {
    return Math.min(1, Math.max(0, n));
  }

  simpan(): void {
    // Coretan KOSONG dibuang saat menyimpan.
    //
    // Penutup polos memang berguna tanpa teks — ia menutupi. Catatan tanpa
    // teks tidak menggambar apa pun ke berkasnya, sehingga yang tertinggal
    // hanyalah kotak di layar yang membuat orang mengira ada sesuatu di
    // sana.
    const bersih = this.anotasi.filter(
      (a) => a.jenis === 'tutup' || (a.teks || '').trim().length > 0,
    );
    this.dialog.close(bersih);
  }

  batal(): void {
    this.dialog.close();
  }
}
