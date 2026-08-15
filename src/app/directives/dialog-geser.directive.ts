import { Directive, ElementRef, OnDestroy, OnInit, inject } from '@angular/core';

/**
 * Membuat dialog dapat digeser dengan menyeret kepalanya.
 *
 * Dialog menutupi layar di belakangnya. Saat mengisi formulir, yang mengisi
 * kerap perlu melihat data yang tertutup — misalnya membandingkan barang yang
 * sedang dibuat dengan yang sudah ada di daftar. Tanpa dapat digeser, satu-
 * satunya jalan adalah menutup dialognya dan kehilangan isian yang sudah
 * diketik.
 *
 * Dipasang pada elemen KEPALA dialog, bukan pada dialognya:
 *
 *     <div class="mic-head" mat-dialog-title appDialogGeser>
 *
 * Yang digeser adalah panel Material di atasnya, yang dicari sendiri lewat
 * `closest`. Menaruhnya di kepala membuat area seretnya jelas — menyeret dari
 * mana saja berarti menandai teks pun ikut menggeser dialognya.
 *
 * Tidak memakai CDK drag-drop: `cdkDrag` memindahkan elemen lewat transform
 * dan bertabrakan dengan posisi yang sudah disetel Material, sehingga dialog
 * melompat pada seretan pertama.
 */
@Directive({
  selector: '[appDialogGeser]',
  standalone: true,
})
export class DialogGeserDirective implements OnInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);

  private panel: HTMLElement | null = null;
  private geser = false;
  private mulaiX = 0;
  private mulaiY = 0;
  private asalX = 0;
  private asalY = 0;

  /** Pergeseran yang sudah terkumpul, agar seretan berikutnya menyambung. */
  private geserX = 0;
  private geserY = 0;

  ngOnInit(): void {
    const el = this.host.nativeElement as HTMLElement;
    this.panel = el.closest('.mat-mdc-dialog-surface') as HTMLElement | null;
    if (!this.panel) return;

    el.style.cursor = 'move';
    // Menyeret kepala tidak boleh sekaligus menandai teks judulnya.
    el.style.userSelect = 'none';
    el.addEventListener('mousedown', this.onMulai);
  }

  ngOnDestroy(): void {
    const el = this.host.nativeElement as HTMLElement;
    el.removeEventListener('mousedown', this.onMulai);
    document.removeEventListener('mousemove', this.onGerak);
    document.removeEventListener('mouseup', this.onSelesai);
  }

  private readonly onMulai = (e: MouseEvent): void => {
    if (!this.panel) return;
    /*
     * Tombol di dalam kepala tetap dapat ditekan.
     *
     * Kepala dialog kerap memuat tombol tutup; tanpa pengecualian ini,
     * menekannya terbaca sebagai awal seretan dan tombolnya tidak pernah
     * bekerja.
     */
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, textarea, select')) return;

    this.mulaiX = e.clientX;
    this.mulaiY = e.clientY;
    this.asalX = this.geserX;
    this.asalY = this.geserY;
    this.geser = true;

    document.addEventListener('mousemove', this.onGerak);
    document.addEventListener('mouseup', this.onSelesai);
    e.preventDefault();
  };

  private readonly onGerak = (e: MouseEvent): void => {
    if (!this.geser || !this.panel) return;

    let x = this.asalX + (e.clientX - this.mulaiX);
    let y = this.asalY + (e.clientY - this.mulaiY);

    /*
     * Dialog tidak boleh keluar layar sampai tidak dapat ditarik kembali.
     *
     * Yang dibatasi PERGESERANNYA, bukan posisi mutlaknya: ukuran dan letak
     * asal dialog ditentukan Material, dan menghitung ulang posisinya di
     * sini berarti mengambil alih tata letak yang bukan urusan direktif ini.
     */
    /*
     * Batasnya dihitung dari posisi ASAL dialog, bukan posisinya sekarang.
     *
     * `getBoundingClientRect()` sudah memuat pergeseran yang sedang berjalan;
     * memakainya sebagai acuan membuat batasnya ikut bergeser setiap kali
     * mouse bergerak — dan dialognya tidak pernah benar-benar berhenti.
     */
    const kotak = this.panel.getBoundingClientRect();
    const asalKiri = kotak.left - this.geserX;
    const asalAtas = kotak.top - this.geserY;
    const sisa = 80;

    x = Math.min(
      Math.max(x, sisa - asalKiri - kotak.width),
      window.innerWidth - asalKiri - sisa,
    );
    y = Math.min(
      Math.max(y, -asalAtas),
      window.innerHeight - asalAtas - sisa,
    );

    this.geserX = x;
    this.geserY = y;

    /*
     * Digeser lewat `transform`, BUKAN `position`/`left`/`top`.
     *
     * Material memusatkan dan mengukur dialognya lewat wadah bertata letak
     * flex. Menyetel `position: fixed` melepaskannya dari wadah itu, dan
     * lebarnya seketika jatuh ke lebar layar — dialog berubah menjadi
     * selebar jendela pada seretan pertama.
     *
     * `transform` hanya memindahkan hasil gambarnya. Ukuran, letak asal, dan
     * seluruh perhitungan Material tidak tersentuh sama sekali.
     */
    this.panel.style.transform = `translate(${x}px, ${y}px)`;
  };

  private readonly onSelesai = (): void => {
    this.geser = false;
    document.removeEventListener('mousemove', this.onGerak);
    document.removeEventListener('mouseup', this.onSelesai);
  };
}
