/**
 * Pilihan "baris per halaman" — SATU daftar untuk seluruh aplikasi.
 *
 * Sebelumnya tiap daftar menuliskan pilihannya sendiri di templat, dan
 * ketiga ejaan berbeda itu hidup berdampingan tanpa ada yang menyadarinya:
 * 22 daftar memakai 10/25/50, Certificate of Payment memakai 10/20/50, dan
 * Audit memakai 10/25/100. Yang memakainya membaca itu sebagai setelannya
 * tidak bekerja — ia memilih 25 di Pengaturan, lalu menemukan daftar yang
 * menawarkan 20.
 *
 * Mengubah pilihannya sekarang berarti mengubah berkas ini saja.
 *
 * `PAGE_SIZES` di `setting.service.ts` sengaja TIDAK dipakai langsung: ia
 * daftar nilai yang SAH untuk disimpan (termasuk 100, yang pernah dipilih
 * orang dan harus tetap terbaca), sedangkan yang di sini daftar yang
 * DITAWARKAN. Menyamakan keduanya berarti menghapus pilihan orang yang
 * terlanjur menyimpan 100.
 */
export const PILIHAN_BARIS: number[] = [10, 25, 50];
