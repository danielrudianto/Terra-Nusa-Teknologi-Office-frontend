import {
  Directive,
  ElementRef,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
  inject,
} from '@angular/core';

/**
 * Geser ke BAWAH untuk menutup panel bawah (bottom sheet) — seperti aplikasi
 * ponsel biasa.
 *
 * Tanpa Hammer: cukup touch event. Tarikan hanya dimulai bila panel sudah di
 * PUNCAK gulirannya (scrollTop 0), supaya menggulir isi ke bawah tidak salah
 * dikira menutup. Melewati ambang saat dilepas → `(tutup)`; kurang dari itu,
 * panel kembali ke tempatnya.
 */
@Directive({
  selector: '[appGeserTutup]',
  standalone: true,
})
export class GeserTutupDirective implements OnInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);

  @Output() tutup = new EventEmitter<void>();

  private readonly AMBANG = 120; // px tarikan untuk menutup
  private mulaiY = 0;
  private geser = 0;
  private menarik = false;

  ngOnInit(): void {
    const el = this.host.nativeElement;
    el.addEventListener('touchstart', this.onStart, { passive: true });
    el.addEventListener('touchmove', this.onMove, { passive: false });
    el.addEventListener('touchend', this.onEnd, { passive: true });
  }

  ngOnDestroy(): void {
    const el = this.host.nativeElement;
    el.removeEventListener('touchstart', this.onStart as any);
    el.removeEventListener('touchmove', this.onMove as any);
    el.removeEventListener('touchend', this.onEnd as any);
  }

  private diPuncak(): boolean {
    return (this.host.nativeElement.scrollTop || 0) <= 0;
  }

  private onStart = (e: TouchEvent): void => {
    if (!this.diPuncak()) return;
    this.mulaiY = e.touches[0].clientY;
    this.geser = 0;
    this.menarik = true;
    this.host.nativeElement.style.transition = 'none';
  };

  private onMove = (e: TouchEvent): void => {
    if (!this.menarik) return;
    const dy = e.touches[0].clientY - this.mulaiY;
    // Menggulir ke atas, atau sudah tergulir turun: bukan gerak menutup.
    if (dy <= 0 || !this.diPuncak()) {
      this.batal();
      return;
    }
    this.geser = dy;
    if (e.cancelable) e.preventDefault();
    const el = this.host.nativeElement;
    el.style.transform = `translateY(${dy}px)`;
    // Sedikit meredup saat ditarik jauh — isyarat akan menutup.
    el.style.opacity = String(Math.max(0.55, 1 - dy / 600));
  };

  private onEnd = (): void => {
    if (!this.menarik) return;
    this.menarik = false;
    const el = this.host.nativeElement;
    el.style.transition = 'transform .22s ease, opacity .22s ease';
    if (this.geser >= this.AMBANG) {
      // Luncurkan keluar lalu beri tahu induk untuk menutup.
      el.style.transform = 'translateY(100%)';
      el.style.opacity = '0';
      setTimeout(() => this.tutup.emit(), 160);
    } else {
      this.pulih();
    }
  };

  private batal(): void {
    this.menarik = false;
    this.pulih();
  }

  private pulih(): void {
    const el = this.host.nativeElement;
    el.style.transition = 'transform .2s ease, opacity .2s ease';
    el.style.transform = '';
    el.style.opacity = '';
  }
}
