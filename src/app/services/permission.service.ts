import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';

/**
 * Izin efektif pengguna yang sedang masuk.
 *
 * Diambil dari server, bukan disimpulkan dari level di sisi layar. Matriksnya
 * sengaja tidak disalin ke sini: selain pasti melenceng bila hidup di dua
 * tempat, izin khusus per pengguna tidak dapat disimpulkan dari level. Slip
 * gaji tidak pernah terbuka lewat level mana pun, sehingga tanpa jawaban dari
 * server, menu gaji tidak akan pernah tampil bahkan bagi yang berhak.
 *
 * Menyembunyikan menu bukan pengamanan — rute di server tetap yang menolak.
 * Ini hanya agar pengguna tidak menekan tombol yang sudah pasti gagal.
 */
export type PermissionMap = Record<string, Record<string, boolean>>;

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private readonly api = inject(ApiService);

  /** Sinyal agar templat ikut menyegarkan begitu izin selesai dimuat. */
  readonly permissions = signal<PermissionMap>({});
  readonly level = signal<number>(1);
  readonly loaded = signal<boolean>(false);

  private pending: Promise<void> | null = null;

  /**
   * Muat izin sekali saja.
   *
   * Beberapa penjaga rute bisa berjalan bersamaan pada satu kali navigasi;
   * permintaan yang sedang berjalan dipakai ulang agar tidak menembak server
   * berkali-kali untuk jawaban yang sama.
   */
  load(force = false): Promise<void> {
    if (this.loaded() && !force) return Promise.resolve();
    if (this.pending && !force) return this.pending;

    /*
     * Tanpa token, tidak ada gunanya bertanya.
     *
     * Keadaan ini muncul tepat setelah keluar: token sudah dihapus, tetapi
     * perpindahan halaman ke Login masih memicu pemuatan izin. Permintaannya
     * pasti ditolak, dan yang tertinggal hanyalah dua baris merah di konsol
     * yang menyesatkan saat menelusuri masalah lain.
     */
    let token: string | null = null;
    try {
      token = localStorage.getItem('access_token');
    } catch {}
    if (!token) {
      this.permissions.set({});
      return Promise.resolve();
    }

    this.pending = this.fetch()
      /*
       * Satu kali percobaan ulang, tetapi TIDAK untuk sesi yang berakhir.
       *
       * Permintaan pertama setelah lama menganggur kerap ditolak karena
       * access token kedaluwarsa; penyegaran berjalan sendiri di interceptor,
       * sehingga percobaan kedua biasanya berhasil.
       *
       * Bila yang gagal adalah penyegarannya (401), mencoba lagi hanya
       * mengulang kegagalan yang sama dan menambah satu permintaan gagal di
       * konsol — pengguna memang harus masuk kembali.
       */
      .catch((err) => {
        if (this.sesiBerakhir(err)) throw err;
        return this.fetch();
      })
      .then((res: any) => {
        this.permissions.set(res?.permissions ?? {});
        this.level.set(Number(res?.level) || 1);
        this.loaded.set(true);
      })
      .catch((err) => {
        /*
         * Gagal memuat bukan berarti boleh segalanya: peta dikosongkan
         * sehingga layar menampilkan sesedikit mungkin, dan server tetap
         * menjadi penentu terakhir.
         *
         * Yang penting: `loaded` TIDAK ditandai selesai.
         *
         * Menandainya selesai membuat kegagalan sesaat menjadi permanen —
         * kasus yang paling sering terjadi adalah membuka aplikasi setelah
         * lama tidak dipakai: token sudah kedaluwarsa, permintaan pertama
         * ditolak, penyegaran token berhasil, tetapi izinnya sudah terlanjur
         * dianggap "sudah dimuat" dalam keadaan kosong. Seluruh menu hilang
         * sampai halaman dimuat ulang.
         */
        if (this.sesiBerakhir(err)) {
          // Sesi berakhir: interceptor sudah menangani pengalihan ke halaman
          // masuk. Peta izin dibiarkan apa adanya agar menu tidak lenyap
          // mendahului pesannya.
          console.warn('[Izin] Sesi berakhir; menunggu masuk kembali.');
          return;
        }

        console.error(
          '[Izin] Gagal memuat permissions/me — menu disembunyikan sementara ' +
            'dan akan dicoba lagi.',
          err,
        );
        this.permissions.set({});
      })
      .finally(() => {
        this.pending = null;
      });

    return this.pending;
  }

  private fetch(): Promise<any> {
    return firstValueFrom(this.api.get('permissions/me', {}));
  }

  /**
   * Apakah kegagalan disebabkan sesi yang sudah berakhir.
   *
   * Bila ya, penyegaran token pun sudah gagal dan pengguna sedang diarahkan
   * ke halaman masuk oleh interceptor. Peta izin tidak perlu dikosongkan:
   * mengosongkannya membuat menu lenyap lebih dulu, sementara pesan sesi
   * berakhir baru muncul beberapa saat kemudian — dan yang terlihat oleh
   * pengguna hanyalah menu yang tiba-tiba hilang tanpa sebab.
   */
  private sesiBerakhir(err: any): boolean {
    return err?.status === 401 || err?.status === 403;
  }

  /** Bersihkan saat keluar agar pengguna berikutnya tidak mewarisi izin. */
  clear(): void {
    this.permissions.set({});
    this.level.set(1);
    this.loaded.set(false);
    this.pending = null;
  }

  /** Apakah pengguna boleh melakukan aksi ini. */
  can(module: string, action: string): boolean {
    return this.permissions()[module]?.[action] === true;
  }

  /** Boleh melihat modul ini sama sekali. */
  canRead(module: string): boolean {
    return this.can(module, 'read');
  }

  /** Boleh salah satu dari beberapa modul — untuk menu yang memayungi banyak halaman. */
  canReadAny(...modules: string[]): boolean {
    return modules.some((m) => this.canRead(m));
  }
}
