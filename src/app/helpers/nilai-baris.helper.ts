/**
 * Nilai satu baris dokumen: volume kali harga, atau jumlah yang DITULIS.
 *
 * MENGAPA PERLU DITULIS
 *
 * Harga satuan tersimpan empat desimal. Sebagian pekerjaan tidak pernah bulat
 * pada ketelitian itu: 7.000 liter seharga Rp 300.000 berarti Rp 42,857142…
 * per liter, dan yang paling dekat yang dapat disimpan adalah 42,8571 —
 * menghasilkan Rp 299.999,70 pada dokumen yang ditandatangani.
 *
 * Menambah desimal TIDAK menyelesaikannya: 300.000 ÷ 7.000 adalah pecahan
 * berulang yang tidak pernah habis, berapa pun desimalnya. Yang menyelesaikan
 * hanyalah menuliskan jumlahnya.
 *
 * MENGAPA DIBATASI
 *
 * Jumlah yang boleh ditulis bebas berarti dokumen dapat menyatakan angka yang
 * tidak ada hubungannya dengan volume dan harganya — dan yang membacanya
 * mengalikan keduanya, mendapat angka lain, lalu menanyakan mana yang benar.
 *
 * Karena itu selisihnya DIBATASI. Yang ditulis hanya boleh membetulkan
 * pembulatan, bukan menggantikan perkalian. Di luar batas itu, yang salah
 * bukan pembulatannya melainkan harga satuannya.
 *
 * Batasnya SATU nilai, dipakai bersama dengan penjaga rekap purchase order —
 * yang menandai dokumen ketika jumlah barisnya menyimpang dari nilai
 * dokumennya. Dua angka yang berbeda di dua tempat akan membuat dokumen yang
 * sah menurut formulir ditandai bermasalah oleh rekapnya.
 */

/** Selisih terbesar yang masih dianggap pembulatan, dalam rupiah. */
export const TOLERANSI_PEMBULATAN = 5;

interface BarisBernilai {
  quantity?: unknown;
  price?: unknown;
  /** Jumlah yang ditulis; kosong berarti dihitung dari volume kali harga. */
  amount?: unknown;
}

function angka(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

/** Volume kali harga, tanpa pembetulan apa pun. */
export function nilaiHitung(baris: BarisBernilai): number {
  return angka(baris?.quantity) * angka(baris?.price);
}

/**
 * Nilai baris yang BERLAKU.
 *
 * `amount` dipakai bila ada; selain itu jatuh ke perkalian biasa. Dokumen
 * lama tidak punya `amount` sama sekali, sehingga nilainya tidak berubah
 * sedikit pun — dan itulah yang membuat pencetakan ulang dokumen lama tetap
 * menghasilkan angka yang sama persis.
 *
 * Nol DIANGGAP nilai yang sah: baris bernilai nol memang mungkin. Yang
 * dianggap "tidak ditulis" hanya `null` dan `undefined`.
 */
export function nilaiBaris(baris: BarisBernilai): number {
  const ditulis = baris?.amount;
  if (ditulis === null || ditulis === undefined || ditulis === '') {
    return nilaiHitung(baris);
  }
  return angka(ditulis);
}

/** Jumlah seluruh baris, memakai aturan yang sama. */
export function jumlahBaris(daftar: readonly BarisBernilai[] | undefined): number {
  return (daftar ?? []).reduce((a, b) => a + nilaiBaris(b), 0);
}

/**
 * Jumlah yang ditulis masih dalam batas pembulatan.
 *
 * Dipakai formulir DAN server. Yang di formulir hanya agar orang tidak
 * ditolak sesudah mengisi seluruhnya; yang menentukan tetap servernya.
 */
export function pembulatanSah(
  ditulis: unknown,
  baris: BarisBernilai,
): boolean {
  if (ditulis === null || ditulis === undefined || ditulis === '') return true;
  const selisih = Math.abs(angka(ditulis) - nilaiHitung(baris));
  return selisih <= TOLERANSI_PEMBULATAN;
}
