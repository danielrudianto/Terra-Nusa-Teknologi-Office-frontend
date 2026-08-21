import { Injectable, signal } from '@angular/core';

/**
 * Pemasangan aplikasi mobile ke Layar Utama (PWA).
 *
 * DUA JALAN, karena peramban memang berbeda:
 *
 *   - Android / Chrome: peramban menyalakan `beforeinstallprompt`, yang
 *     ditangkap paling awal di `main.mobile.ts` dan disimpan di `window`.
 *     Menekan tombol memanggil prompt bawaan peramban itu.
 *
 *   - iOS / Safari: TIDAK ADA pemasangan programatik — batasan Apple, bukan
 *     bug kita. Yang bisa ditawarkan hanya PETUNJUK: Bagikan → Tambahkan ke
 *     Layar Utama. Karena itu di iOS tombolnya diganti keterangan langkah.
 *
 * Sudah terpasang (berjalan penuh layar) -> tidak ditawari apa-apa lagi.
 */
@Injectable({ providedIn: 'root' })
export class PwaPasangService {
  /** Prompt bawaan tersedia (Android/Chrome). */
  readonly bisaPasang = signal<boolean>(false);
  /** Aplikasi sudah dipasang & dibuka penuh layar. */
  readonly terpasang = signal<boolean>(false);

  constructor() {
    const w = window as any;
    this.terpasang.set(this.cekTerpasang());
    if (w?.__pwaPrompt) this.bisaPasang.set(true);

    // Sinyal dari penangkap awal di main.mobile.ts.
    w?.addEventListener?.('pwa-bisa-pasang', () => this.bisaPasang.set(true));
    w?.addEventListener?.('pwa-terpasang', () => {
      this.bisaPasang.set(false);
      this.terpasang.set(true);
    });
  }

  private cekTerpasang(): boolean {
    try {
      return (
        (typeof window !== 'undefined' &&
          window.matchMedia &&
          window.matchMedia('(display-mode: standalone)').matches) ||
        (navigator as any).standalone === true
      );
    } catch {
      return false;
    }
  }

  /** Peramban ini iOS di luar mode terpasang — hanya bisa lewat petunjuk. */
  iosPerluManual(): boolean {
    const ua = navigator.userAgent || '';
    const ios = /iPhone|iPad|iPod/i.test(ua);
    // iPad modern menyamar sebagai Mac; kehadiran layar sentuh membedakannya.
    const ipadModern =
      /Macintosh/i.test(ua) && (navigator as any).maxTouchPoints > 1;
    return (ios || ipadModern) && !this.cekTerpasang();
  }

  /**
   * Ada sesuatu untuk ditawarkan sama sekali?
   *
   * Belum terpasang, DAN entah promptnya tersedia (Android) atau ini iOS yang
   * bisa dipasang manual. Selain itu tombolnya disembunyikan — menawarkan
   * pemasangan yang tak mungkin dijalankan hanya membingungkan.
   */
  bolehTawarkan(): boolean {
    if (this.terpasang()) return false;
    return this.bisaPasang() || this.iosPerluManual();
  }

  /**
   * Jalankan prompt bawaan peramban (Android/Chrome).
   *
   * Mengembalikan hasilnya: 'accepted' | 'dismissed' | 'unavailable'.
   * 'unavailable' berarti tidak ada prompt tersimpan — pemanggilnya sebaiknya
   * jatuh ke petunjuk manual.
   */
  async pasang(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    const w = window as any;
    const e = w?.__pwaPrompt;
    if (!e) return 'unavailable';
    try {
      e.prompt();
      const hasil = await e.userChoice;
      w.__pwaPrompt = null;
      this.bisaPasang.set(false);
      if (hasil?.outcome === 'accepted') this.terpasang.set(true);
      return hasil?.outcome === 'accepted' ? 'accepted' : 'dismissed';
    } catch {
      w.__pwaPrompt = null;
      this.bisaPasang.set(false);
      return 'dismissed';
    }
  }
}
