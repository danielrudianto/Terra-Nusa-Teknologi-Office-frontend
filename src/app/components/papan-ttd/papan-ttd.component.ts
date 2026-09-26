import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  ViewChild,
  output,
} from '@angular/core';

/**
 * PAPAN TANDA TANGAN — satu papan untuk seluruh aplikasi.
 *
 * Dipakai dua tempat: alat tanda tangan pada penyunting PDF, dan dialog
 * "Tanda tangan saya" yang diminta saat login. Dipisahkan menjadi komponen
 * justru karena keduanya ada: dua salinan papan berarti perbaikan pena
 * (tekanan, tolak telapak) hanya sampai di salah satunya, dan yang tertinggal
 * tidak akan menimbulkan galat apa pun — ia sekadar terasa lebih buruk tanpa
 * ada yang tahu sebabnya.
 *
 * MENULIS DENGAN PENA
 *
 * Lima hal yang membedakan "bisa dicoret-coret" dari "terasa seperti pulpen",
 * dan empat di antaranya gagal dengan diam:
 *
 *   1. `pressure` -> tebal garis. Tanpa ini tanda tangan rata satu tebal.
 *   2. Telapak tangan ditolak selama pena dipakai. Menulis dengan S-Pen
 *      berarti sisi telapak menempel di layar, dan sentuhan itu datang
 *      sebagai `pointerType: 'touch'`.
 *   3. `setPointerCapture` — goresan yang ujungnya keluar sedikit dari kotak
 *      kanvas tidak lagi terpotong rata di tepinya.
 *   4. `getCoalescedEvents()` — pena mencuplik lebih cepat daripada laju
 *      gambar layar; tanpa ini tiga dari empat titik terbuang dan goresan
 *      cepat menjadi patah bersegi.
 *   5. `touch-action: none` pada kanvasnya, tanpa itu sapuan pena menggulir
 *      halaman alih-alih menggambar.
 *
 * INDUKNYA YANG PUNYA TOMBOL
 *
 * Papan ini tidak punya tombol "Pakai"/"Simpan": penyunting PDF menaruhnya di
 * bilah dialognya, dialog tanda tangan menaruhnya di kaki formulirnya, dan
 * keduanya berbeda susunan. Induk memanggil `bersihkan()` dan `gambar()`
 * lewat `@ViewChild`, dan tahu kapan tombolnya boleh hidup dari `(berubah)`.
 */
