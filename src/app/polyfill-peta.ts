/**
 * POLYFILL `Map.prototype.getOrInsert` / `getOrInsertComputed`.
 *
 * pdf.js v5 memanggil keduanya — usulan "Upsert" yang baru mendarat di
 * peramban sangat baru (sekitar Chrome 142). Pada peramban yang sedikit
 * lebih lama, membuka halaman PDF melempar
 *
 *   TypeError: this[#methodPromises].getOrInsertComputed is not a function
 *
 * dari dalam pdf.js, dan yang terlihat pengguna hanyalah thumbnail yang
 * gagal digambar satu per satu — tanpa pesan yang menyebut sebabnya.
 *
 * Ditemukan saat menguji penyunting halaman pada Chromium 141: bukan hanya
 * penyuntingnya yang gagal, SELURUH pratinjau PDF gagal. Shim worker sudah
 * menambal `Promise.try` untuk alasan yang sama persis; berkas ini
 * mengerjakan bagian utas utamanya.
 *
 * DIPASANG GLOBAL di `main.ts` dan `main.mobile.ts`, bukan diimpor
 * per-halaman.
 *
 * Mula-mula ia memang diimpor hanya oleh halaman yang memakai pdf.js —
 * dengan alasan halaman lain tidak perlu ikut memuatnya. Alasan itu runtuh
 * sejak pdfjs 6: peninjau SPK memakai pdf.js yang DIBUNDEL
 * `ngx-extended-pdf-viewer`, dan bundel itu tidak dapat diberi impor
 * tambahan dari sini. Satu-satunya tempat yang pasti berjalan lebih dulu
 * daripada seluruh bundel pdf.js adalah titik masuk aplikasinya.
 *
 * Isinya dua penjagaan `typeof ... !== 'function'` — memasangnya dua kali
 * tidak menimbulkan apa pun, dan ukurannya sepersekian kilobita.
 */
type PetaUpsert<K, V> = Map<K, V> & {
  getOrInsert?(kunci: K, nilai: V): V;
  getOrInsertComputed?(kunci: K, buat: (kunci: K) => V): V;
};

const proto = Map.prototype as PetaUpsert<unknown, unknown>;

if (typeof proto.getOrInsert !== 'function') {
  proto.getOrInsert = function (kunci: unknown, nilai: unknown) {
    if (!this.has(kunci)) this.set(kunci, nilai);
    return this.get(kunci);
  };
}

if (typeof proto.getOrInsertComputed !== 'function') {
  proto.getOrInsertComputed = function (
    kunci: unknown,
    buat: (kunci: unknown) => unknown,
  ) {
    // `has` lebih dahulu, bukan `get() ?? buat()`: nilai yang memang
    // tersimpan sebagai `undefined` atau `null` akan dihitung ulang setiap
    // kali bila diperiksa lewat nilainya.
    if (!this.has(kunci)) this.set(kunci, buat(kunci));
    return this.get(kunci);
  };
}

export {};
