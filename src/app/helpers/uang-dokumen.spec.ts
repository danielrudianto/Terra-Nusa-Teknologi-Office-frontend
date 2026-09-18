/**
 * Satu cara menulis nilai uang — diuji di satu tempat.
 *
 * Sebelum penyeragaman ini, nilai yang sama ditulis berbeda tergantung layar
 * mana yang menampilkannya: `1.000.000` di daftar, `1.000.000,00` di dokumen,
 * `Rp 535.401.957,759` di tooltip grafik. Yang melihat dua di antaranya tidak
 * menyimpulkan "pembulatan"; ia menyimpulkan salah satunya salah.
 */

import { uangDokumen, uangDokumenRp } from './uang.helper';

describe('uangDokumen', () => {
  it('SELALU dua desimal, walau angkanya bulat', () => {
    /*
     * Kolom nominal yang sebagian barisnya berdesimal dan sebagian tidak
     * sulit dibandingkan sekilas — dan pada dokumen yang ditandatangani,
     * dibandingkan sekilas itulah yang terjadi.
     */
    expect(uangDokumen(1_000_000)).toBe('1.000.000,00');
    expect(uangDokumen(0)).toBe('0,00');
    expect(uangDokumen(7)).toBe('7,00');
  });

  it('tidak membulatkan PPN ke rupiah penuh', () => {
    // 11% dari 1.234.567 = 135.802,37 — inilah yang dulu tercetak "135.802"
    // pada faktur penjualan, rekap tender, dan unduhan laporan proyek,
    // sehingga PPN yang tercetak tidak pernah cocok dengan perkaliannya.
    expect(uangDokumen(1_234_567 * 0.11)).toBe('135.802,37');
  });

  it('membuang kebocoran pecahan `float`', () => {
    /*
     * Ini alasan asli tooltip grafik dibulatkan dulu: `toLocaleString` tanpa
     * pengaturan menampilkan sampai TIGA desimal, sehingga saldo yang disusun
     * dari penjumlahan `float` tercetak `535.401.957,759`. Dua desimal
     * menutup kebocoran yang sama tanpa membulatkan ke rupiah penuh.
     */
    expect(uangDokumen(535_401_957.759)).toBe('535.401.957,76');
  });

  it('membulatkan desimal ketiga, bukan memotongnya', () => {
    expect(uangDokumen(1.005)).toBe('1,01');
    expect(uangDokumen(1.004)).toBe('1,00');
  });

  it('nilai negatif tetap bertanda', () => {
    expect(uangDokumen(-4_511_900)).toBe('-4.511.900,00');
  });

  it('nilai tak terbaca menjadi nol, bukan NaN', () => {
    // "NaN" yang tercetak pada dokumen yang mengikat vendor jauh lebih buruk
    // daripada nol yang jelas salah.
    expect(uangDokumen(null)).toBe('0,00');
    expect(uangDokumen(undefined)).toBe('0,00');
    expect(uangDokumen('bukan angka')).toBe('0,00');
    expect(uangDokumen(NaN)).toBe('0,00');
    expect(uangDokumen(Infinity)).toBe('0,00');
  });

  it('teks berisi angka tetap terbaca', () => {
    // Nilai dari server kerap datang sebagai teks (`DECIMAL` MySQL).
    expect(uangDokumen('1234.5')).toBe('1.234,50');
  });

  it('memakai pemisah ribuan Indonesia', () => {
    expect(uangDokumen(1_234_567.89)).toBe('1.234.567,89');
  });
});

describe('uangDokumenRp', () => {
  it('menambahkan awalan, tanpa mengubah angkanya', () => {
    expect(uangDokumenRp(1_000_000)).toBe('Rp 1.000.000,00');
    expect(uangDokumenRp(null)).toBe('Rp 0,00');
  });
});
