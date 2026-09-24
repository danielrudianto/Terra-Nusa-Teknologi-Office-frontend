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

  it('BENTUK INDONESIA LENGKAP terbaca benar — lubangnya sudah ditutup', () => {
    /*
     * "1.234,5" = seribu dua ratus tiga puluh empat koma lima. Ditulis
     * begitu oleh siapa pun yang menulis angka di Indonesia.
     *
     * Yang LAMA: `replace(',', '.')` menghasilkan "1.234.5" -> NaN -> 0.
     * Nol itu tidak terlihat sebagai galat, melainkan seperti baris yang
     * memang tidak diisi — berita acaranya terbit tanpa baris itu.
     *
     * Aturannya sekarang: bila ada DUA jenis pemisah, yang muncul terakhir
     * adalah desimalnya.
     */
    expect(angka('1.234,5')).toBeCloseTo(1234.5, 4);
    expect(angka('12.000,75')).toBeCloseTo(12000.75, 4);
    // Bentuk Inggris juga, karena keduanya beredar di berkas yang disalin.
    expect(angka('1,234.5')).toBeCloseTo(1234.5, 4);
  });

  it('spasi dari mask dibuang, bukan bikin NaN', () => {
    // Nilai kontrolnya datang dari ngx-mask berpemisah ribuan spasi.
    expect(angka('720 404')).toBe(720404);
    expect(angka('67 095.22')).toBeCloseTo(67095.22, 2);
  });

  it('yang benar-benar bukan angka tetap nol', () => {
    expect(angka('abc')).toBe(0);
    expect(angka('-')).toBe(0);
    expect(angka('  ')).toBe(0);
  });

  it('angka tanpa pemisah tetap diterima apa adanya', () => {
    /*
     * Asal 2,16 miliar: "720404" diketik utuh, dimaksudkan 720,404 m'.
     *
     * Penguraiannya memang tidak salah — 720404 ya 720404. Yang berubah
     * bukan di sini melainkan di KOTAKNYA: dengan mask, angka itu tampil
     * "720 404", dan enam digit terbaca sebagai enam digit.
     *
     * Gerbang yang benar-benar menahannya tetap persetujuan BAP oleh
     * manusia — dan pada ketiga berita acara itu, gerbang tersebut memang
     * menahannya: tidak satu pun pernah disetujui.
     */
    expect(angka('720404')).toBe(720404);
    expect(angka('126394')).toBe(126394);
  });
});
