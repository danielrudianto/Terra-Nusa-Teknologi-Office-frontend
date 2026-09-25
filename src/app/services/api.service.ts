import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

/**
 * Jalur tunggal ke API.
 *
 * Seluruh permintaan melewati `environment.url`, sehingga token tidak pernah
 * dapat terkirim ke domain lain — alamatnya tidak pernah datang dari data.
 */
@Injectable({
  providedIn: 'root',
})
export class ApiService {
  constructor(private http: HttpClient) {}

  /**
   * Rute yang memerlukan COOKIE ikut terkirim.
   *
   * Refresh token tidak lagi disimpan di `localStorage` dan tidak lagi
   * dikirim sebagai header. Ia sekarang cookie `HttpOnly` yang diterbitkan
   * server — tidak dapat dibaca JavaScript sama sekali, yang memang
   * intinya: satu XSS di layar mana pun dulu cukup untuk membawanya pergi,
   * dan yang memegangnya dapat menerbitkan token akses baru selama tujuh
   * hari tanpa perlu kata sandi.
   *
   * Cookie lintas-asal hanya ikut bila `withCredentials` dinyalakan. Dan
   * dinyalakan HANYA di sini, bukan pada setiap permintaan: cookie-nya
   * berjalur `/auth`, jadi pada rute lain ia tidak akan terkirim sekali pun
   * diminta — menyalakannya di sana hanya menambah kerumitan preflight
   * tanpa satu pun manfaat.
   *
   *   * `auth/refresh` — membaca cookie-nya, lalu menerbitkan yang baru.
   *   * `auth/logout`  — menghapusnya. Layar tidak bisa menghapusnya sendiri.
   *   * `auth`         — login; di sinilah cookie-nya PERTAMA dipasang, dan
   *                      tanpa `withCredentials` peramban membuang
   *                      `Set-Cookie`-nya diam-diam.
   */
  private static readonly JALUR_KREDENSIAL = ['auth/refresh', 'auth/logout', 'auth'];

  /** Perlukah cookie ikut pada alamat ini? */
  private kredensial(url: string): boolean {
    const bersih = (url || '').split('?')[0].replace(/\/+$/, '');
    return ApiService.JALUR_KREDENSIAL.includes(bersih);
  }

  /**
   * Header untuk satu permintaan.
   *
   * Refresh token disertakan HANYA pada jalur penyegaran; selebihnya cukup
   * token akses.
   */
  private headers(url: string): Record<string, string> {
    const akses = localStorage.getItem('access_token') ?? '';
    return { Authorization: `Bearer ${akses}` };
  }

  post(url: string, body: any) {
    return this.http.post(environment.url + url, body, {
      headers: this.headers(url),
      withCredentials: this.kredensial(url),
    });
  }

  get(url: string, queryParams: any) {
    /*
     * Parameter `undefined`/`null` DIBUANG sebelum dikirim.
     *
     * Angular menyerialkan objek params dengan `String(nilai)` — sehingga
     * `keyword: undefined` menjadi query `keyword=undefined` (string harfiah),
     * lalu server menyaring baris yang namanya benar-benar "undefined": tidak
     * ada, jadi daftarnya KOSONG. Nilai `false` dan `0` SENGAJA dipertahankan
     * — `checked=false` adalah penyaring yang sah.
     */
    const bersih: Record<string, any> = {};
    for (const k of Object.keys(queryParams || {})) {
      const v = queryParams[k];
      if (v !== undefined && v !== null) bersih[k] = v;
    }
    return this.http.get(environment.url + url, {
      headers: this.headers(url),
      params: bersih,
    });
  }

  put(url: string, body: any) {
    return this.http.put(environment.url + url, body, {
      headers: this.headers(url),
    });
  }

  patch(url: string, body: any) {
    return this.http.patch(environment.url + url, body, {
      headers: this.headers(url),
    });
  }

  delete(url: string) {
    return this.http.delete(environment.url + url, {
      headers: this.headers(url),
    });
  }
}
