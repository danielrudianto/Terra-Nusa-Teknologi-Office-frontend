import { ErrorHandler, Injectable } from '@angular/core';

/**
 * Muat ulang halaman ketika potongan aplikasi tidak dapat diambil.
 *
 * Berkas aplikasi dinamai menurut hash isinya, sehingga setiap build
 * menghasilkan nama yang berbeda. Halaman yang sudah terbuka masih menyimpan
 * daftar nama LAMA; begitu penggunanya membuka layar yang belum pernah
 * dimuat, berkas yang dicari sudah tidak ada di server.
 *
 * Nginx membalasnya dengan `index.html` — `try_files` memang disetel begitu
 * untuk routing Angular — dan peramban menolaknya:
 *
 *   Failed to load module script: Expected a JavaScript-or-Wasm module script
 *   but the server responded with a MIME type of "text/html".
 *
 * Pesan itu tidak menyebut sebabnya sama sekali, dan yang mengalaminya
 * menyimpulkan aplikasinya rusak.
 *
 * Pemberitahuan versi saja TIDAK cukup: banner itu mengarahkan ke halaman
 * Pengaturan, dan menuju Pengaturan justru memuat potongan yang hilang —
 * sehingga tombol yang disediakan untuk memperbaiki keadaan tidak dapat
 * ditekan persis ketika diperlukan.
 */
@Injectable()
export class ChunkErrorHandler implements ErrorHandler {
  /**
   * Sudah pernah memuat ulang pada halaman ini.
   *
   * Menjaga dari perulangan tanpa henti: bila potongannya tetap gagal setelah
   * dimuat ulang — server benar-benar bermasalah, bukan sekadar berkas basi —
   * halaman akan memuat ulang terus-menerus tanpa pernah berhasil.
   */
  private sudahMuatUlang = false;

  handleError(error: any): void {
    if (this.potonganBasi(error) && !this.sudahMuatUlang) {
      this.sudahMuatUlang = true;

      // Ditandai di sessionStorage supaya tetap dikenali setelah halaman
      // dimuat ulang; nilai di memori hilang bersama halamannya.
      try {
        if (sessionStorage.getItem('muat-ulang-potongan') === '1') {
          sessionStorage.removeItem('muat-ulang-potongan');
          console.error('Potongan tetap gagal setelah muat ulang:', error);
          return;
        }
        sessionStorage.setItem('muat-ulang-potongan', '1');
      } catch {
        // Penyimpanan sesi dapat ditolak pada mode penyamaran tertentu;
        // itu bukan alasan membatalkan pemuatan ulang.
      }

      window.location.reload();
      return;
    }

    console.error(error);
  }

  /**
   * Galat ini karena potongan aplikasi yang sudah tidak ada.
   *
   * Diperiksa lewat pesannya, bukan jenis galatnya: peramban yang berbeda
   * melemparkan kelas galat yang berbeda untuk keadaan yang sama.
   */
  private potonganBasi(error: any): boolean {
    const pesan = String(error?.message ?? error ?? '');
    return (
      pesan.includes('Failed to fetch dynamically imported module') ||
      pesan.includes('Importing a module script failed') ||
      pesan.includes('error loading dynamically imported module') ||
      (pesan.includes('MIME type') && pesan.includes('module script'))
    );
  }
}
