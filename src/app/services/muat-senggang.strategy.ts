import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, EMPTY, timer, switchMap } from 'rxjs';

/**
 * Potongan halaman dimuat di LATAR saat peramban senggang, supaya membuka
 * menu untuk pertama kali tidak menunggu unduhan.
 *
 * Bukan `PreloadAllModules` mentah: itu mulai mengunduh begitu navigasi
 * pertama selesai, berebut jaringan dengan data dashboard yang justru
 * sedang dimuat. Di sini ditunggu 3 detik, lalu `requestIdleCallback`.
 *
 * Rute dapat menolak dengan `data: { preload: false }`.
 *
 * Hanya berjalan sekali per sesi — potongan yang sudah dimuat tidak
 * diunduh ulang — jadi tab lama tidak mencoba mengunduh potongan dari
 * versi yang sudah diganti deploy berikutnya.
 */
@Injectable({ providedIn: 'root' })
export class MuatSenggangStrategy implements PreloadingStrategy {
  preload(route: Route, muat: () => Observable<any>): Observable<any> {
    if (route.data?.['preload'] === false) return EMPTY;
    return timer(3000).pipe(
      switchMap(
        () =>
          new Observable<void>((sub) => {
            const ric: any = (window as any).requestIdleCallback;
            const id = ric
              ? ric(() => { sub.next(); sub.complete(); }, { timeout: 5000 })
              : setTimeout(() => { sub.next(); sub.complete(); }, 0);
            return () => {
              const c: any = (window as any).cancelIdleCallback;
              if (ric && c) c(id);
              else clearTimeout(id);
            };
          }),
      ),
      switchMap(() => muat()),
    );
  }
}
