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
  /** Bentuk penutup; kosong = kotak. */
  bentuk?: BentukTutup;
  /** Warna penutup `#rrggbb`; kosong = putih. */
  warna?: string;
  /** Isi penutup; kosong = warna polos. */
  isi?: IsiTutup;
  /** Kepekatan 0–1; kosong = 1 (pekat penuh). */
  opasitas?: number;
  /** Rupa huruf catatan; kosong = `sans`. */
  fonta?: FontaCatatan;
  /** Besar huruf catatan dalam titik; kosong = 10. */
  ukuran?: number;
  /** Huruf tebal. */
  tebal?: boolean;
}

/** Rupa huruf yang tersedia untuk catatan. */
export type FontaCatatan = 'sans' | 'serif' | 'mono';

/** Bentuk penutup yang tersedia. */
export type BentukTutup = 'kotak' | 'lingkaran' | 'segitiga';

/**
 * Isi penutup.
 *
 * `buram` BUKAN penyamaran yang aman — lihat keterangan `buatIsi`.
 */
export type IsiTutup = 'warna' | 'garis' | 'silang' | 'titik' | 'buram';

/**
 * Ukuran bawaan per bentuk, sebagai pecahan halaman.
 *
 * Kotak dibuat setipis satu baris teks — itu memang gunanya, menutupi satu
 * baris. Lingkaran dan segitiga dengan ukuran yang sama akan jadi elips
 * gepeng dan segitiga rebah, jadi keduanya dibuat lebih pendek dan tinggi.
 */
