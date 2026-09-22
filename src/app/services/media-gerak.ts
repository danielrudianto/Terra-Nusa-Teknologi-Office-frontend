import { Injectable } from '@angular/core';
import { MediaMatcher } from '@angular/cdk/layout';

/**
 * `MediaMatcher` yang TIDAK meneruskan `prefers-reduced-motion` dari OS.
 *
 * Material mematikan animasi dialognya bila OS meminta gerak dikurangi —
 * di Windows itu "Animation effects: Off", yang sering mati sendiri lewat
 * mode hemat daya. Akibatnya dialog dan panel samping muncul-hilang tanpa
 * gerakan sama sekali ("kaku"), sementara seluruh animasi lain aplikasi
 * tetap jalan.
 *
 * Aplikasi ini punya satu sakelar gerak sendiri: Pengaturan -> transisi
 * "tidak ada" (`html[data-gerak="mati"]`, lihat `animations/gerak.ts`). Jadi
 * pertanyaan "kurangi gerak?" dijawab dari sakelar itu, bukan dari OS.
 * Material membaca jawabannya SEKALI; mengganti setelan berlaku setelah
 * muat ulang, dan sampai itu CSS `data-gerak` sudah mematikan geraknya.
 */
@Injectable()
export class MediaGerakMatcher extends MediaMatcher {
  override matchMedia(query: string): MediaQueryList {
    if (/prefers-reduced-motion/i.test(query)) {
      const mati =
        typeof document !== 'undefined' &&
        document.documentElement.getAttribute('data-gerak') === 'mati';
      return {
        matches: mati,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      } as MediaQueryList;
    }
    return super.matchMedia(query);
  }
}
