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

    this.pending = firstValueFrom(this.api.get('permissions/me', {}))
      .then((res: any) => {
        this.permissions.set(res?.permissions ?? {});
        this.level.set(Number(res?.level) || 1);
        this.loaded.set(true);
      })
      .catch((err) => {
        // Gagal memuat bukan berarti boleh segalanya: peta dikosongkan
        // sehingga layar menampilkan sesedikit mungkin, dan server tetap
        // menjadi penentu terakhir.
        //
        // Kegagalannya sengaja dicatat dengan jelas. Tanpa ini gejalanya
        // menyesatkan: seluruh menu hilang dan setiap halaman memantul ke
        // beranda, seolah izinnya salah — padahal endpoint-nya yang tidak
        // terjangkau (mis. server belum dijalankan ulang setelah rute baru
        // ditambahkan).
        console.error(
          '[Izin] Gagal memuat permissions/me — seluruh menu akan tersembunyi. ' +
            'Pastikan endpoint GET /permissions/me tersedia.',
          err,
        );
        this.permissions.set({});
        this.loaded.set(true);
      })
      .finally(() => {
        this.pending = null;
      });

    return this.pending;
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
