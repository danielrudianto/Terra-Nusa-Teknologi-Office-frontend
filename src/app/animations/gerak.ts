/**
 * Saklar tunggal untuk SELURUH gerak mikro aplikasi.
 *
 * Angka yang menghitung naik, baris yang muncul berurutan, kerangka yang
 * berkilau, tombol yang mengecil saat ditekan, dan grafik yang tumbuh —
 * semuanya mematuhi satu atribut: `html[data-gerak="mati"]`.
 *
 * Atributnya dipasang SettingsService ketika jenis transisi halaman
 * disetel ke "Tanpa transisi". Satu pilihan di Pengaturan, bukan dua:
 * yang tidak mau halamannya bergerak juga tidak mau angkanya berlari.
 *
 * "Kurangi gerak" di sistem operasi sengaja TIDAK dipakai sebagai saklar
 * di sini, mengikuti keputusan pada transisi halaman: ia hanya memilihkan
 * nilai awal, lalu pengguna yang memutuskan (lihat setting.service.ts).
 */
export const ATRIBUT_GERAK = 'data-gerak';

export function gerakMati(): boolean {
  if (typeof document === 'undefined') return true;
  return document.documentElement.getAttribute(ATRIBUT_GERAK) === 'mati';
}

export function pasangGerak(hidup: boolean): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (hidup) root.removeAttribute(ATRIBUT_GERAK);
  else root.setAttribute(ATRIBUT_GERAK, 'mati');
}
