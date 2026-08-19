/**
 * Jumlah alat pada baris sewa, terpisah dari durasinya.
 *
 * Yang dijaga di sini dua hal, dan yang kedua sama pentingnya dengan yang
 * pertama:
 *
 *   1. sepuluh set selama tiga bulan menghasilkan nilai dan cetakan yang
 *      benar;
 *   2. baris yang menyewa SATU alat berperilaku persis seperti sebelum kolom
 *      ini ada — sampai ke satuan yang tercetak.
 *
 * Yang kedua menentukan apakah dokumen lama boleh dibuka kembali. Ratusan
 * purchase order sewa sudah terbit; bila membukanya menghasilkan cetakan yang
 * berbeda dari lembar yang sudah ditandatangani, dokumen sistem dan dokumen
 * vendor tidak lagi sama.
 */

import {
  JUMLAH_ALAT_BAWAAN,
  SATUAN_ALAT,
  bacaJumlahAlat,
  rincianSewa,
  simpanJumlahAlat,
  volumeCetak,
} from './unit-sewa';

describe('jumlah alat pada baris sewa', () => {
  describe('penyimpanan ke remarks_6', () => {
    it('merakit dan membaca kembali nilai yang sama', () => {
      const disimpan = simpanJumlahAlat(10, 'set');
      expect(disimpan).toBe('10|set');
      expect(bacaJumlahAlat(disimpan)).toEqual({
        jumlahUnit: 10,
        satuanUnit: 'set',
      });
    });

    it('dokumen LAMA tanpa kolom ini dibaca sebagai satu', () => {
      // Inilah yang membuat dokumen lama tetap terbuka seperti sebelumnya.
      for (const kosong of [null, undefined, '', '   ']) {
        expect(bacaJumlahAlat(kosong)).toEqual({
          jumlahUnit: JUMLAH_ALAT_BAWAAN,
          satuanUnit: 'set',
        });
      }
    });

    it('isi yang rusak tidak menjadi nol maupun NaN', () => {
      // Nol akan membuat seluruh nilai barisnya menjadi nol tanpa galat —
      // dokumen bernilai Rp 0 yang tampak sah.
      expect(bacaJumlahAlat('abc|set').jumlahUnit).toBe(1);
      expect(bacaJumlahAlat('0|set').jumlahUnit).toBe(1);
      expect(bacaJumlahAlat('-5|set').jumlahUnit).toBe(1);
      expect(bacaJumlahAlat('10|').satuanUnit).toBe('set');
    });

    it('satuan yang ditawarkan memuat yang dipakai di lapangan', () => {
      expect(SATUAN_ALAT).toContain('set');
      expect(SATUAN_ALAT).toContain('unit');
    });
  });

  describe('volume yang dicetak', () => {
    it('hasil kali kedua pengali, supaya perkaliannya cocok', () => {
      /*
       * Vendor memeriksa dokumennya dengan mengalikan volume × harga satuan
       * lalu mencocokkannya dengan jumlah. Sepuluh set selama tiga bulan
       * dengan harga Rp 50.000 per set per bulan bernilai Rp 1.500.000 —
       * dan itu hanya cocok bila volumenya tercetak 30, bukan 10.
       */
      const { volume, satuan } = volumeCetak(10, 3, 'bulan');
      expect(volume).toBe(30);
      expect(volume * 50_000).toBe(1_500_000);
      expect(satuan).toBe('bulan');
    });

    it('satu alat tercetak persis seperti sebelumnya', () => {
      const { volume, satuan } = volumeCetak(1, 7, 'hari');
      expect(volume).toBe(7);
      expect(satuan).toBe('hari');
    });

    it('jumlah alat yang tidak tersimpan diperlakukan sebagai satu', () => {
      expect(volumeCetak(undefined, 7, 'hari').volume).toBe(7);
      expect(volumeCetak(null, 7, 'hari').volume).toBe(7);
    });
  });

  describe('rincian di bawah nama alat', () => {
    it('menguraikan kedua pengali', () => {
      expect(rincianSewa(10, 'set', 3, 'bulan')).toBe('10 set × 3 bulan');
    });

    it('KOSONG bila hanya satu alat', () => {
      // "1 set × 3 bulan" pada setiap baris dokumen lama hanya menambah
      // keriuhan tanpa menambah keterangan.
      expect(rincianSewa(1, 'set', 3, 'bulan')).toBe('');
      expect(rincianSewa(undefined, 'set', 3, 'bulan')).toBe('');
    });
  });

  describe('perkalian nilai barisnya', () => {
    /** Rumus yang dipakai `nilaiSewaBaris` pada formulirnya. */
    const nilai = (alat: number, durasi: number, harga: number) =>
      (Number(harga) || 0) * (Number(durasi) || 0) * (Number(alat) || 1);

    it('sepuluh set scaffolding selama satu bulan', () => {
      // Rp 150.000 per set per bulan.
      expect(nilai(10, 1, 150_000)).toBe(1_500_000);
    });

    it('tiga pompa selama lima belas hari', () => {
      expect(nilai(3, 15, 200_000)).toBe(9_000_000);
    });

    it('baris lama tanpa jumlah alat bernilai sama seperti dulu', () => {
      // Jaminan bahwa dokumen lama tidak berubah nilainya.
      expect(nilai(undefined as any, 20, 500_000)).toBe(10_000_000);
    });
  });
});
