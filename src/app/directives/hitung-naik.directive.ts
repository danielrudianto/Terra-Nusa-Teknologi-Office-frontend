import { formatNumber } from '@angular/common';
import {
  Directive,
  ElementRef,
  Inject,
  Input,
  LOCALE_ID,
  OnChanges,
  OnDestroy,
} from '@angular/core';
import { gerakMati } from '../animations/gerak';

/**
 * Angka yang MENGHITUNG NAIK ke nilainya, seperti ringkasan saldo di
 * aplikasi bank.
 *
 *   <span [appHitungNaik]="t.pendapatan" [hnFormat]="uang"></span>
 *
 * Direktif ini yang menulis isi elemennya — jangan ada interpolasi di
 * dalamnya.
 *
 * Tiga keputusan yang disengaja:
 *
 *  1. Nilai AKHIR langsung ditulis saat masukan pertama tiba, dan elemennya
 *     disembunyikan (opacity 0) sampai terlihat. Yang membaca DOM seketika
 *     — uji, cetak, salin — mendapat angka yang benar, dan layar tidak
 *     sempat menampilkan angka akhir sekejap lalu melompat ke nol.
 *  2. Hanya berjalan saat elemennya TERLIHAT (IntersectionObserver). Kartu
 *     di bawah lipatan layar menghitung saat digulir ke sana, bukan diam-diam
 *     saat tidak ada yang melihat.
 *  3. Perubahan berikutnya bergerak dari angka LAMA ke angka BARU, bukan dari
 *     nol — mengganti saringan tahun terasa sebagai angka yang bergeser,
 *     bukan halaman yang dimuat ulang.
 *
 * `aria-label` selalu berisi nilai akhir, supaya pembaca layar tidak
 * membacakan angka-angka perantaranya.
 */
@Directive({ selector: '[appHitungNaik]', standalone: true })
export class HitungNaikDirective implements OnChanges, OnDestroy {
  @Input('appHitungNaik') nilai: number | null | undefined;
  /**
   * Pemformat angka ke teks. HARUS fungsi yang tidak memakai `this`
   * (atau properti panah), karena dipanggil lepas dari komponennya.
   *
   * Tanpa pemformat, angkanya dicetak persis seperti pipe
   * `number: hnDigit` pada lokal aktif — pengganti langsung untuk
   * `{{ x | number: "1.2-2" }}`.
   */
  @Input() hnFormat?: (n: any) => string;
  @Input() hnDigit = '1.2-2';
  @Input() hnDurasi = 900;

  private tampil = 0;
  private sudahTerlihat = false;
  private raf = 0;
  private jaring: any;
  private io?: IntersectionObserver;
  private tertunda: { dari: number; ke: number } | null = null;

  constructor(
    private el: ElementRef<HTMLElement>,
    @Inject(LOCALE_ID) private locale: string,
  ) {}

  private format(n: any): string {
    if (this.hnFormat) return this.hnFormat(n);
    if (n === null || n === undefined || !Number.isFinite(Number(n))) return '';
    return formatNumber(Number(n), this.locale, this.hnDigit);
  }

  ngOnChanges(): void {
    const ke = Number(this.nilai);
    this.hentikan();

    if (this.nilai === null || this.nilai === undefined || !Number.isFinite(ke)) {
      this.tulis(this.nilai as any);
      return;
    }

    const dari = this.sudahTerlihat ? this.tampil : 0;
    this.tampil = ke;
    this.tulis(ke);

    if (gerakMati() || Math.abs(ke - dari) < 0.005) return;

    if (this.sudahTerlihat) {
      this.jalankan(dari, ke);
      return;
    }
    this.tertunda = { dari, ke };
    this.el.nativeElement.style.opacity = '0';
    this.amati();
    // Jaring pengaman: angka keuangan TIDAK BOLEH tersembunyi karena
    // pengamatnya tidak pernah melapor (mis. kontainer bergulir yang aneh).
    // Sesudah 1,5 detik angkanya ditampilkan apa adanya.
    clearTimeout(this.jaring);
    this.jaring = setTimeout(() => {
      if (this.tertunda) this.el.nativeElement.style.opacity = '';
    }, 1500);
  }

  ngOnDestroy(): void {
    this.hentikan();
    clearTimeout(this.jaring);
    this.io?.disconnect();
    this.el.nativeElement.style.opacity = '';
  }

  private amati(): void {
    if (this.io) return;
    if (typeof IntersectionObserver === 'undefined') {
      // Peramban tanpa IntersectionObserver: tampilkan saja nilai akhirnya.
      this.sudahTerlihat = true;
      this.tertunda = null;
      this.el.nativeElement.style.opacity = '';
      return;
    }
    this.io = new IntersectionObserver((entri) => {
      if (!entri.some((e) => e.isIntersecting)) return;
      this.io?.disconnect();
      this.io = undefined;
      this.sudahTerlihat = true;
      this.el.nativeElement.style.opacity = '';
      const t = this.tertunda;
      this.tertunda = null;
      if (t) this.jalankan(t.dari, t.ke);
    });
    this.io.observe(this.el.nativeElement);
  }

  private jalankan(dari: number, ke: number): void {
    const mulai = performance.now();
    const durasi = Math.max(0, this.hnDurasi);
    const langkah = (kini: number) => {
      const t = Math.min(1, (kini - mulai) / durasi);
      // easeOutQuart: cepat di awal, melambat mendekati nilainya.
      const e = 1 - Math.pow(1 - t, 4);
      if (t >= 1) {
        this.raf = 0;
        this.tulis(ke);
        return;
      }
      this.tulis(dari + (ke - dari) * e, ke);
      this.raf = requestAnimationFrame(langkah);
    };
    this.tulis(dari, ke);
    this.raf = requestAnimationFrame(langkah);
  }

  private hentikan(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private tulis(n: any, akhir: any = n): void {
    const el = this.el.nativeElement;
    el.textContent = this.format(n);
    el.setAttribute('aria-label', this.format(akhir));
  }
}
