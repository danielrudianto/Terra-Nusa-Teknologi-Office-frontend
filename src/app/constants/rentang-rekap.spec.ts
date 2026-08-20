/**
 * Rentang tanggal rekap purchase order.
 *
 * Yang diuji di sini adalah aturan yang gagal TANPA SUARA. Rentang yang
 * meleset sehari, pekan yang dimulai pada hari yang keliru, dan rentang
 * terbalik semuanya menghasilkan berkas yang terbit dengan wajar — isinya
 * saja yang tidak sesuai judulnya. Tidak satu pun memunculkan galat.
 *
 * Tanggal acuannya selalu diberikan sebagai argumen, tidak pernah `new
 * Date()`, supaya hasilnya tidak berubah menurut hari pengujiannya dijalankan.
 */

import {
  labelRentang,
  potonganBerkas,
  rentangPeriode,
  rentangSah,
  tanggalLokal,
} from './rentang-rekap';

describe('rentang rekap', () => {
  describe('pekan berjalan', () => {
    /*
     * Pekan dimulai SENIN.
     *
     * `getDay()` menghitung Minggu sebagai 0. Memakainya apa adanya membuat
     * pekan dimulai Minggu — dan pada hari Senin, "pembelian minggu ini"
     * hanya akan memuat satu hari.
     */
    it('dimulai Senin dan berakhir Minggu', () => {
      // Rabu, 19 Agustus 2026.
      expect(rentangPeriode('minggu', new Date(2026, 7, 19))).toEqual({
        dari: '2026-08-17',
        sampai: '2026-08-23',
      });
    });

    it('pada hari SENIN memuat pekan penuh, bukan sehari', () => {
      expect(rentangPeriode('minggu', new Date(2026, 7, 17))).toEqual({
        dari: '2026-08-17',
        sampai: '2026-08-23',
      });
    });

    it('pada hari MINGGU masih pekan yang sama, bukan pekan berikutnya', () => {
      // Kekeliruan yang paling mungkin: hari Minggu terhitung sebagai awal
      // pekan baru, sehingga rekap yang disusun Minggu sore kosong.
      expect(rentangPeriode('minggu', new Date(2026, 7, 23))).toEqual({
        dari: '2026-08-17',
        sampai: '2026-08-23',
      });
    });

    it('melintasi pergantian bulan tanpa terpotong', () => {
      // Selasa, 1 September 2026 — pekannya dimulai 31 Agustus.
      expect(rentangPeriode('minggu', new Date(2026, 8, 1))).toEqual({
        dari: '2026-08-31',
        sampai: '2026-09-06',
      });
    });

    it('jam pada tanggal acuan tidak mengubah hasilnya', () => {
      const pagi = rentangPeriode('minggu', new Date(2026, 7, 19, 0, 1));
      const malam = rentangPeriode('minggu', new Date(2026, 7, 19, 23, 59));
      expect(pagi).toEqual(malam);
    });
  });

  describe('bulan berjalan', () => {
    it('dari tanggal 1 sampai hari terakhir', () => {
      expect(rentangPeriode('bulan', new Date(2026, 7, 19))).toEqual({
        dari: '2026-08-01',
        sampai: '2026-08-31',
      });
    });

    it('bulan berhari 30 tidak menjadi 31', () => {
      expect(rentangPeriode('bulan', new Date(2026, 8, 10))).toEqual({
        dari: '2026-09-01',
        sampai: '2026-09-30',
      });
    });

    it('Februari kabisat berakhir tanggal 29', () => {
      expect(rentangPeriode('bulan', new Date(2028, 1, 10))).toEqual({
        dari: '2028-02-01',
        sampai: '2028-02-29',
      });
    });

    it('Februari biasa berakhir tanggal 28', () => {
      expect(rentangPeriode('bulan', new Date(2026, 1, 10))).toEqual({
        dari: '2026-02-01',
        sampai: '2026-02-28',
      });
    });
  });

  describe('tanpa rentang bawaan', () => {
    it('"semua" tidak membatasi apa pun', () => {
      expect(rentangPeriode('semua', new Date(2026, 7, 19))).toEqual({
        dari: null,
        sampai: null,
      });
    });

    it('"manual" tidak mengisi apa pun sendiri', () => {
      // Bila ia mengisi sendiri, tanggal yang diketik pengguna tertimpa.
      expect(rentangPeriode('manual', new Date(2026, 7, 19))).toEqual({
        dari: null,
        sampai: null,
      });
    });
  });

  describe('tanggal setempat', () => {
    it('mengikuti komponen tanggal setempat, bukan UTC', () => {
      /*
       * Penjaga bagi pergeseran zona waktu. Tengah malam waktu Jakarta
       * adalah pukul 17.00 tanggal SEBELUMNYA menurut UTC, sehingga
       * `toISOString()` memundurkan setiap tanggal yang lahir dari pemilih
       * tanggal Material sehari penuh.
       */
      const d = new Date(2026, 0, 1, 0, 0);
      expect(tanggalLokal(d)).toBe(
        `${d.getFullYear()}-` +
          `${String(d.getMonth() + 1).padStart(2, '0')}-` +
          `${String(d.getDate()).padStart(2, '0')}`,
      );
      expect(tanggalLokal(d)).toBe('2026-01-01');
    });

    it('kosong tetap kosong, bukan tanggal hari ini', () => {
      expect(tanggalLokal(null)).toBeNull();
      expect(tanggalLokal(new Date('bukan tanggal'))).toBeNull();
    });
  });

  describe('rentang terbalik', () => {
    /*
     * Rentang terbalik TIDAK menghasilkan galat dari server: kondisi SQL-nya
     * hanya tidak pernah terpenuhi, dan berkasnya terbit kosong tanpa sebab
     * yang terbaca.
     */
    it('akhir yang mendahului awal ditolak', () => {
      expect(rentangSah({ dari: '2026-08-20', sampai: '2026-08-01' })).toBeFalse();
    });

    it('satu hari saja diterima', () => {
      expect(rentangSah({ dari: '2026-08-20', sampai: '2026-08-20' })).toBeTrue();
    });

    it('rentang sebelah tidak dianggap terbalik', () => {
      expect(rentangSah({ dari: '2026-08-20', sampai: null })).toBeTrue();
      expect(rentangSah({ dari: null, sampai: '2026-08-20' })).toBeTrue();
      expect(rentangSah({ dari: null, sampai: null })).toBeTrue();
    });
  });

  describe('keterangan yang tercetak pada berkasnya', () => {
    /*
     * Rekap sepotong yang tidak menyebut periodenya terbaca sebagai rekap
     * seluruh proyek — dan penerimanya menyimpulkan proyek itu hanya punya
     * sekian pembelian.
     */
    it('menyebut kedua tanggal', () => {
      expect(labelRentang({ dari: '2026-08-17', sampai: '2026-08-23' })).toBe(
        '17 Agustus 2026 – 23 Agustus 2026',
      );
    });

    it('satu hari disebut sekali, bukan dua kali', () => {
      expect(labelRentang({ dari: '2026-08-17', sampai: '2026-08-17' })).toBe(
        '17 Agustus 2026',
      );
    });

    it('rentang sebelah disebut sebagai "sejak" atau "sampai"', () => {
      expect(labelRentang({ dari: '2026-08-17', sampai: null })).toBe(
        'Sejak 17 Agustus 2026',
      );
      expect(labelRentang({ dari: null, sampai: '2026-08-17' })).toBe(
        'Sampai 17 Agustus 2026',
      );
    });

    it('tanpa batas disebut apa adanya, bukan dikosongkan', () => {
      // Keterangan kosong terbaca sebagai keterangan yang lupa diisi.
      expect(labelRentang({ dari: null, sampai: null })).toBe('Seluruh periode');
    });
  });

  describe('nama berkas', () => {
    it('menyebut rentangnya, sehingga dua unduhan tidak bertimpa', () => {
      expect(
        potonganBerkas({ dari: '2026-08-17', sampai: '2026-08-23' }),
      ).toBe('2026-08-17_2026-08-23');
    });

    it('tanpa rentang memakai tahunnya, seperti sebelumnya', () => {
      expect(potonganBerkas({ dari: null, sampai: null })).toBe(
        String(new Date().getFullYear()),
      );
    });

    it('tidak memuat aksara yang terlarang pada nama berkas', () => {
      // `labelRentang` memuat spasi dan tanda pisah; memakainya sebagai nama
      // berkas menghasilkan unduhan yang gagal diam-diam di sebagian sistem.
      for (const r of [
        { dari: '2026-08-17', sampai: '2026-08-23' },
        { dari: '2026-08-17', sampai: null },
        { dari: null, sampai: '2026-08-23' },
        { dari: null, sampai: null },
      ]) {
        expect(potonganBerkas(r)).toMatch(/^[A-Za-z0-9_-]+$/);
      }
    });
  });
});
