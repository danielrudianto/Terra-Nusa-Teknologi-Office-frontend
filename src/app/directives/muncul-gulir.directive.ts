import { Directive, ElementRef, Input, OnDestroy, OnInit, inject } from '@angular/core';
import { gerakMati } from '../animations/gerak';

/**
 * Muncul saat digulir ke dalam layar — padanan AOS tanpa pustaka tambahan.
 *
 *   <section appMunculGulir>                 naik-pudar (bawaan)
 *   <section appMunculGulir="kiri" [mgJeda]="80">
 *
 * Kenapa bukan AOS: pustaka itu memasang pendengar gulir pada `window`,
 * sedangkan halaman aplikasi ini bergulir di dalam `.mat-drawer-content` —
 * gulirannya tidak pernah sampai ke `window`, jadi elemen di bawah lipatan
 * tidak pernah muncul. IntersectionObserver bekerja pada wadah gulir mana
 * pun, tidak membebani guliran, dan mematuhi sakelar gerak aplikasi
 * (`html[data-gerak="mati"]`) tanpa konfigurasi kedua.
 *
 * Sekali tampil tetap tampil: menggulir balik tidak memutar ulang. Elemen
 * yang sudah di dalam layar saat halaman dibuka juga beranimasi (mengikuti
 * `mgJeda`), jadi halaman terasa tersusun, bukan muncul sekaligus.
 */
@Directive({ selector: '[appMunculGulir]', standalone: true })
export class MunculGulirDirective implements OnInit, OnDestroy {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Arah datangnya: `naik` (bawaan), `kiri`, `kanan`, `skala`. */
  @Input('appMunculGulir') arah: '' | 'naik' | 'kiri' | 'kanan' | 'skala' = '';
  /** Jeda sebelum mulai (ms). */
  @Input() mgJeda = 0;

  private pengamat?: IntersectionObserver;
  private jaring?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    const el = this.el.nativeElement;
    if (gerakMati() || typeof IntersectionObserver === 'undefined') return;

    el.classList.add('akn-mg', `akn-mg--${this.arah || 'naik'}`);
    el.style.setProperty('--akn-mg-jeda', `${Math.max(0, this.mgJeda)}ms`);

    this.pengamat = new IntersectionObserver(
      (entri) => {
        if (entri.some((e) => e.isIntersecting)) this.tampilkan();
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' },
    );
    this.pengamat.observe(el);

    // Jaring pengaman: apa pun yang terjadi pada pengamatnya, isinya tidak
    // boleh tertinggal tak terlihat.
    this.jaring = setTimeout(() => this.tampilkan(), 4000);
  }

  private tampilkan(): void {
    this.el.nativeElement.classList.add('akn-mg--tampil');
    this.pengamat?.disconnect();
    if (this.jaring) clearTimeout(this.jaring);
  }

  ngOnDestroy(): void {
    this.pengamat?.disconnect();
    if (this.jaring) clearTimeout(this.jaring);
  }
}
