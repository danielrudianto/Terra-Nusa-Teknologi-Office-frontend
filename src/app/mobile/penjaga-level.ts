/**
 * Aplikasi mobile hanya untuk level 3 sampai 5.
 *
 * MENGAPA ADA BATASNYA
 *
 * Yang ada di sini menyetujui dan menghapus — tidak ada satu pun layar untuk
 * membuat atau mengubah dokumen. Bagi level di bawah 3 aplikasi ini kosong:
 * ia dapat masuk, melihat daftar, dan tidak dapat menekan apa pun. Layar
 * penuh tombol yang semuanya ditolak lebih buruk daripada pintu yang
 * tertutup dengan keterangan.
 *
 * PENJAGA INI BUKAN PENGAMANAN
 *
 * Yang menentukan tetap server: setiap persetujuan dan penghapusan diperiksa
 * ulang di sana, dengan aturan yang sama yang berlaku bagi desktop. Penjaga
 * ini hanya menghindarkan orang dari layar yang tidak dapat dipakainya.
 *
 * Menyalin aturannya ke sini — "level 3 boleh menyetujui A tetapi tidak B" —
 * adalah kekeliruan yang sedang dihindari seluruh berkas di folder ini.
 */

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { PermissionService } from '../services/permission.service';

/** Level terendah yang punya sesuatu untuk dikerjakan di sini. */
export const LEVEL_MINIMUM_MOBILE = 3;

export const levelGuard: CanActivateFn = async () => {
  const izin = inject(PermissionService);
  const router = inject(Router);

  /*
   * Izinnya DITUNGGU, tidak dibaca begitu saja.
   *
   * `level()` bernilai 1 sampai jawabannya datang dari server. Membacanya
   * tanpa menunggu menolak SETIAP pengguna pada pemuatan pertama — termasuk
   * pemilik — dan yang mengalaminya melihat "level tidak mencukupi" pada
   * aplikasi yang belum sempat menanyakan apa pun.
   */
  try {
    await izin.load();
  } catch {
    // Gagal memuat izin bukan berarti tidak berhak. Server tetap menolak
    // bila memang tidak berhak, dan pesannya lebih jelas daripada penolakan
    // di sini yang tidak menyebut sebabnya.
    return true;
  }

  if (izin.level() >= LEVEL_MINIMUM_MOBILE) return true;

  router.navigate(['/TidakBerhak']);
  return false;
};
