/**
 * Titik masuk aplikasi mobile — `m.terrabot.alphakonstruksi.id`.
 *
 * Sasaran build KEDUA di repo yang SAMA. Yang dipakainya juga sama:
 * `ApiService`, interceptor autentikasi, `PermissionService`, terjemahan,
 * dan komponen laporan proyek. Yang berbeda hanya rute dan kerangkanya.
 *
 * Aplikasi terpisah berarti aturan persetujuan ditulis ulang di tempat
 * kedua — dan yang berbeda di antara keduanya tidak akan ketahuan sampai
 * ada dokumen yang disetujui dari ponsel padahal di desktop ditolak.
 */

import { LOCALE_ID, importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import {
  HTTP_INTERCEPTORS,
  HttpClient,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { provideNativeDateAdapter } from '@angular/material/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { provideNgxMask } from 'ngx-mask';

import { MobileRootComponent } from './app/mobile/mobile-root.component';
import { MOBILE_ROUTES } from './app/mobile/mobile.routes';
import { AuthInterceptor } from './app/services/auth.interceptor';

bootstrapApplication(MobileRootComponent, {
  providers: [
    provideRouter(MOBILE_ROUTES, withComponentInputBinding()),
    provideAnimations(),
    /*
     * Interceptor yang SAMA dengan desktop.
     *
     * Ia yang menempelkan token dan menangani token kedaluwarsa. Menyalinnya
     * ke aplikasi mobile berarti dua penanganan kedaluwarsa yang dapat
     * berbeda — dan yang berbeda itu muncul sebagai pengguna yang tiba-tiba
     * ditolak tanpa diarahkan ke halaman masuk.
     */
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    provideHttpClient(withInterceptorsFromDi()),
    provideNativeDateAdapter(),
    provideNgxMask(),
    DatePipe,
    DecimalPipe,
    {
      provide: LOCALE_ID,
      useFactory: () => {
        const tersimpan = localStorage.getItem('app_lang');
        return ['id', 'en', 'zh'].includes(tersimpan ?? '')
          ? (tersimpan as string)
          : 'id';
      },
    },
    importProvidersFrom(
      TranslateModule.forRoot({
        fallbackLang: 'id',
        loader: {
          provide: TranslateLoader,
          useFactory: (http: HttpClient) =>
            new TranslateHttpLoader(http, './assets/i18n/', '.json'),
          deps: [HttpClient],
        },
      }),
    ),
  ],
}).catch((err) => console.error(err));
