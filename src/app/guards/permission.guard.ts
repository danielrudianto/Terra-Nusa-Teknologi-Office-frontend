import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermissionService } from '../services/permission.service';

/**
 * Tahan halaman yang tidak berhak dibuka.
 *
 * Menyembunyikan menu saja tidak cukup — alamat halaman bisa diketik
 * langsung, atau tersimpan sebagai penanda buku. Penjaga ini menutup jalan
 * itu, sementara rute di server tetap menjadi penentu terakhir.
 *
 * Izin yang diperlukan ditulis pada `data.permission` di berkas rute:
 *
 *     { path: 'Salary-slip', data: { permission: 'salary_slip:read' } }
 *
 * Rute tanpa `data.permission` dibiarkan terbuka: penjaga ini hanya menahan
 * yang memang disebutkan, sehingga menambahkannya bisa bertahap tanpa
 * memutus halaman yang belum sempat dipetakan.
 */
export const permissionGuard: CanActivateFn = async (route, _state) => {
  const perm = inject(PermissionService);
  const router = inject(Router);

  const aturan = route.data?.['permission'] as string | string[] | undefined;
  if (!aturan) return true;

  // Halaman bisa dibuka langsung dari alamat, jadi izinnya mungkin belum
  // sempat dimuat saat penjaga berjalan.
  await perm.load();

  const daftar = Array.isArray(aturan) ? aturan : [aturan];
  const boleh = daftar.some((r) => {
    const [modul, aksi] = r.split(':');
    return perm.can(modul, (aksi || 'read').trim());
  });

  if (boleh) return true;

  /*
   * Dikembalikan ke beranda, bukan ke halaman galat: pengguna tidak salah
   * apa pun, halaman itu memang bukan bagiannya.
   *
   * Berandanya adalah rute kosong ('/'), bukan '/Dashboard' — mengarahkan ke
   * alamat yang tidak ada membuat penjaga ini berjalan lagi dan lagi, dan
   * layar berputar tanpa henti tanpa pesan apa pun.
   */
  if (_state.url === '/' || _state.url === '') {
    // Beranda sendiri tidak boleh dijaga; kalau sampai ke sini, biarkan
    // lewat daripada berputar.
    return true;
  }

  router.navigate(['/']);
  return false;
};
