import {
  Directive,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  Renderer2,
  inject,
} from '@angular/core';

/**
 * Muat-berikut saat gulir mendekati bawah — pengganti pagination di ponsel.
 *
 * Memantau gulir JENDELA (di aplikasi mobile ini jendelanyalah yang menggulir,
 * bukan wadah dalam). Saat sisa gulir tinggal `AMBANG` piksel, `(dekatBawah)`
 * dipancarkan sekali; komponen memuat halaman berikutnya dan menambахkannya.
 *
 * `mati` menghentikan pemantauan — dipakai saat data sudah habis atau sedang
 * memuat, supaya tidak memuat halaman yang sama berulang.
 */
@Directive({
  selector: '[appScrollBawah]',
  standalone: true,
})
export class ScrollBawahDirective implements OnInit, OnDestroy {
  private readonly rnd = inject(Renderer2);

  @Input() mati = false;
  @Output() dekatBawah = new EventEmitter<void>();

  private readonly AMBANG = 420;
  private lepas?: () => void;
  private menunggu = false;

  ngOnInit(): void {
    this.lepas = this.rnd.listen('window', 'scroll', () => this.cek());
    // Cek sekali: bila kontennya pendek dan sudah di bawah sejak awal.
    setTimeout(() => this.cek(), 0);
  }

  ngOnDestroy(): void {
    this.lepas?.();
  }

  private cek(): void {
    if (this.mati || this.menunggu) return;
    const doc = document.documentElement;
    const sisa = doc.scrollHeight - (window.scrollY + window.innerHeight);
    if (sisa <= this.AMBANG) {
      this.menunggu = true;
      this.dekatBawah.emit();
      // Jeda singkat agar satu gulir tidak memicu berkali-kali sebelum
      // komponen sempat menyetel `mati`/menambah tinggi.
      setTimeout(() => (this.menunggu = false), 250);
    }
  }
}
