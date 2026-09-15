import {
  MAKS_HARI_RENTANG,
  jumlahHari,
  tanggalLokal,
} from './unduh-kalender-dialog.component';

/**
 * Hitungan hari pada dialog unduh kalender.
 *
 * Dua hal yang dijaga, dan keduanya gagal tanpa galat:
 *
 *   * **`toISOString()` menggeser tanggal.** Ia mengubah ke UTC lebih dulu,
 *     dan `Date` dari datepicker bertengger di tengah malam waktu setempat —
 *     jadi di Jakarta (UTC+7) tanggalnya SELALU mundur satu hari, bukan
 *     kadang-kadang. Yang memilih 1 September mengunduh mulai 31 Agustus.
 *
 *     Karma berjalan di UTC, jadi uji ini TIDAK dapat menangkapnya lewat
 *     `toISOString` yang sungguhan — ia hijau di sini dan salah di layar
 *     Daniel. Yang dapat diuji: bahwa `tanggalLokal` membaca komponen tanggal
 *     setempat, bukan komponen UTC. Penjaga sebenarnya ada di
 *     `scripts/pemeriksa/aruskascek.py`, yang menolak `toISOString` pada
 *     jalur tanggal.
 *
 *   * **Hitungan hari yang meleset satu.** Rentangnya inklusif kedua
 *     ujungnya; dihitung eksklusif, pilihan terakhir yang sah di dialog
 *     ditolak server — dan yang memakainya akan mengira dialognya rusak.
 */
describe('Dialog unduh kalender', () => {
  describe('tanggalLokal', () => {
    it('membaca komponen tanggal SETEMPAT', () => {
      // 1 September 2026, pukul 00:00 waktu setempat.
      expect(tanggalLokal(new Date(2026, 8, 1))).toBe('2026-09-01');
      expect(tanggalLokal(new Date(2026, 11, 31))).toBe('2026-12-31');
    });

    it('melapisi nol pada bulan dan hari satu angka', () => {
      expect(tanggalLokal(new Date(2026, 0, 5))).toBe('2026-01-05');
    });

    it('tengah malam setempat TIDAK mundur sehari', () => {
      /*
       * Inti persoalannya. `new Date(2026, 8, 1).toISOString()` di zona
       * UTC+7 menghasilkan `2026-08-31T17:00:00Z` — dan potongan sepuluh
       * aksara pertamanya `2026-08-31`.
       */
      const d = new Date(2026, 8, 1, 0, 0, 0);
      expect(tanggalLokal(d)).toBe('2026-09-01');
      expect(tanggalLokal(d).slice(8, 10)).toBe('01');
    });
  });

  describe('jumlahHari', () => {
    it('inklusif kedua ujungnya', () => {
      expect(jumlahHari(new Date(2026, 8, 1), new Date(2026, 8, 1))).toBe(1);
      expect(jumlahHari(new Date(2026, 8, 1), new Date(2026, 8, 2))).toBe(2);
    });

    it('sebulan penuh September adalah 30 hari', () => {
      expect(jumlahHari(new Date(2026, 8, 1), new Date(2026, 8, 30))).toBe(30);
    });

    it('melintasi bulan dan tahun', () => {
      expect(jumlahHari(new Date(2026, 11, 20), new Date(2027, 0, 10))).toBe(22);
    });

    it('Februari kabisat terhitung 29 hari', () => {
      expect(jumlahHari(new Date(2028, 1, 1), new Date(2028, 1, 29))).toBe(29);
    });

    it('akhir yang mendahului mulai menghasilkan angka < 1', () => {
      // Dipakai dialognya untuk membedakan "terbalik" dari "kepanjangan".
      expect(jumlahHari(new Date(2026, 8, 10), new Date(2026, 8, 1))).toBeLessThan(1);
    });

    it('batasnya tepat sama dengan yang ditegakkan server', () => {
      /*
       * Kalau keduanya berbeda satu hari, pilihan terakhir yang sah di
       * dialog ditolak server — dan yang memakainya akan mengira dialognya
       * yang rusak, bukan batasnya yang tidak sepakat.
       */
      const mulai = new Date(2026, 0, 1);
      const akhir = new Date(2026, 0, 1);
      akhir.setDate(akhir.getDate() + MAKS_HARI_RENTANG - 1);
      expect(jumlahHari(mulai, akhir)).toBe(MAKS_HARI_RENTANG);
    });

    it('mengabaikan jam — dua `Date` di hari yang sama tetap satu hari', () => {
      // Datepicker Material kadang menyertakan jam dari tanggal sebelumnya.
      expect(
        jumlahHari(new Date(2026, 8, 1, 23, 30), new Date(2026, 8, 1, 0, 1)),
      ).toBe(1);
    });
  });
});
