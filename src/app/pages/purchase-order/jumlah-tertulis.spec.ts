/**
 * Jumlah baris yang DITULIS: totalnya ikut, dan yang menyimpang dihentikan.
 *
 * Dua kekeliruan yang dijaga di sini pernah ada bersamaan pada formulir G,
 * dan keduanya tidak menimbulkan galat apa pun:
 *
 *   1. Barisnya menampilkan Rp 300.000 sesuai yang diketik, sementara total
 *      dokumen di berkas yang sama menjumlahkan Rp 299.999,70 — ia masih
 *      mengalikan volume kali harga sendiri. Helper cetaknya sudah memakai
 *      `nilaiBaris()`, sehingga yang tercetak berbeda dari yang terlihat di
 *      formulirnya.
 *
 *   2. Penjaga `adaJumlahMenyimpang` ada, lengkap, dan tidak dipanggil dari
 *      mana pun. Server membuang jumlah yang di luar batas TANPA menolak
 *      dokumennya, jadi yang mengetik angka ngawur menyimpan dengan lega dan
 *      baru mengetahuinya dari lembar di tangan vendor.
 *
 * Diuji lewat `nilai-baris.helper` dan aturan yang sama yang dipakai
 * formulir — bukan lewat komponennya, yang menyeret seluruh dialog dan
 * layanan cetak hanya untuk memeriksa penjumlahan.
 */

import {
  TOLERANSI_PEMBULATAN,
  jumlahBaris,
  nilaiBaris,
  pembulatanSah,
} from '../../helpers/nilai-baris.helper';

/** 7.000 liter Rp 300.000: harga satuannya tidak pernah bulat. */
const BARIS_SOLAR = { quantity: 7000, price: 42.8571, amount: 300000 };

/** Aturan yang sama dengan `adaJumlahMenyimpang` di formulir. */
function adaYangMenyimpang(baris: any[]): boolean {
  return baris.some((b) => !pembulatanSah(b.amount, b));
}

describe('jumlah baris tertulis', () => {
  it('baris memakai jumlah yang ditulis, bukan perkaliannya', () => {
    expect(nilaiBaris(BARIS_SOLAR)).toBe(300000);
  });

  it('total dokumen ikut jumlah yang ditulis', () => {
    /*
     * Inti kekeliruan pertama. Bila total masih mengalikan sendiri, angka di
     * bawah menjadi 299.999,70 — dan dokumennya memuat dua angka yang
     * bertentangan pada satu lembar yang sama.
     */
    expect(jumlahBaris([BARIS_SOLAR])).toBe(300000);
  });

  it('baris tanpa jumlah tertulis tetap dikalikan seperti biasa', () => {
    // Dokumen lama tidak punya kolom ini sama sekali; nilainya tidak boleh
    // bergeser sedikit pun, kalau tidak cetak ulang menghasilkan angka lain.
    const lama = [
      { quantity: 2, price: 1500 },
      { quantity: 3, price: 1000, amount: null },
    ];
    expect(jumlahBaris(lama as any)).toBe(6000);
  });

  it('campuran keduanya dijumlahkan dengan aturan masing-masing', () => {
    expect(jumlahBaris([BARIS_SOLAR, { quantity: 2, price: 500 }] as any)).toBe(
      301000,
    );
  });

  it('pembetulan dalam batas diterima', () => {
    expect(pembulatanSah(300000, BARIS_SOLAR)).toBeTrue();
    expect(adaYangMenyimpang([BARIS_SOLAR])).toBeFalse();
  });

  it('yang menyimpang jauh ditahan sebelum terkirim', () => {
    /*
     * Inti kekeliruan kedua. Di luar batas ini yang salah bukan
     * pembulatannya melainkan harga satuannya, dan server akan MEMBUANGNYA
     * diam-diam — formulir harus berhenti lebih dulu.
     */
    const ngawur = { quantity: 7000, price: 42.8571, amount: 350000 };
    expect(pembulatanSah(350000, ngawur)).toBeFalse();
    expect(adaYangMenyimpang([ngawur])).toBeTrue();
  });

  it('tepat di batas masih diterima, sedikit di luarnya tidak', () => {
    const b = { quantity: 1, price: 1000 };
    expect(pembulatanSah(1000 + TOLERANSI_PEMBULATAN, b)).toBeTrue();
    expect(pembulatanSah(1000 - TOLERANSI_PEMBULATAN, b)).toBeTrue();
    expect(pembulatanSah(1000 + TOLERANSI_PEMBULATAN + 0.01, b)).toBeFalse();
  });

  it('satu baris menyimpang menahan seluruh dokumen', () => {
    // Bukan hanya barisnya: dokumen terbit utuh atau tidak sama sekali.
    expect(
      adaYangMenyimpang([BARIS_SOLAR, { quantity: 1, price: 10, amount: 999 }]),
    ).toBeTrue();
  });

  it('nol adalah jumlah yang sah, bukan "tidak ditulis"', () => {
    expect(nilaiBaris({ quantity: 5, price: 100, amount: 0 } as any)).toBe(0);
  });
});
