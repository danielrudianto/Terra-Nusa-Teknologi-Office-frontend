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
 * Panel bawah (bottom sheet) yang bisa DITUTUP dengan dua cara ponsel biasa:
 *
 *   1. GESER ke bawah — tanpa Hammer, cukup touch event. Tarikan hanya
 *      dimulai bila panel sudah di PUNCAK gulirannya (scrollTop 0), supaya
 *      menggulir isi ke bawah tidak salah dikira menutup. Melewati ambang saat
 *      dilepas → `(tutup)`; kurang dari itu, panel kembali ke tempatnya.
 *
 *   2. Tombol KEMBALI (back) — di ponsel, orang menekan Back untuk menutup
 *      lembar yang terbuka, BUKAN untuk pindah halaman. Saat panel terbuka,
 *      satu entri riwayat "dititipkan"; tekanan Back berikutnya mengonsumsi
 *      entri itu — halaman tidak berpindah — dan panelnya yang ditutup. Saat
 *      panel ditutup lewat cara lain (geser, ketuk luar, tombol aksi), entri
 *      titipan itu dibersihkan agar Back berikutnya benar-benar pindah
 *      halaman.
 *
 * Keduanya menandai hal yang sama: "ini lembar yang bisa dibubarkan". Karena
 * itu keduanya di satu tempat — setiap lembar yang bisa digeser-tutup otomatis
 * juga tertutup oleh Back.
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

  /** Entri riwayat titipan kita masih ada (belum dikonsumsi Back). */
  private titipRiwayat = false;
  /** Penutupan ini dipicu oleh Back — jangan bersihkan riwayat lagi. */
  private tutupKarenaBack = false;

  ngOnInit(): void {
    const el = this.host.nativeElement;
    el.addEventListener('touchstart', this.onStart, { passive: true });
    el.addEventListener('touchmove', this.onMove, { passive: false });
    el.addEventListener('touchend', this.onEnd, { passive: true });

    /*
     * Titip satu entri riwayat DENGAN alamat yang sama.
     *
     * Alamatnya tidak diubah (argumen ketiga dikosongkan), jadi tidak ada
     * rute yang berpindah — yang bertambah hanya satu langkah "kembali" yang
     * kita sediakan untuk menutup panel. Dibungkus try: sebagian konteks
     * (mis. pratinjau/embed) melarang History API, dan itu tidak boleh
     * menggagalkan panelnya.
     */
    try {
      history.pushState({ bottomSheet: true }, '');
      this.titipRiwayat = true;
      window.addEventListener('popstate', this.onPop);
    } catch {
      this.titipRiwayat = false;
    }
  }

  ngOnDestroy(): void {
    const el = this.host.nativeElement;
    el.removeEventListener('touchstart', this.onStart as any);
    el.removeEventListener('touchmove', this.onMove as any);
    el.removeEventListener('touchend', this.onEnd as any);

    window.removeEventListener('popstate', this.onPop);
    // Ditutup lewat UI (bukan Back): entri titipan masih menumpuk di riwayat.
    // Dibuang di sini supaya tekanan Back berikutnya benar-benar pindah
    // halaman, bukan sekadar "menutup" panel yang sudah tertutup. Karena
    // pendengar popstate sudah dilepas di atas, `history.back()` ini tidak
    // memicu penutupan ulang.
    //
    // DIJAGA `history.state?.bottomSheet`: hanya membuang entri BILA entri
    // titipan kita memang masih di puncak riwayat. Bila panel ini dibongkar
    // karena PERPINDAHAN HALAMAN (router sudah menaruh state-nya sendiri di
    // atas milik kita), `history.back()` justru akan membatalkan perpindahan
    // itu — melempar pengguna kembali ke layar yang baru saja ditinggalkannya.
    if (
      this.titipRiwayat &&
      !this.tutupKarenaBack &&
      (history.state as any)?.bottomSheet === true
    ) {
      this.titipRiwayat = false;
      try {
        history.back();
      } catch {
        /* diam: gagal membersihkan riwayat bukan alasan menahan penutupan */
      }
    }
  }

  /**
   * Tombol Back ditekan saat panel terbuka.
   *
   * Entri titipan kita yang dikonsumsi — alamatnya sama, jadi tidak ada
   * perpindahan halaman. Yang perlu dilakukan hanya menutup panelnya, dan
   * MENANDAI bahwa penutupan ini dari Back supaya `ngOnDestroy` tidak menekan
   * `history.back()` sekali lagi.
   */
  private onPop = (): void => {
    // Hanya bertindak bila entri titipan kita memang masih pending. Tanpa ini,
    // popstate susulan (mis. `history.back()` pembersih dari panel lain yang
    // baru tertutup, atau gerakan Back yang bukan milik kita) bisa menutup
    // panel ini di luar maksudnya.
    if (!this.titipRiwayat) return;
    this.titipRiwayat = false;
    this.tutupKarenaBack = true;
    this.tutup.emit();
  };

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
