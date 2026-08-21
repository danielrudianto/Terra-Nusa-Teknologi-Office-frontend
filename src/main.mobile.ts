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
import { DatePipe, DecimalPipe, registerLocaleData } from '@angular/common';
import localeEn from '@angular/common/locales/en';
import localeId from '@angular/common/locales/id';
import localeZh from '@angular/common/locales/zh';
import { provideNgxMask } from 'ngx-mask';

import { MobileRootComponent } from './app/mobile/mobile-root.component';
import { MOBILE_ROUTES } from './app/mobile/mobile.routes';
import { VERSI } from './app/versi';

/*
 * Data lokal DIDAFTARKAN sebelum aplikasi dijalankan.
 *
 * Tanpa ini, `LOCALE_ID: 'id'` menunjuk ke data lokal yang tidak pernah
 * dimuat, dan pipe `number` serta `date` melempar NG02100 — halaman pertama
 * gagal dirender seketika, kosong, dengan galat yang tidak menyebut lokal
 * sama sekali. Aplikasi desktop mendaftarkannya di `language.service.ts`;
 * bootstrap mobile tidak menyentuh berkas itu, sehingga harus di sini.
 */
registerLocaleData(localeId, 'id');
registerLocaleData(localeEn, 'en');
registerLocaleData(localeZh, 'zh');
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
    // Pemisah ribuan spasi; desimal titik/koma (bawaan) — sama dengan desktop.
    provideNgxMask({ thousandSeparator: ' ' }),
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
          // Akhiran berkasnya membawa VERSI build sebagai pembeda cache.
          //
          // Berkas terjemahan diambil saat aplikasi berjalan, dan peramban
          // maupun nginx menyimpannya lama. Tanpa pembeda ini, deploy yang
          // menambah kunci baru tetap menyajikan `id.json` LAMA — kunci
          // barunya muncul MENTAH di layar (mis. "mobile.po.barang") sampai
          // seseorang menekan muat-ulang paksa. Versi build berubah tiap
          // deploy, jadi berkasnya selalu diambil ulang tepat ketika berubah,
          // dan tidak sekali pun lebih sering dari itu.
          useFactory: (http: HttpClient) =>
            new TranslateHttpLoader(
              http,
              './assets/i18n/',
              `.json?v=${VERSI.commit}`,
            ),
          deps: [HttpClient],
        },
      }),
    ),
  ],
}).catch((err) => console.error(err));
