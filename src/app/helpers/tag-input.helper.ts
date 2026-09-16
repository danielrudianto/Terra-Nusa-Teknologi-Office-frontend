/**
 * Isian yang mengubah teks berkoma menjadi daftar pil.
 *
 * Dipakai "item yang dijual" dan "area layanan" pada formulir pemasok — buat
 * maupun ubah. Sebelumnya logikanya ditulis EMPAT KALI, disalin apa adanya,
 * dengan bentuk seperti ini:
 *
 *     if (value.includes(',') && value.length > 1) {
 *       const item = value.slice(0, -1);
 *       if (!this.items.includes(item)) { ... }
 *     }
 *
 * Empat cacat, dan tidak satu pun menghasilkan galat:
 *
 * 1. TEMPEL RUSAK. `slice(0, -1)` menganggap komanya selalu aksara TERAKHIR.
 *    Menempel `besi, semen, pasir` menghasilkan SATU pil berbunyi
 *    `besi, semen, pasi` — huruf terakhirnya ikut terpotong. Yang menempelnya
 *    melihat pil terbentuk dan menganggapnya berhasil.
 *
 * 2. KEMBAR MEMBEKUKAN ISIANNYA. Bila nilainya sudah ada, cabang `if` tidak
 *    dijalankan — termasuk pengosongan isiannya. Teks `besi,` tertinggal di
 *    kotak selamanya, dan setiap ketukan berikutnya mengulang hal yang sama.
 *    Tidak ada pesan apa pun; yang mengetiknya menyimpulkan formulirnya
 *    menggantung.
 *
 * 3. SPASI DIANGGAP BAGIAN NAMA. `besi` dan `besi ` menjadi dua pil berbeda,
 *    dan koma diikuti spasi — cara orang mengetik — selalu menghasilkan yang
 *    kedua.
 *
 * 4. PIL KOSONG. `" ,"` panjangnya dua, jadi lolos penjagaan `length > 1`,
 *    dan yang masuk daftar adalah satu spasi.
 *
 * Fungsi ini menggantikan keempatnya dengan satu perilaku: KOMA MENGUNCI.
 * Apa pun sebelum koma terakhir dipecah, dirapikan, dan menjadi pil; sisanya
 * tetap di kotak supaya yang sedang diketik tidak hilang.
 */

export interface HasilTag {
  /** Nilai baru yang siap menjadi pil; sudah dirapikan dan tanpa kembar. */
  tag: string[];
  /** Yang tersisa di kotak isian — bagian setelah koma terakhir. */
  sisa: string;
  /** Ada yang ditolak karena sudah ada di daftar. */
  adaKembar: boolean;
}

/** Panjang satu tag; nilai yang lebih panjang hampir pasti salah tempel. */
export const MAKS_PANJANG_TAG = 80;

/**
 * Memecah isian menjadi tag baru + sisa yang masih diketik.
 *
 * `sudahAda` dibandingkan tanpa peduli besar-kecil huruf: `Besi Beton` dan
 * `besi beton` adalah barang yang sama, dan membiarkan keduanya masuk membuat
 * daftar pemasok punya dua baris untuk satu hal.
 */
export function pisahTag(
  nilai: string | null | undefined,
  sudahAda: readonly string[] = [],
): HasilTag {
  const teks = String(nilai ?? '');
  if (!teks.includes(',')) {
    // Belum ada koma: belum ada yang dikunci. Kotaknya dibiarkan apa adanya —
    // mengembalikan teks yang sudah dirapikan di sini akan memakan spasi yang
    // sedang diketik orang di tengah kata.
    return { tag: [], sisa: teks, adaKembar: false };
  }

  const batas = teks.lastIndexOf(',');
  const bagian = teks.slice(0, batas).split(',');
  const sisa = teks.slice(batas + 1);

  const tag: string[] = [];
  let adaKembar = false;

  const kunci = (s: string) => s.trim().toLowerCase();
  const terpakai = new Set(sudahAda.map(kunci));

  for (const b of bagian) {
    const bersih = b.trim().slice(0, MAKS_PANJANG_TAG);
    if (!bersih) continue; // `" ,"` dan koma beruntun tidak menghasilkan pil
    if (terpakai.has(kunci(bersih))) {
      adaKembar = true;
      continue;
    }
    terpakai.add(kunci(bersih));
    tag.push(bersih);
  }

  return { tag, sisa, adaKembar };
}
