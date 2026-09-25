// Ditambal PALING AWAL, sebelum apa pun yang memuat pdf.js.
import './polyfill-promise-try';
/*
 * Ditambal SEKALI di titik masuk, bukan di tiap layar yang memakai pdf.js.
 *
 * Sebelumnya `polyfill-peta` hanya diimpor dua komponen (`pdf-main` dan
 * `sunting-halaman`). Jalur pdf.js yang lain tidak menyentuhnya sama sekali:
 * peninjau SPK memakai pdf.js yang DIBUNDEL `ngx-extended-pdf-viewer`, dan
 * bundel itu tidak dapat diberi impor tambahan dari sini.
 *
 * Sejak pdfjs 6 panggilan `Map.prototype.getOrInsertComputed` terjadi di
 * UTAS UTAMA saat merender, bukan hanya di dalam worker — pada peramban yang
 * belum memilikinya, layar peninjau gagal dengan "getOrInsertComputed is not
 * a function" dan tidak ada satu pun uji unit yang dapat melihatnya.
 */
import './app/polyfill-peta';
import { redirectPonselKeMobile } from './redirect-mobile';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';


// Dari ponsel di domain desktop, alihkan ke aplikasi mobile SEBELUM aplikasi
// dimuat — berlaku baik yang sudah login maupun belum. Bila sedang
// mengalihkan, jangan bootstrap: halamannya sedang berpindah.
if (!redirectPonselKeMobile()) {
  platformBrowserDynamic().bootstrapModule(AppModule)
    .catch(err => console.error(err));
}
