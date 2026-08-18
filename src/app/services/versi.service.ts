import { Injectable, NgZone, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { VERSI } from '../versi';

/**
 * Memantau apakah ada versi baru yang sudah ter-deploy.
 *
 * Persoalannya nyata: berkas aplikasi dinamai dengan hash isinya, sehingga
 * setiap build menghasilkan nama yang berbeda. Halaman yang sudah terbuka
 * masih menyimpan daftar nama LAMA, dan begitu penggunanya membuka layar yang
 * belum pernah dimuat, berkas yang dicari sudah tidak ada di server.
 *
 * Nginx membalas permintaan itu dengan `index.html` — karena `try_files`
 * memang disetel begitu untuk routing Angular — dan peramban menolaknya:
 *
 *   Failed to load module script: Expected a JavaScript-or-Wasm module script
 *   but the server responded with a MIME type of "text/html".
 *
 * Pesan itu tidak menyebut sebabnya sama sekali, dan yang mengalaminya
 * menyimpulkan aplikasinya rusak.
 *
 * Yang dipantau `index.html`, bukan berkas versi tersendiri. Alasannya:
 * berkas terpisah menuntut seseorang mengingat menaikkan nomornya, dan yang
 * bergantung pada ingatan cepat atau lambat tertinggal. `index.html` berubah
 * SENDIRI setiap build karena memuat nama berkas yang berhash.
 */
@Injectable({ providedIn: 'root' })
export class VersiService {
  private readonly http = inject(HttpClient);
  private readonly zone = inject(NgZone);

  /** Sidik jari build yang sedang berjalan; diisi saat pemeriksaan pertama. */
  private sekarang: string | null = null;

  /**
   * Versi yang sedang dipakai.
   *
   * Dibangkitkan saat build oleh `scripts/versi.js`, bukan diketik tangan:
   * berkas versi yang diperbarui manual cepat atau lambat tertinggal, dan
   * versi yang salah lebih menyesatkan daripada tidak ada versi sama sekali.
   */
  readonly versi = VERSI;

  /** Waktu pemeriksaan terakhir; ditampilkan di halaman Pengaturan. */
  readonly diperiksa = signal<Date | null>(null);

  /** Menyala ketika server sudah memuat build yang berbeda. */
  readonly adaPembaruan = signal(false);

  private pengatur?: ReturnType<typeof setInterval>;

  /**
   * Mulai memantau.
   *
   * Jedanya lima menit. Lebih rapat tidak memberi manfaat — pembaruan tidak
   * mendesak — dan setiap pemeriksaan adalah satu permintaan dari setiap tab
   * yang terbuka.
   */
  mulai(jedaMenit = 5): void {
    if (this.pengatur) return;

    this.periksa();

    // Dijalankan di luar zona Angular.
    //
    // `setInterval` di dalam zona membuat deteksi perubahan berjalan setiap
    // lima menit pada seluruh pohon komponen, tanpa ada yang berubah.
    this.zone.runOutsideAngular(() => {
      this.pengatur = setInterval(() => this.periksa(), jedaMenit * 60_000);
    });

    // Diperiksa juga saat tab kembali dibuka.
    //
    // Justru di situ risikonya paling besar: tab yang ditinggalkan berjam-jam
    // adalah tab yang paling mungkin tertinggal beberapa build.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.periksa();
    });
  }

  private periksa(): void {
    // `cache: no-store` pada permintaannya sendiri; tanpa itu peramban
    // menjawab dari singgahannya dan sidik jarinya tidak pernah berubah.
    this.http
      .get('index.html', {
        responseType: 'text',
        headers: { 'Cache-Control': 'no-cache' },
        params: { _: Date.now() },
      })
      .subscribe({
        next: (isi) => {
          const sidik = this.sidikJari(isi);
          this.zone.run(() => this.diperiksa.set(new Date()));

          if (this.sekarang === null) {
            this.sekarang = sidik;
            return;
          }
          if (sidik !== this.sekarang) {
            this.zone.run(() => this.adaPembaruan.set(true));
          }
        },
        // Kegagalan diabaikan diam-diam. Jaringan yang putus sesaat bukan
        // pembaruan, dan memberi tahu penggunanya tidak menolong apa pun.
        error: () => {},
      });
  }

  /**
   * Nama-nama berkas berhash di dalam `index.html`, disusun menjadi satu
   * penanda.
   *
   * Yang dibandingkan hanya nama berkasnya, bukan seluruh isi halaman:
   * `index.html` dapat berubah karena hal lain — tag meta, judul — dan
   * perubahan itu tidak memerlukan pemuatan ulang.
   */
  private sidikJari(html: string): string {
    const cocok = html.match(/(main|polyfills|styles|chunk)-[A-Z0-9]+\.(js|css)/g);
    return (cocok || []).sort().join('|');
  }

  /**
   * Periksa sekarang juga, tanpa menunggu jadwal.
   *
   * Dipakai tombol di halaman Pengaturan: yang menekannya ingin tahu
   * keadaan saat ini, bukan keadaan lima menit lalu.
   */
  periksaSekarang(): void {
    this.periksa();
  }

  /**
   * Muat ulang halaman ke build terbaru.
   *
   * `location.reload()` saja TIDAK cukup. Ia memuat ulang tanpa melewati
   * singgahan, sehingga peramban menyajikan `index.html` yang sama — yang
   * menunjuk chunk lama, yang sudah tidak ada di server. Hasilnya halaman
   * macet, dan satu-satunya jalan keluar adalah `Ctrl+Shift+R`.
   *
   * Karena itu singgahan aplikasinya dibersihkan lebih dulu, lalu alamatnya
   * dibuka dengan penanda waktu supaya `index.html` benar-benar diambil ulang
   * dari server.
   */
  async muatUlang(): Promise<void> {
    /*
     * Singgahan Cache API dan service worker dibersihkan bila ada.
     *
     * Dibungkus `try` masing-masing: peramban lama tidak punya `caches`, dan
     * kegagalan membersihkan tidak boleh menghalangi pemuatan ulang — yang
     * penting halamannya berganti, pembersihan hanya menolong.
     */
    try {
      if ('caches' in window) {
        const nama = await caches.keys();
        await Promise.all(nama.map((n) => caches.delete(n)));
      }
    } catch {
      // Diabaikan; pemuatan ulang tetap dilanjutkan.
    }

    try {
      if ('serviceWorker' in navigator) {
        const daftar = await navigator.serviceWorker.getRegistrations();
        await Promise.all(daftar.map((r) => r.unregister()));
      }
    } catch {
      // Diabaikan; pemuatan ulang tetap dilanjutkan.
    }

    /*
     * Dibuka lewat alamat baru, bukan `reload()`.
     *
     * Penanda waktu memaksa peramban meminta `index.html` ke server alih-alih
     * menjawab dari singgahannya. Penanda lama dibuang lebih dulu supaya
     * alamatnya tidak menumpuk `?_v=` setiap kali diperbarui.
     */
    const u = new URL(window.location.href);
    u.searchParams.delete('_v');
    u.searchParams.set('_v', String(Date.now()));
    window.location.replace(u.toString());
  }
}
