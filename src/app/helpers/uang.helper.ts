/**
 * SATU cara menulis nilai uang di seluruh aplikasi: dua angka di belakang
 * koma, selalu.
 *
 * KENAPA BERKAS INI ADA
 *
 * Sebelum ini ada LIMA pemformat rupiah yang berdiri sendiri-sendiri —
 * `purchase-order-shared.helper`, `invoice.helper`,
 * `project-report-download`, `clause-templates`, dan `chart-dasar.helper` —
 * plus puluhan `Intl.NumberFormat` yang ditulis langsung di komponennya, plus
 * empat varian pipe `number` (`1.0-0`, `1.0-2`, `1.2-2`, `0.2-2`).
 *
 * Akibatnya satu angka yang sama ditulis berbeda tergantung layar mana yang
 * kebetulan menampilkannya. Itu bukan soal selera:
 *
 *   * PPN 11% dari angka bulat hampir tidak pernah bulat. Dibulatkan ke
 *     rupiah penuh, PPN yang tercetak selalu meleset dari perkaliannya
 *     sendiri — dan yang menerima dokumennya mengalikan DPP dengan 11%,
 *     mendapat angka lain, lalu menanyakan mana yang benar.
 *   * Kolom nominal yang sebagian barisnya berdesimal dan sebagian tidak
 *     sulit dibandingkan sekilas. Pada dokumen yang ditandatangani,
 *     dibandingkan sekilas itulah yang terjadi.
 *   * Dua tulisan berbeda untuk satu angka membuat KEDUANYA berhenti
 *     dipercaya. Yang melihat `535.401.958` di kartu dan
 *     `535.401.957,76` di tooltip tidak menyimpulkan "pembulatan"; ia
 *     menyimpulkan salah satunya salah.
 *
 * YANG BUKAN URUSAN BERKAS INI
 *
 *   * VOLUME dan kuantitas. 10 set tetap "10", bukan "10,00" — desimal palsu
 *     terbaca seperti ketelitian yang tidak ada, dan pada satuan seperti
 *     "set" pecahan memang mustahil. Pakai `angkaSatuan()` di
 *     `purchase-order-shared.helper`.
 *   * PERSENTASE. Tarif dan porsi punya ketelitiannya sendiri; sebagian
 *     bahkan perlu tiga desimal (progres mingguan pada kontrak besar kerap
 *     di bawah 0,01%).
 *   * NOMINAL RINGKAS untuk label sumbu grafik ("1,2 M", "350 jt"). Itu
 *     bentuk baca cepat, bukan nilai dokumen.
 */

/** Tanpa awalan "Rp" — sebagian pemanggil menaruhnya di kolom tersendiri. */
export function uangDokumen(nilai: unknown): string {
  const n = Number(nilai);
  return (Number.isFinite(n) ? n : 0).toLocaleString('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** `Rp 1.234.567,89`. */
export function uangDokumenRp(nilai: unknown): string {
  return `Rp ${uangDokumen(nilai)}`;
}
