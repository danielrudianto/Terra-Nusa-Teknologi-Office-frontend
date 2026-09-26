// Lihat keterangannya di berkas itu — dialog ini memuat pdf.js sendiri
// lewat impor dinamis, jadi tambalannya disebut di sini juga.
import '../../../polyfill-peta';
import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
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
  jenis: 'tutup' | 'catatan' | 'ttd';
  x: number;
  y: number;
  lebar?: number;
  tinggi?: number;
  teks?: string;
  /** Gambar tanda tangan sebagai data-URI PNG (berlatar tembus pandang). */
  gambar?: string;
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

  alatAktif: 'tutup' | 'catatan' | 'ttd' | null = null;

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
    this.ttdSiap = this.ttdTersimpan();
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

  pilihAlat(alat: 'tutup' | 'catatan' | 'ttd'): void {
    // Tanda tangan perlu ada gambarnya dulu; alatnya baru menyala sesudah
    // itu. Tanpa urutan ini, menekan halaman menaruh kotak kosong.
    //
    // Kalau tanda tangannya sudah ada — digambar tadi, atau tersimpan dari
    // berkas sebelumnya — alatnya langsung menyala tanpa membuka papan
    // lagi: membubuhkan tanda tangan kedua tidak perlu menggambar ulang.
    if (alat === 'ttd' && this.alatAktif !== 'ttd' && !this.ttdSiap) {
      this.bukaPapanTtd();
      return;
    }
    this.alatAktif = this.alatAktif === alat ? null : alat;
  }

  // ---- papan tanda tangan -------------------------------------------------

  /** Papan gambar sedang terbuka. */
  papanTtd = false;

  /**
   * Tanda tangan yang siap dibubuhkan, sebagai data-URI PNG.
   *
   * Diisi dari simpanan begitu dialognya dibuka, sehingga tombol alatnya
   * langsung siap pakai pada berkas berikutnya.
   */
  ttdSiap: string | null = null;

  /**
   * Tanda tangan terakhir, diingat antar berkas.
   *
   * `localStorage`, dan itu memang tempatnya: ia kenyamanan satu orang di
   * satu peramban — bukan data perusahaan. Tidak pernah dikirim ke server,
   * dan hilangnya tidak merusak apa pun; yang terjadi hanya perlu
   * menggambar ulang.
   *
   * Dibungkus `try` karena penyimpanan dapat ditolak — jendela penyamaran,
   * atau setelan yang memblokir data situs — dan penolakan itu MELEMPAR,
   * bukan mengembalikan null.
   */
  private static readonly KUNCI_TTD = 'tnt.ttd.terakhir';

  private ttdTersimpan(): string | null {
    try {
      return localStorage.getItem(SuntingHalamanComponent.KUNCI_TTD);
    } catch {
      return null;
    }
  }

  private simpanTtd(src: string): void {
    try {
      localStorage.setItem(SuntingHalamanComponent.KUNCI_TTD, src);
    } catch {
      // Tidak apa-apa — hanya perlu digambar ulang lain kali.
    }
  }

  bukaPapanTtd(): void {
    this.alatAktif = null;
    this.ttdSiap = this.ttdTersimpan();
    this.papanTtd = true;
    this.jejak = [];
  }

  /** Tombol kecil di bilah alat: buka papannya untuk mengganti tanda tangan. */
  gantiTtd(ev: Event): void {
    ev.stopPropagation();
    this.bukaPapanTtd();
  }

  tutupPapanTtd(): void {
    this.papanTtd = false;
  }

  /** Coretan pada papan: setiap goresan sebagai deretan titik. */
  private jejak: { x: number; y: number }[][] = [];
  private sedangGores = false;

  mulaiGores(ev: PointerEvent): void {
    this.sedangGores = true;
    this.jejak.push([]);
    this.gores(ev);
  }

  gores(ev: PointerEvent): void {
    if (!this.sedangGores) return;
    const kanvas = ev.currentTarget as HTMLCanvasElement;
    const kotak = kanvas.getBoundingClientRect();
    // Titiknya disimpan sebagai PECAHAN, bukan piksel: kanvasnya diperbesar
    // saat diubah menjadi gambar, dan piksel yang benar di layar akan
    // meleset pada ukuran itu.
    this.jejak[this.jejak.length - 1].push({
      x: (ev.clientX - kotak.left) / kotak.width,
      y: (ev.clientY - kotak.top) / kotak.height,
    });
    this.gambarUlangPapan(kanvas);
  }

  selesaiGores(): void {
    this.sedangGores = false;
  }

  bersihkanPapan(kanvas?: HTMLCanvasElement): void {
    this.jejak = [];
    this.ttdSiap = null;
    if (kanvas) this.gambarUlangPapan(kanvas);
  }

  private gambarUlangPapan(kanvas: HTMLCanvasElement): void {
    const ctx = kanvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, kanvas.width, kanvas.height);
    ctx.lineWidth = Math.max(2, kanvas.width / 220);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111827';
    for (const goresan of this.jejak) {
      if (!goresan.length) continue;
      ctx.beginPath();
      goresan.forEach((t, i) => {
        const x = t.x * kanvas.width;
        const y = t.y * kanvas.height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
  }

  get papanKosong(): boolean {
    return !this.jejak.some((g) => g.length > 1) && !this.ttdSiap;
  }

  /**
   * Ambil gambar dari papan, lalu nyalakan alatnya.
   *
   * PNG, bukan JPEG: tanda tangan perlu LATAR TEMBUS PANDANG. JPEG tidak
   * punya kanal alfa, sehingga yang tertempel adalah kotak putih berisi
   * coretan — menutupi garis tanda tangan tercetak di bawahnya.
   */
  pakaiTtd(kanvas: HTMLCanvasElement): void {
    if (this.jejak.some((g) => g.length > 1)) {
      this.ttdSiap = kanvas.toDataURL('image/png');
      this.simpanTtd(this.ttdSiap);
    }
    if (!this.ttdSiap) return;
    this.papanTtd = false;
    this.alatAktif = 'ttd';
  }

  /**
   * Papannya baru ada di DOM sesudah `papanTtd` menyala, jadi gambarnya
   * dipulihkan lewat penyetel `ViewChild` — yang dipanggil tepat ketika
   * elemennya muncul. Memanggilnya dari `bukaPapanTtd` akan kena kanvas
   * yang belum dibuat.
   */
  @ViewChild('papan') set papanRef(el: ElementRef<HTMLCanvasElement> | undefined) {
    if (el) this.siapkanPapan(el.nativeElement);
  }

  /** Gambar papan dari tanda tangan tersimpan saat papannya dibuka. */
  siapkanPapan(kanvas: HTMLCanvasElement): void {
    if (!this.ttdSiap || this.jejak.length) return;
    const img = new Image();
    img.onload = () => {
      const ctx = kanvas.getContext('2d');
      ctx?.clearRect(0, 0, kanvas.width, kanvas.height);
      ctx?.drawImage(img, 0, 0, kanvas.width, kanvas.height);
    };
    img.src = this.ttdSiap;
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
    } else if (this.alatAktif === 'ttd') {
      // Ukuran bawaan kira-kira selebar kolom tanda tangan pada surat
      // berkop: cukup terbaca, dan tetap dapat diubah sesudah ditaruh.
      this.anotasi.push({
        jenis: 'ttd',
        x: this.jepit(x - 0.11),
        y: this.jepit(y - 0.03),
        lebar: 0.22,
        tinggi: 0.06,
        gambar: this.ttdSiap || undefined,
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
      (a) =>
        a.jenis === 'tutup' ||
        (a.jenis === 'ttd' && !!a.gambar) ||
        (a.teks || '').trim().length > 0,
    );
    this.dialog.close(bersih);
  }

  batal(): void {
    this.dialog.close();
  }
}
