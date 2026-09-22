import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { Observable, tap } from 'rxjs';

/**
 * KEMBALI KE DAFTAR TERASA SEKETIKA — stale-while-revalidate untuk halaman
 * daftar.
 *
 * Membuka ulang daftar yang baru saja dilihat (kembali dari detail, pindah
 * menu lalu balik) langsung menampilkan isi terakhirnya dari memori, SAMBIL
 * tetap meminta data terbaru ke server. Bila jawaban server sama persis,
 * tidak ada yang dipancarkan lagi — tabelnya tidak berkedip dan barisnya
 * tidak menganimasikan ulang. Bila berbeda, data baru menggantikannya.
 *
 * YANG DISIMPAN hanya permintaan daftar: GET JSON yang membawa parameter
 * `page`. Detail, laporan, dan unduhan tidak disentuh.
 *
 * DIKOSONGKAN SELURUHNYA oleh setiap POST/PUT/PATCH/DELETE — saat dikirim
 * dan saat jawabannya tiba. Aturan ini sengaja kasar: menebak daftar mana
 * yang terpengaruh sebuah perubahan adalah sumber data basi, dan satu
 * perubahan cukup untuk memulai dari bersih. Keluar akun juga
 * mengosongkannya (AuthService.logout).
 *
 * Isinya disimpan sebagai TEKS dan diurai ulang setiap kali dipakai, supaya
 * komponen yang mengubah larik hasil (mis. mengganti satu baris sesudah
 * disunting) tidak ikut mengubah simpanannya.
 */
const UMUR_MAKS = 5 * 60_000;

interface Entri {
  teks: string;
  waktu: number;
}

const simpanan = new Map<string, Entri>();

export function kosongkanCacheDaftar(): void {
  simpanan.clear();
}

function layakDisimpan(req: HttpRequest<unknown>): boolean {
  return (
    req.method === 'GET' &&
    req.responseType === 'json' &&
    req.params.has('page')
  );
}

@Injectable()
export class CacheDaftarInterceptor implements HttpInterceptor {
  intercept(
    req: HttpRequest<unknown>,
    next: HttpHandler,
  ): Observable<HttpEvent<unknown>> {
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
      kosongkanCacheDaftar();
      return next.handle(req).pipe(
        tap((ev) => {
          if (ev instanceof HttpResponse) kosongkanCacheDaftar();
        }),
      );
    }
    if (!layakDisimpan(req)) return next.handle(req);

    const kunci = req.urlWithParams;
    const jaringan$ = next.handle(req).pipe(
      tap((ev) => {
        if (ev instanceof HttpResponse && ev.status === 200) {
          simpanan.set(kunci, { teks: JSON.stringify(ev.body), waktu: Date.now() });
        }
      }),
    );

    const ada = simpanan.get(kunci);
    if (!ada || Date.now() - ada.waktu > UMUR_MAKS) return jaringan$;

    return new Observable<HttpEvent<unknown>>((sub) => {
      sub.next(
        new HttpResponse({ body: JSON.parse(ada.teks), status: 200, url: req.url }),
      );
      const s = jaringan$.subscribe({
        next: (ev) => {
          if (ev instanceof HttpResponse && JSON.stringify(ev.body) === ada.teks) return;
          sub.next(ev);
        },
        error: (e) => sub.error(e),
        complete: () => sub.complete(),
      });
      return () => s.unsubscribe();
    });
  }
}
