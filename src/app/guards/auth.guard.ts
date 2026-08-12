import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

/**
 * Tahan halaman bagi yang belum masuk.
 *
 * Sebelumnya penjaga ini selalu meloloskan, dan tidak dipasang di rute mana
 * pun. Akibatnya aplikasi tetap terbuka tanpa token sama sekali: berandanya
 * muncul dengan nama "Guest", menu kosong karena izin tidak dapat dimuat, dan
 * setiap permintaan ke server ditolak — tanpa satu pun keterangan yang
 * menjelaskan bahwa penyebabnya adalah belum masuk.
 *
 * Yang diperiksa hanya keberadaan token, bukan keabsahannya. Token
 * kedaluwarsa tetap ditolak server, dan interceptor yang menanganinya.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);

  let token: string | null = null;
  try {
    token = localStorage.getItem('access_token');
  } catch {
    token = null;
  }

  if (token) return true;

  // Alamat yang dituju disimpan agar setelah masuk pengguna kembali ke sana,
  // bukan selalu terlempar ke beranda.
  try {
    if (state.url && !state.url.startsWith('/Login')) {
      localStorage.setItem('returnUrl', state.url);
    }
  } catch {}

  router.navigate(['/Login']);
  return false;
};
