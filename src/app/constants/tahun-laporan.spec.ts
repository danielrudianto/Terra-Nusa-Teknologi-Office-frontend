/**
 * Saringan tahun pada laporan proyek.
 *
 * Yang diuji di sini gagal TANPA SUARA. Tahun yang meleset sehari di
 * pergantian tahun, dan tahun kosong yang bisa terpilih, keduanya
 * menghasilkan laporan yang terbit dengan wajar — isinya saja yang bukan
 * isi yang diminta.
 */

import {
  SELURUH,
  daftarTahun,
  dalamTahun,
  labelTahun,
  sebelumTahun,
  tahunDokumen,
} from './tahun-laporan';

describe('tahun laporan proyek', () => {
  describe('membaca tahun sebuah tanggal dokumen', () => {
    it('membaca tahun dari teks tanggalnya', () => {
      expect(tahunDokumen('2026-08-19')).toBe(2026);
    });

    it('1 Januari TIDAK jatuh ke tahun sebelumnya', () => {
      /*
       * Penjaga utama berkas ini.
       *
       * `new Date('2026-01-01')` diurai sebagai tengah malam UTC menurut
       * spesifikasi JavaScript. Di setiap zona yang di belakang UTC,
       * `.getFullYear()`-nya menghasilkan 2025 — dan seluruh dokumen awal
       * Januari pindah ke tahun sebelumnya tanpa satu pun galat.
       */
      expect(tahunDokumen('2026-01-01')).toBe(2026);
    });

    it('31 Desember TIDAK naik ke tahun berikutnya', () => {
      expect(tahunDokumen('2025-12-31')).toBe(2025);
    });

    it('tanggal berjam tetap terbaca dari tanggalnya', () => {
      expect(tahunDokumen('2026-01-01T00:00:00')).toBe(2026);
    });

    it('kosong dan ngawur menghasilkan null, bukan tahun ini', () => {
      // Tahun ini sebagai cadangan membuat dokumen tak bertanggal
      // menyelinap ke tahun berjalan dan menambah biayanya.
      expect(tahunDokumen(null)).toBeNull();
      expect(tahunDokumen(undefined)).toBeNull();
      expect(tahunDokumen('')).toBeNull();
      expect(tahunDokumen('bukan tanggal')).toBeNull();
    });
  });

  describe('daftar tahun yang ditawarkan', () => {
    it('hanya tahun yang benar-benar punya catatan', () => {
      expect(
        daftarTahun(['2026-08-19', '2024-02-01', '2026-01-05']),
      ).toEqual([2026, 2024]);
    });

    it('terbaru lebih dulu', () => {
      expect(daftarTahun(['2024-01-01', '2026-01-01', '2025-01-01'])).toEqual([
        2026, 2025, 2024,
      ]);
    });

    it('tanggal yang tidak terbaca tidak menjadi tahun', () => {
      expect(daftarTahun([null, '', 'entah', '2026-03-03'])).toEqual([2026]);
    });

    it('tanpa catatan sama sekali menghasilkan daftar kosong', () => {
      // Daftar kosong yang berarti pemilihnya tidak ditampilkan sama sekali;
      // pemilih berisi satu tombol "Semua" hanya membingungkan.
      expect(daftarTahun([])).toEqual([]);
    });
  });

  describe('menyaring', () => {
    it('"Semua" menerima segalanya, termasuk yang tak bertanggal', () => {
      expect(dalamTahun('2024-01-01', SELURUH)).toBeTrue();
      expect(dalamTahun(null, SELURUH)).toBeTrue();
    });

    it('tahun tertentu hanya menerima tahun itu', () => {
      expect(dalamTahun('2026-12-31', 2026)).toBeTrue();
      expect(dalamTahun('2025-12-31', 2026)).toBeFalse();
      expect(dalamTahun('2027-01-01', 2026)).toBeFalse();
    });

    it('dokumen tak bertanggal TIDAK masuk tahun mana pun', () => {
      // Masuk diam-diam, ia menambah biaya tahun yang sedang dibaca tanpa
      // pernah muncul di tahun lain — dan jumlah seluruh tahun tidak lagi
      // sama dengan biaya seumur proyek.
      expect(dalamTahun(null, 2026)).toBeFalse();
    });
  });

  describe('biaya yang dibawa dari tahun sebelumnya', () => {
    it('tahun yang lebih awal terhitung dibawa', () => {
      expect(sebelumTahun('2025-12-31', 2026)).toBeTrue();
      expect(sebelumTahun('2024-06-01', 2026)).toBeTrue();
    });

    it('tahun yang sama dan sesudahnya TIDAK dibawa', () => {
      // Kalau tahun berjalan ikut terbawa, biayanya terhitung dua kali:
      // sekali sebagai bawaan, sekali sebagai batang mingguannya.
      expect(sebelumTahun('2026-01-01', 2026)).toBeFalse();
      expect(sebelumTahun('2027-01-01', 2026)).toBeFalse();
    });

    it('pada "Semua" tidak ada yang dibawa', () => {
      // "Semua" sudah memuat segalanya; bawaan di atasnya menghitung ganda.
      expect(sebelumTahun('2020-01-01', SELURUH)).toBeFalse();
    });

    it('tak bertanggal tidak dibawa', () => {
      expect(sebelumTahun(null, 2026)).toBeFalse();
    });
  });

  describe('sebutan periode', () => {
    it('disebut apa adanya, tidak dikosongkan', () => {
      // Keterangan kosong pada berkas unduhan terbaca sebagai keterangan
      // yang lupa diisi.
      expect(labelTahun(SELURUH)).toBe('Seluruh periode');
      expect(labelTahun(2026)).toBe('2026');
    });
  });
});
