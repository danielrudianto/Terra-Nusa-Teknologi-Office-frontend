/**
 * Ingatan satu langkah untuk getter/metode yang MEMBUAT LARIK.
 *
 * KENAPA ADA
 *
 * `*ngFor="let x of sesuatuYangMembuatLarik"` memanggil sumbernya pada SETIAP
 * putaran deteksi perubahan — dan putaran itu terjadi pada tiap ketikan, tiap
 * gerakan tetikus di atas tombol, tiap kali timer berdetak. Bila sumbernya
 * `.map()` atau `.filter()`, larik yang keluar SELALU objek baru meski isinya
 * sama persis, sehingga Angular membongkar dan menyusun ulang seluruh baris.
 *
 * Itu bukan sekadar boros. Pada daftar menu samping, larik baru tiap putaran
 * bertemu `routerLinkActive` — yang menandai putaran berikutnya — dan
 * keduanya saling memicu sampai halamannya membeku. Gejalanya: mengetik di
 * kotak cari membuat aplikasi berhenti menanggapi, dan menyegarkan pun tidak
 * menolong.
 *
 * `memoLarik` menyimpan HASIL TERAKHIR beserta kunci yang menghasilkannya.
 * Selama kuncinya sama, larik yang SAMA dikembalikan — Angular melihat objek
 * yang tidak berubah dan tidak menyentuh DOM-nya.
 *
 * Kuncinya dibandingkan dengan `Object.is` per unsur: sumber data biasanya
 * larik yang DIGANTI (bukan disunting) saat berubah, sehingga identitasnya
 * sudah cukup dan tidak perlu membandingkan isinya satu per satu.
 */
export function memoLarik<T>(
  hitung: () => T,
  kunci: () => unknown[],
): () => T {
  let kunciLama: unknown[] | null = null;
  let hasil: T;
  return () => {
    const k = kunci();
    if (
      kunciLama === null ||
      kunciLama.length !== k.length ||
      k.some((v, i) => !Object.is(v, kunciLama![i]))
    ) {
      kunciLama = k;
      hasil = hitung();
    }
    return hasil;
  };
}

/**
 * Ingatan per OBJEK, untuk metode yang dipanggil sebaris-sekali di dalam
 * `*ngFor` — `emberTahap(t)`, `typeChips(item)`.
 *
 * `WeakMap`: kuncinya baris data itu sendiri, dan entrinya ikut hilang
 * bersama datanya saat daftar diganti. Tidak ada yang perlu dibersihkan, dan
 * daftar yang dimuat ulang tidak mewarisi hasil lama — barisnya objek baru.
 */
export function memoPerBaris<K extends object, R>(
  hitung: (baris: K) => R,
): (baris: K | null | undefined) => R {
  const simpan = new WeakMap<K, R>();
  return (baris) => {
    if (!baris || typeof baris !== 'object') {
      // Baris kosong tidak dapat menjadi kunci WeakMap; hitung apa adanya.
      return hitung(baris as unknown as K);
    }
    const ada = simpan.get(baris);
    if (ada !== undefined) return ada;
    const nilai = hitung(baris);
    simpan.set(baris, nilai);
    return nilai;
  };
}
