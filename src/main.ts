// Ditambal PALING AWAL, sebelum apa pun yang memuat pdf.js.
import './polyfill-promise-try';
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