const UKURAN_BAWAAN: Record<BentukTutup, { lebar: number; tinggi: number }> = {
  kotak: { lebar: 0.24, tinggi: 0.024 },
  lingkaran: { lebar: 0.12, tinggi: 0.08 },
  segitiga: { lebar: 0.12, tinggi: 0.08 },
};

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

  /** Lebar halaman sebagaimana ditampilkan, dalam titik. */
  lebarPt = 595;

  /**
   * Lebar kertas di layar, dalam piksel.
   *
   * Diukur, bukan dihitung: kertasnya menyusut mengikuti lebar dialog, dan
   * dialognya sendiri berubah bila jendelanya diubah ukurannya.
   */
  lebarKertasPx = 595;

  alatAktif: 'tutup' | 'catatan' | 'ttd' | 'pipet' | null = null;

  /**
   * Coretan yang sedang disunting, atau null.
   *
   * Setelan pada bilah alat berlaku untuk coretan INI selama ada yang
   * terpilih, dan untuk coretan berikutnya bila tidak ada. Sebelumnya
   * keduanya dipisah: setelan hanya berlaku untuk yang berikutnya, dan
   * yang sudah ada harus ditimpa lewat tombol kuas tersendiri — satu
   * langkah tambahan yang tidak dimengerti siapa pun yang sekadar ingin
   * mengganti warna kotak yang barusan ditaruhnya.
   */
  terpilih: number | null = null;

  /** Bentuk, isi, warna & kepekatan penutup BERIKUTNYA yang ditaruh. */
  bentukTutup: BentukTutup = 'kotak';
  warnaTutup = '#ffffff';
  isiTutup: IsiTutup = 'warna';
  /** Dalam PERSEN — itu yang tampil pada penggesernya. */
  opasitasTutup = 100;

  /** Rupa, besar, tebal & warna catatan BERIKUTNYA yang ditaruh. */
  fontaCatatan: FontaCatatan = 'sans';
  ukuranCatatan = 10;
  tebalCatatan = false;
  warnaCatatan = '#b3322f';

  readonly fonta: readonly { nilai: FontaCatatan; ikon: string }[] = [
    { nilai: 'sans', ikon: 'text_fields' },
    { nilai: 'serif', ikon: 'format_italic' },
    { nilai: 'mono', ikon: 'code' },
  ];

  /** Besar huruf yang lazim; bebas diketik di luar daftar ini. */
  readonly ukuranPilihan: readonly number[] = [8, 9, 10, 12, 14, 18, 24, 32];

  readonly isian: readonly { nilai: IsiTutup; ikon: string }[] = [
    { nilai: 'warna', ikon: 'format_color_fill' },
    { nilai: 'buram', ikon: 'blur_on' },
    { nilai: 'garis', ikon: 'density_medium' },
    { nilai: 'silang', ikon: 'grid_4x4' },
    { nilai: 'titik', ikon: 'more_horiz' },
  ];

  /** Warna yang sering dipakai — menutup di atas kertas, kop, dan stempel. */
  readonly warnaCepat: readonly string[] = [
    '#ffffff',
    '#000000',
    '#f3f4f6',
    '#fde68a',
    '#154dec',
    '#b3322f',
  ];

  readonly bentuk: readonly { nilai: BentukTutup; ikon: string }[] = [
    { nilai: 'kotak', ikon: 'crop_square' },
    { nilai: 'lingkaran', ikon: 'circle' },
    { nilai: 'segitiga', ikon: 'change_history' },
  ];

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
      // Tidak ditunggu: pipet boleh siap belakangan, halamannya jangan.
      void this.siapkanContoh();
    } catch (e) {
      console.error('Gagal menggambar halaman untuk disunting:', e);
      this.gagal = true;
    } finally {
      this.memuat = false;
    }
  }

  ngOnDestroy(): void {
    this.lepasPendengar();
    window.removeEventListener('mousemove', this.saatGambar);
    window.removeEventListener('mouseup', this.saatLepasGambar);
    this.pengamatKertas?.disconnect();
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
      // Lebar tampilan dalam TITIK — dipakai menyetarakan besar huruf
      // catatan di layar dengan yang nanti tercetak.
      this.lebarPt = satuan.width || 595;
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

  pilihAlat(alat: 'tutup' | 'catatan' | 'ttd' | 'pipet'): void {
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

    // Menyalakan alat penaruh MELEPAS pilihan: sesudahnya yang disetel
    // adalah coretan yang akan ditaruh, bukan yang sudah ada. Pipet
    // dikecualikan — justru gunanya mewarnai yang sedang terpilih.
    if (alat !== 'pipet') this.terpilih = null;

    this.alatAktif = this.alatAktif === alat ? null : alat;
  }

  // ---- yang terpilih ------------------------------------------------------

  /** Jenis coretan yang sedang terpilih, atau null bila tidak ada. */
  get jenisTerpilih(): AnotasiSunting['jenis'] | null {
    const a = this.terpilih === null ? null : this.anotasi[this.terpilih];
    return a ? a.jenis : null;
  }

  /**
   * Baris setelan hanya muncul kalau ADA YANG DISETEL.
   *
   * Sebelumnya kedua barisnya — penutup dan catatan — selalu terpampang,
   * berisi lima belas kontrol yang sebagian besarnya tidak berlaku untuk
   * apa pun yang sedang dikerjakan. Yang membuka dialog ini melihat dinding
   * tombol dan tidak tahu mana yang mengenai apa.
   *
   * Sekarang paling banyak SATU baris tampil sekaligus: setelan coretan
   * yang sedang terpilih, atau — bila belum ada yang ditaruh — setelan alat
   * yang sedang menyala, supaya warnanya masih dapat dipilih SEBELUM
   * coretannya ditaruh.
   */
  get tampilSetelanTutup(): boolean {
    if (this.jenisTerpilih) return this.jenisTerpilih === 'tutup';
    return this.alatAktif === 'tutup' || this.alatAktif === 'pipet';
  }

  get tampilSetelanCatatan(): boolean {
    if (this.jenisTerpilih) return this.jenisTerpilih === 'catatan';
    return this.alatAktif === 'catatan';
  }

  /** Baris setelan sedang menyunting coretan yang ada, bukan yang berikutnya. */
  get menyuntingTerpilih(): boolean {
    return this.jenisTerpilih !== null;
  }

  private get tutupTerpilih(): AnotasiSunting | null {
    const a = this.terpilih === null ? null : this.anotasi[this.terpilih];
    return a && a.jenis === 'tutup' ? a : null;
  }

  private get catatanTerpilih(): AnotasiSunting | null {
    const a = this.terpilih === null ? null : this.anotasi[this.terpilih];
    return a && a.jenis === 'catatan' ? a : null;
  }

  /**
   * Pilih satu coretan, dan BAWA BILAH ALATNYA ikut ke setelan coretan itu.
   *
   * Tanpa langkah kedua, bilah alatnya menampilkan setelan yang lain
   * daripada yang sedang disunting — dan menyentuh apa pun di sana akan
   * mengubah coretannya menjadi sesuatu yang tidak diminta.
   */
  pilihAnotasi(i: number, ev: Event): void {
    ev.stopPropagation();
    this.terpilih = i;
    const a = this.anotasi[i];
    if (!a) return;
    if (a.jenis === 'tutup') {
      this.bentukTutup = a.bentuk ?? 'kotak';
      this.isiTutup = a.isi ?? 'warna';
      this.warnaTutup = a.warna ?? '#ffffff';
      this.opasitasTutup = Math.round((a.opasitas ?? 1) * 100);
    } else if (a.jenis === 'catatan') {
      this.fontaCatatan = a.fonta ?? 'sans';
      this.ukuranCatatan = a.ukuran ?? 10;
      this.tebalCatatan = !!a.tebal;
      this.warnaCatatan = a.warna ?? '#b3322f';
    }
  }

  setBentuk(b: BentukTutup): void {
    this.bentukTutup = b;
    const a = this.tutupTerpilih;
    if (!a) return;
    a.bentuk = b;
    // Isi bergambar dipotong mengikuti bentuknya, jadi bentuknya berubah
    // berarti gambarnya harus dibuat ulang.
    this.perbaruiIsi(a);
  }

  setIsi(i: IsiTutup): void {
    this.isiTutup = i;
    const a = this.tutupTerpilih;
    if (!a) return;
    a.isi = i;
    this.perbaruiIsi(a);
  }

  setWarnaTutup(w: string): void {
    this.warnaTutup = w;
    const a = this.tutupTerpilih;
    if (!a) return;
    a.warna = w;
    // Pola memakai warnanya sebagai dasar, jadi gambarnya ikut berubah.
    this.perbaruiIsi(a);
  }

  setOpasitas(n: number): void {
    this.opasitasTutup = n;
    const a = this.tutupTerpilih;
    if (a) a.opasitas = n / 100;
  }

  setFonta(f: FontaCatatan): void {
    this.fontaCatatan = f;
    const a = this.catatanTerpilih;
    if (a) a.fonta = f;
  }

  setUkuran(n: number): void {
    this.ukuranCatatan = n;
    const a = this.catatanTerpilih;
    if (a) a.ukuran = n;
  }

  setTebal(t: boolean): void {
    this.tebalCatatan = t;
    const a = this.catatanTerpilih;
    if (a) a.tebal = t;
  }

  setWarnaCatatan(w: string): void {
    this.warnaCatatan = w;
    const a = this.catatanTerpilih;
    if (a) a.warna = w;
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

  private pengamatKertas?: ResizeObserver;

  /**
   * Amati lebar kertasnya supaya besar huruf catatan ikut menyesuaikan.
   *
   * `ResizeObserver` tidak selalu ada (peramban lama, sebagian lingkungan
   * uji), jadi ketiadaannya bukan galat — besar hurufnya sekadar memakai
   * lebar terakhir yang diketahui.
   */
  @ViewChild('kertas') set kertasRef(el: ElementRef<HTMLElement> | undefined) {
    this.pengamatKertas?.disconnect();
    this.pengamatKertas = undefined;
    if (!el) return;

    const ukur = () => {
      const l = el.nativeElement.getBoundingClientRect().width;
      if (l > 0) this.lebarKertasPx = l;
    };

    if (typeof ResizeObserver === 'undefined') {
      // Penyetel `ViewChild` berjalan SESUDAH tampilannya diperiksa, jadi
      // mengubah nilai terikat di sini melempar
      // `ExpressionChangedAfterItHasBeenChecked` pada mode pengembangan.
      // `ResizeObserver` sendiri memanggil balik secara asinkron, jadi
      // hanya jalur cadangan ini yang perlu ditunda.
      setTimeout(ukur);
      return;
    }
    this.pengamatKertas = new ResizeObserver(ukur);
    this.pengamatKertas.observe(el.nativeElement);
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

  // ---- menggambar penutup dengan menarik --------------------------------

  /**
   * Kotak yang sedang ditarik, dalam pecahan halaman. Null bila tidak.
   *
   * Disimpan TERPISAH dari `anotasi`: kotak yang belum dilepas belum tentu
   * jadi. Menaruhnya lebih dulu ke daftar berarti tarikan yang dibatalkan
   * meninggalkan coretan, dan setiap gerakan tetikus menandai dokumennya
   * berubah.
   */
  gambar2: { x1: number; y1: number; x2: number; y2: number } | null = null;

  private kotakGambar: DOMRect | null = null;

  /**
   * Klik yang HARUS DIABAIKAN karena sudah dilayani sebagai tarikan.
   *
   * Peramban mengirim `click` sesudah `mouseup`. Tanpa penanda ini, satu
   * tarikan menghasilkan DUA penutup: satu seukuran tarikannya, satu lagi
   * seukuran bawaan di titik yang sama.
   */
  private abaikanKlik = false;

  /** Ambang piksel yang memisahkan "menarik" dari "mengklik". */
  private static readonly AMBANG_SERET = 6;

  mulaiGambar(ev: MouseEvent): void {
    // Hanya alat penutup. Catatan tidak punya ukuran, dan tanda tangan
    // ditaruh seukuran gambarnya supaya tidak gepeng.
    if (this.alatAktif !== 'tutup') return;
    ev.preventDefault();
    const kotak = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    this.kotakGambar = kotak;
    const x = this.jepit((ev.clientX - kotak.left) / kotak.width);
    const y = this.jepit((ev.clientY - kotak.top) / kotak.height);
    this.gambar2 = { x1: x, y1: y, x2: x, y2: y };
    window.addEventListener('mousemove', this.saatGambar);
    window.addEventListener('mouseup', this.saatLepasGambar);
  }

  private readonly saatGambar = (ev: MouseEvent): void => {
    const g = this.gambar2;
    const kotak = this.kotakGambar;
    if (!g || !kotak) return;
    g.x2 = this.jepit((ev.clientX - kotak.left) / kotak.width);
    g.y2 = this.jepit((ev.clientY - kotak.top) / kotak.height);
  };

  private readonly saatLepasGambar = (ev: MouseEvent): void => {
    const g = this.gambar2;
    const kotak = this.kotakGambar;
    this.gambar2 = null;
    this.kotakGambar = null;
    window.removeEventListener('mousemove', this.saatGambar);
    window.removeEventListener('mouseup', this.saatLepasGambar);
    if (!g || !kotak) return;

    const lebarPx = Math.abs(g.x2 - g.x1) * kotak.width;
    const tinggiPx = Math.abs(g.y2 - g.y1) * kotak.height;
    // Tarikan yang terlalu pendek DIANGGAP KLIK, dan dibiarkan jatuh ke
    // `taruh()` — yang menaruh kotak seukuran bawaan. Menganggapnya tarikan
    // akan menghasilkan penutup sebesar dua piksel yang tidak terlihat dan
    // tidak dapat diambil kembali.
    if (Math.hypot(lebarPx, tinggiPx) < SuntingHalamanComponent.AMBANG_SERET) {
      return;
    }

    const x = Math.min(g.x1, g.x2);
    const y = Math.min(g.y1, g.y2);
    // Batas terkecil sama dengan yang dipakai saat mengubah ukuran, supaya
    // kotak yang digambar tipis sekali tetap dapat dipegang kembali.
    const lebar = Math.max(0.01, Math.abs(g.x2 - g.x1));
    const tinggi = Math.max(0.008, Math.abs(g.y2 - g.y1));

    const a: AnotasiSunting = {
      jenis: 'tutup',
      x,
      y,
      lebar: Math.min(lebar, 1 - x),
      tinggi: Math.min(tinggi, 1 - y),
      teks: '',
      bentuk: this.bentukTutup,
      warna: this.warnaTutup,
      isi: this.isiTutup,
      opasitas: this.opasitasTutup / 100,
    };
    this.perbaruiIsi(a);
    this.anotasi.push(a);
    this.terpilih = this.anotasi.length - 1;
    this.alatAktif = null;
    this.abaikanKlik = true;
  };

  /** Kotak pratinjau saat menarik, dalam persen — untuk gayanya di layar. */
  get pratinjauGambar(): {
    left: number;
    top: number;
    width: number;
    height: number;
  } | null {
    const g = this.gambar2;
    if (!g) return null;
    return {
      left: Math.min(g.x1, g.x2) * 100,
      top: Math.min(g.y1, g.y2) * 100,
      width: Math.abs(g.x2 - g.x1) * 100,
      height: Math.abs(g.y2 - g.y1) * 100,
    };
  }

  /** Taruh coretan baru pada titik yang ditekan. */
  taruh(ev: MouseEvent): void {
    if (this.abaikanKlik) {
      this.abaikanKlik = false;
      return;
    }
    if (!this.alatAktif) {
      // Menekan bagian kertas yang kosong melepas pilihan — kalau tidak,
      // setelan di bilah alat tetap mengenai coretan yang sudah lama tidak
      // dilihat orangnya.
      this.terpilih = null;
      return;
    }
    const kotak = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    const x = (ev.clientX - kotak.left) / kotak.width;
    const y = (ev.clientY - kotak.top) / kotak.height;

    if (this.alatAktif === 'pipet') {
      // Pipet TIDAK menaruh apa pun; ia hanya mengambil warna, lalu
      // menyerahkan giliran kembali ke alat penutup — yang hampir selalu
      // menjadi maksud mengambil warnanya.
      const w = this.warnaDiTitik(x, y);
      // Lewat penyetelnya, supaya warnanya ikut mengenai penutup yang
      // sedang terpilih — bukan hanya penutup berikutnya.
      if (w) this.setWarnaTutup(w);
      this.alatAktif = 'tutup';
      return;
    }

    if (this.alatAktif === 'tutup') {
      const u = UKURAN_BAWAAN[this.bentukTutup];
      const a: AnotasiSunting = {
        jenis: 'tutup',
        x: this.jepit(x - u.lebar / 2),
        y: this.jepit(y - u.tinggi / 2),
        lebar: u.lebar,
        tinggi: u.tinggi,
        teks: '',
        bentuk: this.bentukTutup,
        warna: this.warnaTutup,
        isi: this.isiTutup,
        opasitas: this.opasitasTutup / 100,
      };
      this.perbaruiIsi(a);
      this.anotasi.push(a);
      this.terpilih = this.anotasi.length - 1;
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
      this.terpilih = this.anotasi.length - 1;
    } else {
      this.anotasi.push({
        jenis: 'catatan',
        x: this.jepit(x),
        y: this.jepit(y),
        teks: '',
        warna: this.warnaCatatan,
        fonta: this.fontaCatatan,
        ukuran: this.ukuranCatatan,
        tebal: this.tebalCatatan,
      });
      this.terpilih = this.anotasi.length - 1;
    }
    this.alatAktif = null;
  }

  // ---- isi penutup: buram & pola -----------------------------------------

  /**
   * Segarkan gambar isi penutup.
   *
   * `buram` dan pola dibuat sebagai GAMBAR, bukan digambar ulang oleh
   * pdf-lib: keduanya bergantung pada apa yang ada DI BAWAH penutupnya
   * (buram) atau perlu dipotong mengikuti bentuknya (pola pada lingkaran
   * dan segitiga) — dua hal yang tidak dapat dilakukan pdf-lib tanpa
   * pemotongan, sementara kanvas melakukannya dalam satu baris.
   *
   * Karena isinya bergantung pada LETAK dan UKURAN, ia dibuat ulang setiap
   * kali coretannya selesai digeser atau diubah ukurannya.
   */
  private perbaruiIsi(a: AnotasiSunting): void {
    if (a.jenis !== 'tutup') return;
    if (!a.isi || a.isi === 'warna') {
      a.gambar = undefined;
      return;
    }
    const g = this.buatIsi(a);
    if (g) {
      a.gambar = g;
    } else {
      // Tanpa salinan halaman, buram tidak dapat dibuat. Jatuh ke warna
      // polos — yang tetap MENUTUPI; membiarkannya kosong justru membuat
      // yang ditutup tetap terbaca.
      a.isi = 'warna';
      a.gambar = undefined;
    }
  }

  /**
   * PNG ber-alfa seukuran kotaknya, sudah terpotong mengikuti bentuknya.
   *
   * PERLU DIINGAT, dan ini bukan cacat melainkan sifat PDF: baik buram
   * maupun warna polos hanya MENUTUPI — teks aslinya tetap ada di dalam
   * berkasnya dan masih dapat disalin. Untuk menghilangkannya sungguhan,
   * halamannya harus diubah menjadi gambar.
   */
  private buatIsi(a: AnotasiSunting): string | null {
    const lebar = a.lebar ?? 0.24;
    const tinggi = a.tinggi ?? 0.024;
    if (lebar <= 0 || tinggi <= 0) return null;

    let W: number;
    let H: number;
    const src = this.contoh;
    if (a.isi === 'buram') {
      if (!src) return null;
      W = Math.round(lebar * src.canvas.width);
      H = Math.round(tinggi * src.canvas.height);
    } else {
      // Pola tidak menyalin apa pun, jadi kerapatannya dipatok sendiri —
      // cukup tinggi supaya tetap tajam waktu dicetak.
      W = Math.round(lebar * 2400);
      H = Math.round(tinggi * 3200);
    }
    W = Math.min(1600, Math.max(8, W));
    H = Math.min(1600, Math.max(8, H));

    const kanvas = document.createElement('canvas');
    kanvas.width = W;
    kanvas.height = H;
    const ctx = kanvas.getContext('2d');
    if (!ctx) return null;

    this.potongBentuk(ctx, a.bentuk, W, H);
    if (a.isi === 'buram') this.gambarBuram(ctx, src!, a, W, H);
    else this.gambarPola(ctx, a.isi!, W, H, a.warna);

    return kanvas.toDataURL('image/png');
  }

  /** Batasi penggambaran pada bentuk yang dipilih. */
  private potongBentuk(
    ctx: CanvasRenderingContext2D,
    bentuk: BentukTutup | undefined,
    W: number,
    H: number,
  ): void {
    ctx.beginPath();
    if (bentuk === 'lingkaran') {
      ctx.ellipse(W / 2, H / 2, W / 2, H / 2, 0, 0, Math.PI * 2);
    } else if (bentuk === 'segitiga') {
      ctx.moveTo(W / 2, 0);
      ctx.lineTo(W, H);
      ctx.lineTo(0, H);
      ctx.closePath();
    } else {
      ctx.rect(0, 0, W, H);
    }
    ctx.clip();
  }

  /**
   * Mosaik, bukan pengaburan Gauss.
   *
   * Pengaburan yang lembut MASIH DAPAT DIBALIK pada teks: ragam hurufnya
   * terbatas, dan angka apalagi. Mosaik kasar membuang informasinya —
   * itulah gunanya menurunkan gambarnya ke sepersepuluh lalu membesarkannya
   * kembali TANPA penghalusan.
   */
  private gambarBuram(
    ctx: CanvasRenderingContext2D,
    src: CanvasRenderingContext2D,
    a: AnotasiSunting,
    W: number,
    H: number,
  ): void {
    const sk = src.canvas;
    const sx = (a.x ?? 0) * sk.width;
    const sy = (a.y ?? 0) * sk.height;
    const sw = Math.max(1, (a.lebar ?? 0.24) * sk.width);
    const sh = Math.max(1, (a.tinggi ?? 0.024) * sk.height);

    const kw = Math.max(2, Math.round(W / 10));
    const kh = Math.max(2, Math.round(H / 10));
    const kecil = document.createElement('canvas');
    kecil.width = kw;
    kecil.height = kh;
    const kctx = kecil.getContext('2d');
    if (!kctx) return;
    kctx.drawImage(sk, sx, sy, sw, sh, 0, 0, kw, kh);

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(kecil, 0, 0, kw, kh, 0, 0, W, H);
  }

  /**
   * Pola di atas dasar PEKAT.
   *
   * Pola dengan latar tembus pandang tidak menutupi apa pun — yang di
   * bawahnya tetap terbaca di sela-sela garisnya, dan itu bukan yang
   * dimaui orang yang memilih alat penutup.
   */
  private gambarPola(
    ctx: CanvasRenderingContext2D,
    pola: IsiTutup,
    W: number,
    H: number,
    warna?: string,
  ): void {
    const dasar = warna || '#ffffff';
    ctx.fillStyle = dasar;
    ctx.fillRect(0, 0, W, H);

    const tinta = this.warnaTeks(dasar);
    ctx.strokeStyle = tinta;
    ctx.fillStyle = tinta;

    const jarak = Math.max(6, Math.round(Math.min(W, H) / 8));
    ctx.lineWidth = Math.max(1, jarak / 7);

    if (pola === 'titik') {
      const r = Math.max(1, jarak / 6);
      for (let y = jarak / 2; y < H; y += jarak) {
        for (let x = jarak / 2; x < W; x += jarak) {
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      return;
    }

    // Garis miring; `silang` menambahkan arah sebaliknya.
    ctx.beginPath();
    for (let i = -H; i < W + H; i += jarak) {
      ctx.moveTo(i, 0);
      ctx.lineTo(i + H, H);
    }
    if (pola === 'silang') {
      for (let i = -H; i < W + H; i += jarak) {
        ctx.moveTo(i, H);
        ctx.lineTo(i + H, 0);
      }
    }
    ctx.stroke();
  }

  /**
   * Besar huruf catatan di layar, dalam piksel.
   *
   * Besar huruf disimpan dalam TITIK karena itulah satuan PDF, sedangkan
   * kertasnya di layar ditampilkan sekecil apa pun yang muat — jadi angka
   * pikselnya harus diskalakan dengan perbandingan keduanya, kalau tidak
   * yang terlihat saat menyunting bukan yang tercetak.
   *
   * Pernah ditulis dengan satuan `cqw` supaya penskalaannya diurus CSS.
   * Itu menuntut `container-type: inline-size` pada kertasnya, dan
   * containment itu MENCIUTKAN kertasnya menjadi nol — halamannya hilang
   * sama sekali. Lihat keterangannya di berkas SCSS-nya.
   */
  ukuranLayar(a: AnotasiSunting): string {
    const pt = a.ukuran && a.ukuran > 0 ? a.ukuran : 10;
    return `${(pt / this.lebarPt) * this.lebarKertasPx}px`;
  }

  /** Rupa huruf di layar yang paling mendekati font baku PDF-nya. */
  fontaLayar(a: AnotasiSunting): string {
    if (a.fonta === 'serif') return '"Times New Roman", Times, serif';
    if (a.fonta === 'mono') return '"Courier New", Courier, monospace';
    return 'Helvetica, Arial, sans-serif';
  }

  /** Warna teks yang terbaca di atas `warna` — sama hitungannya dengan PDF-nya. */
  warnaTeks(warna?: string): string {
    const m = /^#?([0-9a-f]{6})$/i.exec((warna || '').trim());
    if (!m) return '#16181d';
    const n = parseInt(m[1], 16);
    const terang =
      (0.299 * ((n >> 16) & 255) +
        0.587 * ((n >> 8) & 255) +
        0.114 * (n & 255)) /
      255;
    return terang > 0.55 ? '#16181d' : '#ffffff';
  }

  // ---- pipet --------------------------------------------------------------

  /**
   * Salinan halaman pada kanvas, khusus untuk mengambil warna.
   *
   * Diambil dari GAMBAR HALAMANNYA, bukan dari layar: `EyeDropper` bawaan
   * peramban mengambil warna piksel LAYAR — sudah lewat penskalaan,
   * pelembutan, dan mode gelap kalau ada — sehingga warna yang terambil
   * bukan warna yang ada di berkasnya. Ia juga hanya ada di sebagian
   * peramban.
   */
  private contoh: CanvasRenderingContext2D | null = null;
  private contohGagal = false;

  private async siapkanContoh(): Promise<void> {
    if (this.contoh || this.contohGagal || !this.gambar) return;
    try {
      const img = new Image();
      await new Promise<void>((selesai, gagal) => {
        img.onload = () => selesai();
        img.onerror = () => gagal(new Error('gambar halaman tidak terbaca'));
        img.src = this.gambar;
      });
      const kanvas = document.createElement('canvas');
      kanvas.width = img.naturalWidth;
      kanvas.height = img.naturalHeight;
      const ctx = kanvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('kanvas tidak tersedia');
      ctx.drawImage(img, 0, 0);
      this.contoh = ctx;
    } catch (e) {
      // Pipetnya mati, sisanya tetap jalan.
      console.error('Pipet tidak dapat disiapkan:', e);
      this.contohGagal = true;
    }
  }

  /** Pipet baru dapat dipakai setelah salinan halamannya siap. */
  get pipetSiap(): boolean {
    return !!this.contoh;
  }

  /** `#rrggbb` pada titik pecahan (x, y), atau null bila tidak terbaca. */
  warnaDiTitik(x: number, y: number): string | null {
    const ctx = this.contoh;
    if (!ctx) return null;
    const k = ctx.canvas;
    const px = Math.min(k.width - 1, Math.max(0, Math.round(x * k.width)));
    const py = Math.min(k.height - 1, Math.max(0, Math.round(y * k.height)));
    try {
      const d = ctx.getImageData(px, py, 1, 1).data;
      return (
        '#' +
        [d[0], d[1], d[2]]
          .map((n) => n.toString(16).padStart(2, '0'))
          .join('')
      );
    } catch {
      return null;
    }
  }

  hapus(i: number): void {
    this.anotasi.splice(i, 1);
    // Indeksnya bergeser. Tanpa ini, menghapus satu coretan membuat bilah
    // alat menyunting TETANGGANYA tanpa ada yang menyadarinya.
    if (this.terpilih === null) return;
    if (this.terpilih === i) this.terpilih = null;
    else if (this.terpilih > i) this.terpilih -= 1;
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
    this.pilihAnotasi(i, ev);
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
    const s = this.seret;
    this.seret = null;
    this.lepasPendengar();
    // Isi buram & pola bergantung pada LETAK dan UKURAN kotaknya, jadi
    // keduanya dibuat ulang begitu geserannya selesai — bukan pada setiap
    // gerakan tetikus, yang akan membuat penyuntingan tersendat.
    if (s && this.anotasi[s.i]) this.perbaruiIsi(this.anotasi[s.i]);
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
