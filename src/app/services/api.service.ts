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
   * Alamat yang BOLEH menerima refresh token.
   *
   * Hanya rute penyegaran, dan itu satu-satunya tempat backend membacanya.
   *
   * Refresh token menerbitkan token akses baru dan masa berlakunya jauh
   * lebih panjang. Mengirimnya pada setiap permintaan memperbanyak peluang
   * bocor ratusan kali sehari tanpa manfaat apa pun.
   *
   * Dicocokkan ke AWALAN alamat, bukan dicari di dalamnya: `includes()`
   * membuat alamat mana pun yang kebetulan memuat potongan ini ikut menerima
   * tokennya.
   */
  private static readonly JALUR_REFRESH = 'auth/refresh';

  /**
   * Header untuk satu permintaan.
   *
   * Refresh token disertakan HANYA pada jalur penyegaran; selebihnya cukup
   * token akses.
   */
  private headers(url: string): Record<string, string> {
    const akses = localStorage.getItem('access_token') ?? '';
    const h: Record<string, string> = {
      Authorization: `Bearer ${akses}`,
    };

    if (url.startsWith(ApiService.JALUR_REFRESH)) {
      const segar = localStorage.getItem('refresh_token') ?? '';
      h['X-Refresh-Token'] = `Bearer ${segar}`;
    }
    return h;
  }

  post(url: string, body: any) {
    return this.http.post(environment.url + url, body, {
      headers: this.headers(url),
    });
  }

  get(url: string, queryParams: any) {
    return this.http.get(environment.url + url, {
      headers: this.headers(url),
      params: queryParams,
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