@Component({
  selector: 'app-papan-ttd',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <canvas
      #papan
      class="papan-ttd"
      [attr.width]="lebar"
      [attr.height]="tinggi"
      (pointerdown)="mulaiGores($event)"
      (pointermove)="gores($event)"
      (pointerup)="selesaiGores($event)"
      (pointercancel)="selesaiGores($event)"
      (pointerleave)="selesaiGores($event)"
      (contextmenu)="$event.preventDefault()"
    ></canvas>
  `,
  styles: [
    `
      .papan-ttd {
        display: block;
        width: 100%;
        max-width: 100%;
        height: auto;
        aspect-ratio: 3 / 1;
        border: 1px dashed var(--border, #dfe3ea);
        border-radius: 10px;
        background: var(--kertas, #fff);
        cursor: crosshair;
        /*
         * TANPA INI PENA MENGGULIR HALAMAN.
         *
         * Peramban memperlakukan sapuan pena dan jari sebagai gulir sampai
         * elemennya menyatakan menanganinya sendiri. Yang terjadi bukan
         * galat: papannya sekadar tidak menerima pointermove.
         */
        touch-action: none;
        user-select: none;
        -webkit-user-select: none;
        -webkit-touch-callout: none;
      }
    `,
  ],
})
export class PapanTtdComponent {
  /** Ukuran kanvas dalam piksel gambar (bukan piksel layar). */
  @Input() lebar = 720;
  @Input() tinggi = 240;

  /**
   * Tanda tangan yang sudah ada, digambar sebagai titik mulai.
   *
   * Dipakai dialog "ganti tanda tangan": yang membuka melihat tanda
   * tangannya yang lama, bukan papan kosong yang membuatnya ragu apakah
   * tersimpan.
   */
  @Input() set awal(src: string | null | undefined) {
    this.gambarAwal = src || null;
    if (this.kanvas && this.gambarAwal && !this.jejak.length) {
      this.pulihkan(this.kanvas);
    }
  }

  /** Papannya sudah ada coretannya? Dipakai induk untuk menghidupkan tombol. */
  readonly berubah = output<boolean>();

  private gambarAwal: string | null = null;
  private kanvas?: HTMLCanvasElement;

  @ViewChild('papan') set papanRef(el: ElementRef<HTMLCanvasElement> | undefined) {
    this.kanvas = el?.nativeElement;
    if (this.kanvas && this.gambarAwal && !this.jejak.length) {
      this.pulihkan(this.kanvas);
    }
  }

  // ---- goresan ------------------------------------------------------------

  /** `t` adalah TEKANAN, 0..1. */
  private jejak: { x: number; y: number; t: number }[][] = [];
  private sedangGores = false;

  /**
   * Tekanan untuk alat yang tidak melaporkannya.
   *
   * Spesifikasi Pointer Events menetapkan 0,5 untuk alat tanpa tekanan yang
   * sedang menekan. Dipakai juga sebagai pengganti saat `pressure` bernilai 0
   * di tengah goresan — sebagian peramban mengirimkannya pada kejadian
   * pertama, dan tebal nol membuat awal goresan hilang.
   */
  private static readonly TEKANAN_TETIKUS = 0.5;

  /** Batas tebal garis, sebagai kelipatan tebal dasarnya. */
  private static readonly TEBAL_MIN = 0.45;
  private static readonly TEBAL_MAKS = 1.7;

  /** Jenis alat yang memulai goresan yang sedang berjalan. */
  private jenisGores: string | null = null;

  /** Pernah menggambar pakai pena di papan ini? */
  private penaDipakai = false;

  mulaiGores(ev: PointerEvent): void {
    if (ev.button > 0) return;

    if (ev.pointerType === 'pen') this.penaDipakai = true;
    // Telapak tangan: sentuhan yang datang sesudah penanya dipakai.
    else if (ev.pointerType === 'touch' && this.penaDipakai) return;

    this.jenisGores = ev.pointerType;
    this.sedangGores = true;
    this.jejak.push([]);

    const kanvas = ev.currentTarget as HTMLCanvasElement;
    try {
      kanvas.setPointerCapture?.(ev.pointerId);
    } catch {
      // Tidak apa-apa — goresannya tetap jalan, hanya tidak terkunci.
    }

    this.gores(ev);
  }

  gores(ev: PointerEvent): void {
    if (!this.sedangGores) return;
    if (this.jenisGores && ev.pointerType !== this.jenisGores) return;

    const kanvas = ev.currentTarget as HTMLCanvasElement;
    const kotak = kanvas.getBoundingClientRect();
    const titik = this.jejak[this.jejak.length - 1];
    if (!titik) return;

    const kejadian =
      typeof ev.getCoalescedEvents === 'function' ? ev.getCoalescedEvents() : [];
    const deret = kejadian.length ? kejadian : [ev];

    for (const e of deret) {
      // Titiknya PECAHAN, bukan piksel: kanvasnya diperbesar saat diubah
      // menjadi gambar, dan piksel yang benar di layar meleset pada ukuran itu.
      titik.push({
        x: (e.clientX - kotak.left) / kotak.width,
        y: (e.clientY - kotak.top) / kotak.height,
        t: PapanTtdComponent.tekanan(e),
      });
    }
    this.gambarUlang(kanvas);
    this.berubah.emit(!this.kosong);
  }

  selesaiGores(ev?: PointerEvent): void {
    this.sedangGores = false;
    this.jenisGores = null;
    if (!ev) return;
    const kanvas = ev.currentTarget as HTMLCanvasElement;
    try {
      kanvas.releasePointerCapture?.(ev.pointerId);
    } catch {
      // Penunjuknya memang sudah dilepas.
    }
  }

  /** Tekanan satu kejadian, 0..1, dengan pengganti yang masuk akal. */
  static tekanan(ev: { pressure?: number; pointerType?: string }): number {
    const p = Number(ev?.pressure);
    if (!Number.isFinite(p) || p <= 0) return PapanTtdComponent.TEKANAN_TETIKUS;
    return Math.min(1, p);
  }

  /**
   * Tebal garis untuk satu tekanan.
   *
   * Akar kuadrat, bukan lurus: tekanan yang dilaporkan pena menumpuk di
   * bagian bawah rentangnya — menulis biasa jarang melewati 0,4 — sehingga
   * pemetaan lurus membuat hampir seluruh tanda tangan setipis mungkin dan
   * perbedaannya nyaris tidak terlihat.
   */
  static lebarGores(dasar: number, tekanan: number): number {
    const t = Math.min(1, Math.max(0, Number(tekanan) || 0));
    const k =
      PapanTtdComponent.TEBAL_MIN +
      (PapanTtdComponent.TEBAL_MAKS - PapanTtdComponent.TEBAL_MIN) * Math.sqrt(t);
    return dasar * k;
  }

  /** Belum ada coretan DAN tidak ada tanda tangan lama? */
  get kosong(): boolean {
    return !this.jejak.some((g) => g.length > 1) && !this.gambarAwal;
  }

  /** Coretan baru ada? Bedanya dengan `kosong`: ini mengabaikan yang lama. */
  get adaCoretanBaru(): boolean {
    return this.jejak.some((g) => g.length > 1);
  }

  bersihkan(): void {
    this.jejak = [];
    this.gambarAwal = null;
    if (this.kanvas) {
      const ctx = this.kanvas.getContext('2d');
      ctx?.clearRect(0, 0, this.kanvas.width, this.kanvas.height);
    }
    this.berubah.emit(false);
  }

  /**
   * Gambar papannya sebagai data-URI PNG, atau null bila kosong.
   *
   * PNG, bukan JPEG: tanda tangan perlu LATAR TEMBUS PANDANG. JPEG tidak
   * punya kanal alfa, sehingga yang tertempel adalah kotak putih berisi
   * coretan — menutupi garis tanda tangan tercetak di bawahnya.
   */
  gambar(): string | null {
    if (!this.kanvas) return null;
    if (!this.adaCoretanBaru && !this.gambarAwal) return null;
    return this.kanvas.toDataURL('image/png');
  }

  private pulihkan(kanvas: HTMLCanvasElement): void {
    const src = this.gambarAwal;
    if (!src) return;
    const img = new Image();
    img.onload = () => {
      const ctx = kanvas.getContext('2d');
      ctx?.clearRect(0, 0, kanvas.width, kanvas.height);
      ctx?.drawImage(img, 0, 0, kanvas.width, kanvas.height);
    };
    img.src = src;
  }

  private gambarUlang(kanvas: HTMLCanvasElement): void {
    const ctx = kanvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, kanvas.width, kanvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111827';
    ctx.fillStyle = '#111827';

    const dasar = Math.max(2, kanvas.width / 220);

    for (const goresan of this.jejak) {
      if (!goresan.length) continue;

      const p = goresan.map((t) => ({
        x: t.x * kanvas.width,
        y: t.y * kanvas.height,
        t: t.t,
      }));

      // Satu titik = titik. Tanda titik pada tanda tangan hilang tanpa ini.
      if (p.length === 1) {
        ctx.beginPath();
        ctx.arc(
          p[0].x,
          p[0].y,
          PapanTtdComponent.lebarGores(dasar, p[0].t) / 2,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        continue;
      }

      /*
       * Tiap ruas digambar SENDIRI, karena tebalnya berbeda-beda.
       * `lineWidth` berlaku untuk seluruh jalur, jadi satu `beginPath` untuk
       * seluruh goresan berarti satu tebal untuk seluruh goresan.
       *
       * Bentuk ruasnya kurva kuadratik dari titik tengah ke titik tengah,
       * dengan titik aslinya sebagai kendali: cara termurah membuat deretan
       * titik terbaca sebagai garis tulisan.
       */
      for (let i = 1; i < p.length; i++) {
        const a = p[i - 1];
        const b = p[i];
        ctx.lineWidth = PapanTtdComponent.lebarGores(dasar, (a.t + b.t) / 2);
        ctx.beginPath();
        if (i === 1) ctx.moveTo(a.x, a.y);
        else ctx.moveTo((p[i - 2].x + a.x) / 2, (p[i - 2].y + a.y) / 2);
        if (i === p.length - 1) ctx.quadraticCurveTo(a.x, a.y, b.x, b.y);
        else {
          ctx.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2);
        }
        ctx.stroke();
      }
    }
  }
}
