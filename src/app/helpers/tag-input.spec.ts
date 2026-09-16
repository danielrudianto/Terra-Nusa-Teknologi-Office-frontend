import { MAKS_PANJANG_TAG, pisahTag } from './tag-input.helper';

/**
 * Isian tag berkoma pada formulir pemasok.
 *
 * Berkas ini berawal dari satu keluhan — pil tidak bisa dihapus dengan
 * mengklik badannya — dan satu firasat: "gw jadi curiga edit juga dkk deh".
 * Firasatnya benar. Logikanya disalin PERSIS empat kali (item & area, pada
 * formulir buat & ubah), berikut seluruh cacatnya.
 *
 * Yang dijaga di sini keempat cacat itu. Tidak satu pun menghasilkan galat;
 * semuanya berupa formulir yang terlihat bekerja sambil menyimpan hal yang
 * salah.
 */
describe('Isian tag berkoma', () => {
  // ------------------------------------------------------------------
  // 1. Tempel
  // ------------------------------------------------------------------

  it('MENEMPEL beberapa nilai sekaligus memecahnya dengan benar', () => {
    /*
     * Perilaku lama: `value.slice(0, -1)` menganggap komanya aksara terakhir,
     * sehingga seluruh tempelan menjadi SATU pil berbunyi
     * `besi, semen, pasi` — huruf terakhirnya ikut terpotong. Pilnya
     * terbentuk, jadi yang menempelnya menganggapnya berhasil.
     */
    const h = pisahTag('besi, semen, pasir,');
    expect(h.tag).toEqual(['besi', 'semen', 'pasir']);
    expect(h.sisa).toBe('');
  });

  it('tempelan TANPA koma penutup menyisakan yang terakhir di kotak', () => {
    // Koma yang mengunci. Yang belum berkoma belum tentu selesai diketik.
    const h = pisahTag('besi, semen, pasir');
    expect(h.tag).toEqual(['besi', 'semen']);
    expect(h.sisa).toBe(' pasir');
  });

  // ------------------------------------------------------------------
  // 2. Kembar
  // ------------------------------------------------------------------

  it('nilai KEMBAR ditolak, tetapi kotaknya TETAP dikosongkan', () => {
    /*
     * Cacat lama yang paling membingungkan. Bila nilainya sudah ada, cabang
     * `if` tidak dijalankan — termasuk pengosongan kotaknya. Teks `besi,`
     * tertinggal selamanya, dan setiap ketukan berikutnya mengulang hal yang
     * sama. Tanpa pesan apa pun.
     */
    const h = pisahTag('besi,', ['besi']);
    expect(h.tag).toEqual([]);
    expect(h.sisa).toBe('');
    expect(h.adaKembar)
      .withContext('kembar harus DAPAT DIBERITAHUKAN, bukan didiamkan')
      .toBeTrue();
  });

  it('kembar tidak peduli besar-kecil huruf maupun spasi', () => {
    // `Besi Beton` dan `besi beton` adalah barang yang sama; membiarkan
    // keduanya masuk membuat daftar pemasok punya dua baris untuk satu hal.
    expect(pisahTag('  BESI beton ,', ['Besi Beton']).tag).toEqual([]);
  });

  it('kembar DI DALAM satu tempelan juga ditolak', () => {
    const h = pisahTag('besi, semen, besi,');
    expect(h.tag).toEqual(['besi', 'semen']);
    expect(h.adaKembar).toBeTrue();
  });

  // ------------------------------------------------------------------
  // 3. Spasi
  // ------------------------------------------------------------------

  it('spasi di ujung dirapikan', () => {
    // Koma diikuti spasi adalah cara orang mengetik; tanpa perapian, `besi`
    // dan ` besi` menjadi dua pil berbeda.
    expect(pisahTag('  besi  ,').tag).toEqual(['besi']);
    expect(pisahTag('besi , semen ,').tag).toEqual(['besi', 'semen']);
  });

  it('spasi DI TENGAH nama dipertahankan', () => {
    expect(pisahTag('besi beton ulir,').tag).toEqual(['besi beton ulir']);
  });

  it('teks yang belum berkoma TIDAK dirapikan', () => {
    /*
     * Kalau sisanya ikut di-trim, spasi yang sedang diketik orang di tengah
     * kalimat langsung hilang di bawah jarinya.
     */
    const h = pisahTag('besi beton ');
    expect(h.sisa).toBe('besi beton ');
    expect(h.tag).toEqual([]);
  });

  // ------------------------------------------------------------------
  // 4. Pil kosong
  // ------------------------------------------------------------------

  it('koma sendirian tidak menghasilkan pil', () => {
    expect(pisahTag(',').tag).toEqual([]);
    expect(pisahTag(',,,').tag).toEqual([]);
  });

  it('spasi lalu koma tidak menghasilkan pil KOSONG', () => {
    /*
     * `" ,"` panjangnya dua, jadi lolos penjagaan `length > 1` yang lama —
     * dan yang masuk daftar adalah satu spasi. Pil kosong di layar, dan satu
     * baris kosong tersimpan di basis data.
     */
    expect(pisahTag(' ,').tag).toEqual([]);
  });

  it('koma beruntun dilewati, bukan menghasilkan pil di antaranya', () => {
    expect(pisahTag('besi,,semen,').tag).toEqual(['besi', 'semen']);
  });

  // ------------------------------------------------------------------
  // Ketahanan
  // ------------------------------------------------------------------

  it('nilai kosong dan null tidak menjatuhkan apa pun', () => {
    /*
     * `reset()` pada formulir menyetel kendalinya menjadi `null`, dan
     * `null.includes` melempar. Pelemparan di dalam `subscribe` MEMATIKAN
     * langganannya — sesudah itu mengetik koma tidak pernah membuat pil lagi,
     * untuk sisa umur halaman itu.
     */
    expect(pisahTag(null).tag).toEqual([]);
    expect(pisahTag(undefined).tag).toEqual([]);
    expect(pisahTag('').sisa).toBe('');
  });

  it('nilai yang kelewat panjang dipotong', () => {
    const panjang = 'x'.repeat(500);
    const h = pisahTag(`${panjang},`);
    expect(h.tag[0].length).toBe(MAKS_PANJANG_TAG);
  });

  it('tanpa koma, tidak ada yang dikunci', () => {
    const h = pisahTag('besi', []);
    expect(h.tag).toEqual([]);
    expect(h.sisa).toBe('besi');
  });
});
