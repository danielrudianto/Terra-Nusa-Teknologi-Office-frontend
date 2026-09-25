import { MatDialogRef } from '@angular/material/dialog';

/**
 * Pastikan dialog yang MELAPORKAN SESUATU saat ditutup tetap melaporkannya
 * walau ditutup lewat latar atau tombol `Esc`.
 *
 * MASALAH YANG DIBERESKAN, dan ia tidak menghasilkan galat apa pun.
 *
 * Sebagian dialog menutup dengan membawa kabar — "ada yang berubah",
 * "dokumennya disunting" — dan layar di belakangnya memuat ulang HANYA bila
 * kabar itu datang. Tombol tutupnya memang mengirimkannya. Tetapi dua jalan
 * penutupan bawaan Angular Material tidak: menekan di luar kotak dialog dan
 * menekan `Esc` menutup dengan `undefined`.
 *
 * Akibatnya persis seperti yang dilaporkan di lapangan:
 *
 *   * menyetujui CoP dari menu titik-tiga di daftar -> barisnya hilang;
 *   * menyetujui CoP dari dalam dialog lihat, lalu menutupnya dengan menekan
 *     di luar kotaknya — cara yang paling wajar — -> barisnya TETAP ADA.
 *
 * Yang melihatnya menyimpulkan persetujuannya gagal, lalu mengulanginya.
 *
 * CARA KERJANYA
 *
 * `disableClose` dipasang supaya kedua jalan itu tidak menutup sendiri lebih
 * dulu, lalu penutupannya dikerjakan di sini dengan nilai yang benar.
 * Perilakunya bagi pemakai TIDAK BERUBAH: latar dan `Esc` tetap menutup.
 *
 * `hasil` berupa fungsi, bukan nilai: ia dibaca PADA SAAT DITUTUP, bukan
 * saat dipasang. Dipasang di `ngOnInit`, nilai bendera perubahannya masih
 * `false` — dan menyalinnya saat itu membuat penjagaan ini melaporkan
 * "tidak ada yang berubah" selamanya, yaitu persis cacat yang hendak
 * dibereskan.
 *
 * `Esc` SAJA yang ditangkap dari papan tik. Tombol lain diteruskan apa
 * adanya — isian di dalam dialog masih memerlukannya.
 */
export function jagaPenutupanDialog<T>(
  ref: MatDialogRef<unknown, T> | null | undefined,
  hasil: () => T,
): void {
  if (!ref) return;
  ref.disableClose = true;
  ref.backdropClick().subscribe(() => ref.close(hasil()));
  ref.keydownEvents().subscribe((e) => {
    if (e.key === 'Escape') ref.close(hasil());
  });
}
