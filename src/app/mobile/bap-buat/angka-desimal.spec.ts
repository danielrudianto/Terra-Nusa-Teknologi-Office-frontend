/*
 * LAYAR BAP PONSEL: penguraian angkanya.
 *
 * `angka()` mengganti SATU koma menjadi titik lalu memanggil `Number`.
 * Itu benar untuk "1,5", dan diam-diam salah untuk bentuk Indonesia yang
 * lengkap — "1.234,5" menjadi "1.234.5", yang bukan bilangan, dan
 * hasilnya NOL tanpa satu pun tanda di layar.
 *
 * Nol itu tidak terlihat sebagai galat: ia terlihat seperti baris yang
 * memang tidak diisi. Yang mengisinya di lapangan menekan simpan, berita
 * acaranya terbit tanpa baris itu, dan upah seminggu hilang dari dokumen
 * yang ditandatangani.
 *
 * Uji ini MENYATAKAN perilaku yang ada sekarang, berikut mana yang benar
 * dan mana yang lubang — supaya perbaikannya punya sasaran yang tidak
 * berubah-ubah.
 */

import { BapBuatComponent } from './bap-buat.component';

/** `angka()` privat; dipanggil lewat prototipenya, tanpa merakit komponen. */
function angka(v: unknown): number {
  return (BapBuatComponent as any).prototype['angka'].call({}, v);
}

describe('BAP ponsel — penguraian volume', () => {
  it('bentuk sederhana benar', () => {
    expect(angka('7')).toBe(7);
    expect(angka('126.39')).toBeCloseTo(126.39, 2);
    // Koma sebagai desimal — inilah yang memang disengaja.
    expect(angka('126,39')).toBeCloseTo(126.39, 2);
    expect(angka('')).toBe(0);
    expect(angka(null)).toBe(0);
  });

  it('BENTUK INDONESIA LENGKAP menjadi NOL — inilah lubangnya', () => {
    /*
     * "1.234,5" = seribu dua ratus tiga puluh empat koma lima.
     * Ditulis begitu oleh siapa pun yang menulis angka di Indonesia.
     *
     * `replace(',', '.')` menghasilkan "1.234.5" -> NaN -> 0.
     *
     * Diperiksa sebagai KEADAAN SEKARANG, bukan sebagai yang benar. Begitu
     * penguraiannya diperbaiki, uji ini yang harus diubah — dan perubahan
     * itulah tandanya lubangnya benar-benar ditutup.
     */
    expect(angka('1.234,5')).toBe(0);
    expect(angka('12.000,75')).toBe(0);
  });

  it('TIDAK ADA yang menahan angka tanpa pemisah', () => {
    /*
     * Asal 2,16 miliar: "720404" diketik utuh, dimaksudkan 720,404 m'.
     *
     * Diuraikan apa adanya — memang tidak ada yang salah pada
     * penguraiannya. Yang tidak ada adalah apa pun yang bertanya "yakin?"
     * sesudahnya: SPK D sengaja tanpa plafon (`tanpaPagu`), sehingga
     * `lebih()` mengembalikan false, tombol simpannya hidup, dan servernya
     * menerima.
     */
    expect(angka('720404')).toBe(720404);
    expect(angka('126394')).toBe(126394);
  });
});
