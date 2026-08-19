/**
 * Pembulatan nilai rupiah pada isian dokumen.
 *
 * Semula seluruh nilai dibulatkan ke DUA desimal. Itu cukup selama tarif
 * pajaknya menghasilkan angka yang bulat, dan berhenti cukup sejak PPN 11%:
 * menghitung mundur dari total faktur — DPP = total ÷ 1,11 — hampir tidak
 * pernah menghasilkan dua desimal. Selisihnya kecil per baris, tetapi ia
 * muncul lagi sebagai selisih rekonsiliasi yang harus dicari orang.
 *
 * Empat desimal, bukan lebih: yang dikejar hanya menampung hasil bagi tarif
 * pajak, bukan menyimpan pecahan sen tanpa batas.
 *
 * Nol di belakang koma DIBUANG. `toFixed(4)` selalu menuliskan empat desimal,
 * sehingga nilai yang memang bulat tercetak "1 000,0000" — angka yang benar
 * tetapi terbaca seperti ketelitian yang tidak ada. Yang dikehendaki
 * "maksimal empat", bukan "selalu empat".
 */

/** Banyak desimal maksimum untuk nilai rupiah. */
export const DESIMAL_NILAI = 4;

/**
 * Bulatkan nilai rupiah, lalu tuliskan tanpa nol di belakang koma.
 *
 * Mengembalikan TEKS, bukan bilangan, karena inilah yang dipasang ke kendali
 * formulir — dan `ngx-mask` membaca teks. Nilai yang tidak berhingga
 * dikembalikan sebagai '0': pembagian dengan nol pernah terjadi di layar ini,
 * dan 'Infinity' yang masuk ke isian jauh lebih sulit ditelusuri daripada nol.
 */
export function nilaiUang(nilai: unknown): string {
  const n = Number(nilai);
  if (!isFinite(n)) return '0';
  // `Number(...)` membuang nol di belakang koma; `String(...)` tidak memakai
  // notasi eksponen pada besaran rupiah mana pun yang masuk akal.
  return String(Number(n.toFixed(DESIMAL_NILAI)));
}
