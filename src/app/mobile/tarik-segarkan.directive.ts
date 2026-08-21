import {
  Directive,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  Renderer2,
  inject,
} from '@angular/core';

/**
 * Tarik-untuk-menyegarkan — khas aplikasi ponsel.
 *
 * Menyegarkan DATA, bukan memuat ulang halaman: begitu ditarik ke bawah dari
 * PUNCAK lalu dilepas, ia memanggil `(segarkan)`. Peramban Android punya
 * tarik-muat-ulang bawaan yang MEMUAT ULANG seluruh halaman — itu dimatikan
 * lewat `overscroll-behavior-y: contain` (di styles global) supaya yang jalan
 * hanya penyegaran data ini.
 *
 * Indikatornya dibuat sendiri (satu bulatan berputar di puncak) dan hanya
 * muncul saat benar-benar ditarik atau saat sedang menyegarkan.
 */
@Directive({
  selector: '[appTarikSegarkan]',
  standalone: true,
})
export class TarikSegarkanDirective implements OnInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly rnd = inject(Renderer2);

  /** Sedang menyegarkan (dikendalikan komponen) — spinner tetap tampil. */
  @Input() set sedangSegar(v: boolean) {
    this._segar = v;
    this.gambar(v ? this.AMBANG : 0, v);
  }
  private _segar = false;

  @Output() segarkan = new EventEmitter<void>();

  private readonly AMBANG = 70; // px tarikan untuk memicu
  private readonly MAKS = 110; // batas tampilan
  private mulaiY = 0;
  private tarikan = 0;
  private menarik = false;
  private indikator!: HTMLElement;
  private ikon!: HTMLElement;

  private lepasStart?: () => void;
  private lepasMove?: () => void;
  private lepasEnd?: () => void;

  ngOnInit(): void {
    const el = this.host.nativeElement;
    this.rnd.setStyle(el, 'position', 'relative');

    this.indikator = this.rnd.createElement('div');
    this.rnd.setAttribute(this.indikator, 'aria-hidden', 'true');
    Object.assign(this.indikator.style, {
      position: 'absolute',
      top: '0',
      left: '50%',
      transform: 'translate(-50%, -120%)',
      width: '34px',
      height: '34px',
      borderRadius: '999px',
      background: 'var(--surface)',
      boxShadow: '0 2px 10px rgba(9,12,18,0.15)',
      display: 'grid',
      placeItems: 'center',
      color: 'var(--brand)',
      opacity: '0',
      transition: 'none',
      zIndex: '3',
      pointerEvents: 'none',
    } as CSSStyleDeclaration);

    this.ikon = this.rnd.createElement('div');
    Object.assign(this.ikon.style, {
      width: '18px',
      height: '18px',
      border: '2px solid currentColor',
      borderTopColor: 'transparent',
      borderRadius: '999px',
    } as CSSStyleDeclaration);
    this.rnd.appendChild(this.indikator, this.ikon);
    this.rnd.appendChild(el, this.indikator);

    this.lepasStart = this.rnd.listen(el, 'touchstart', (e) =>
      this.onStart(e),
    );
    // touchmove TIDAK pasif: perlu preventDefault agar layar tidak ikut
    // teregang saat kita tampilkan indikatornya.
    el.addEventListener('touchmove', this.onMove, { passive: false });
    this.lepasEnd = this.rnd.listen(el, 'touchend', () => this.onEnd());
  }

  ngOnDestroy(): void {
    this.lepasStart?.();
    this.lepasEnd?.();
    this.host.nativeElement.removeEventListener('touchmove', this.onMove as any);
  }

  private atasHalaman(): boolean {
    return (window.scrollY || document.documentElement.scrollTop || 0) <= 0;
  }

  private onStart(e: TouchEvent): void {
    if (this._segar || !this.atasHalaman()) return;
    this.mulaiY = e.touches[0].clientY;
    this.menarik = true;
    this.tarikan = 0;
  }

  private onMove = (e: TouchEvent): void => {
    if (!this.menarik || this._segar) return;
    if (!this.atasHalaman()) {
      this.menarik = false;
      this.gambar(0, false);
      return;
    }
    const dy = e.touches[0].clientY - this.mulaiY;
    if (dy <= 0) {
      this.gambar(0, false);
      return;
    }
    // Redam: makin jauh ditarik makin berat, seperti karet.
    this.tarikan = Math.min(this.MAKS, dy * 0.5);
    if (dy > 4 && e.cancelable) e.preventDefault();
    this.gambar(this.tarikan, false);
  };

  private onEnd(): void {
    if (!this.menarik || this._segar) return;
    this.menarik = false;
    if (this.tarikan >= this.AMBANG) {
      this.segarkan.emit();
      // Spinner ditahan sampai komponen menyetel sedangSegar=false.
      this.gambar(this.AMBANG, true);
    } else {
      this.gambar(0, false);
    }
  }

  private gambar(jarak: number, berputar: boolean): void {
    if (!this.indikator) return;
    const p = Math.min(1, jarak / this.AMBANG);
    this.indikator.style.transition = this.menarik
      ? 'none'
      : 'transform .2s ease, opacity .2s ease';
    this.indikator.style.opacity = String(p);
    this.indikator.style.transform = `translate(-50%, ${jarak - 42}px)`;
    if (berputar) {
      this.ikon.style.animation = 'mob-spin .7s linear infinite';
      this.ikon.style.borderTopColor = 'transparent';
    } else {
      this.ikon.style.animation = 'none';
      this.ikon.style.transform = `rotate(${p * 270}deg)`;
    }
  }
}
