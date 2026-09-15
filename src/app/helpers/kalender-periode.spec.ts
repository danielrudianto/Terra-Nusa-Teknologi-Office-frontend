import {
  blokBulan,
  daftarTanggal,
  hariDalamBulan,
  kolomHariPertama,
  labelBerkas,
  labelPeriode,
  uraiTanggal,
} from './kalender-periode';

/**
 * Cakupan unduhan kalender.
 *
 * Yang dijaga di sini bentuk cakupannya, bukan isinya. Empat hal yang paling
 * mudah salah, dan tidak satu pun menghasilkan galat:
 *
 *   * tanggal HILANG di ujung rentang — berkasnya tetap terbuka, tetap rapi,
 *     dan kekurangan satu hari di tempat yang paling jarang diperiksa;
 *   * bulan yang tersentuh terlewat — kisi lampirannya hilang seluruhnya
 *     untuk bulan itu, sementara Ringkasan Harian tetap memuat tanggalnya,
 *     sehingga dua lembar dalam satu berkas tidak lagi sepakat;
 *   * kolom hari pertama meleset — seluruh tanggal dalam kisinya bergeser,
 *     dan yang membacanya salah membaca hari, bukan salah membaca angka;
 *   * label periodenya menyebut satu bulan untuk berkas dua bulan.
 */
describe('Cakupan unduhan kalender', () => {
  describe('daftarTanggal', () => {
    it('memuat KEDUA ujungnya', () => {
      const t = daftarTanggal('2026-09-14', '2026-09-16');
      expect(t).toEqual(['2026-09-14', '2026-09-15', '2026-09-16']);
    });

    it('satu hari tetap satu tanggal, bukan kosong', () => {
      expect(daftarTanggal('2026-09-15', '2026-09-15')).toEqual(['2026-09-15']);
    });

    it('melintasi pergantian bulan tanpa melompat', () => {
      const t = daftarTanggal('2026-09-29', '2026-10-02');
      expect(t).toEqual(['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02']);
    });

    it('melintasi pergantian tahun', () => {
      const t = daftarTanggal('2026-12-30', '2027-01-02');
      expect(t).toEqual(['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02']);
    });

    it('Februari kabisat punya tanggal 29', () => {
      const t = daftarTanggal('2028-02-27', '2028-03-01');
      expect(t).toEqual(['2028-02-27', '2028-02-28', '2028-02-29', '2028-03-01']);
    });

    it('akhir yang mendahului mulai menghasilkan kosong, bukan perulangan tak henti', () => {
      expect(daftarTanggal('2026-09-20', '2026-09-01')).toEqual([]);
    });

    it('tanggal yang tidak terbaca menghasilkan kosong', () => {
      expect(daftarTanggal('bukan tanggal', '2026-09-01')).toEqual([]);
      expect(daftarTanggal('', '')).toEqual([]);
    });
  });

  describe('blokBulan', () => {
    it('satu bulan penuh menghasilkan satu blok utuh', () => {
      const b = blokBulan('2026-09-01', '2026-09-30');
      expect(b.length).toBe(1);
      expect(b[0].label).toBe('September 2026');
      expect(b[0].totalHari).toBe(30);
      expect(b[0].dariHari).toBe(1);
      expect(b[0].sampaiHari).toBe(30);
    });

    it('rentang lintas bulan menghasilkan satu blok per bulan', () => {
      const b = blokBulan('2026-09-15', '2026-10-20');
      expect(b.map((x) => x.label)).toEqual(['September 2026', 'Oktober 2026']);
    });

    it('kisinya tetap SEBULAN PENUH meski rentangnya memotong', () => {
      /*
       * Dipotong, kolom hari-nya tidak lagi sejajar dengan tanggalnya, dan
       * yang membacanya salah membaca hari — kesalahan yang tidak terlihat
       * sebagai kesalahan.
       */
      const b = blokBulan('2026-09-15', '2026-10-20');
      expect(b[0].totalHari).toBe(30);
      expect(b[1].totalHari).toBe(31);
      // Yang menyempit hanya bagian yang DIISI.
      expect(b[0].dariHari).toBe(15);
      expect(b[0].sampaiHari).toBe(30);
      expect(b[1].dariHari).toBe(1);
      expect(b[1].sampaiHari).toBe(20);
    });

    it('melintasi tahun', () => {
      const b = blokBulan('2026-12-20', '2027-01-10');
      expect(b.map((x) => x.label)).toEqual(['Desember 2026', 'Januari 2027']);
      expect(b[1].tahun).toBe(2027);
      expect(b[1].bulan).toBe(1);
    });

    it('bulan di TENGAH rentang terisi penuh', () => {
      const b = blokBulan('2026-08-20', '2026-10-05');
      expect(b.length).toBe(3);
      expect(b[1].label).toBe('September 2026');
      expect(b[1].dariHari).toBe(1);
      expect(b[1].sampaiHari).toBe(30);
    });

    it('akhir yang mendahului mulai menghasilkan kosong', () => {
      expect(blokBulan('2026-10-01', '2026-09-01')).toEqual([]);
    });

    it('setiap tanggal dalam rentang jatuh di dalam satu blok', () => {
      /*
       * Penjaga yang sebenarnya. Kalau satu bulan terlewat, kisi lampirannya
       * hilang untuk bulan itu sementara Ringkasan Harian tetap memuat
       * tanggalnya — dan dua lembar dalam satu berkas berhenti sepakat.
       */
      const mulai = '2026-08-20';
      const akhir = '2026-11-03';
      const blok = blokBulan(mulai, akhir);

      for (const tgl of daftarTanggal(mulai, akhir)) {
        const [y, b, h] = uraiTanggal(tgl)!;
        const punya = blok.find((x) => x.tahun === y && x.bulan === b);
        expect(punya)
          .withContext(`tanggal ${tgl} tidak punya blok bulan`)
          .toBeTruthy();
        expect(h).toBeGreaterThanOrEqual(punya!.dariHari);
        expect(h).toBeLessThanOrEqual(punya!.sampaiHari);
      }
    });
  });

  describe('kolomHariPertama', () => {
    it('0 berarti Senin', () => {
      // 1 Juni 2026 adalah Senin.
      expect(kolomHariPertama(2026, 6)).toBe(0);
    });

    it('Minggu adalah kolom terakhir, bukan kolom pertama', () => {
      /*
       * `Date.getDay()` menomori Minggu sebagai 0. Dipakai apa adanya, kisi
       * yang kolom pertamanya Senin menggeser seluruh bulan satu kolom ke
       * kanan — dan hanya pada bulan yang kebetulan dimulai Minggu.
       */
      // 1 November 2026 adalah Minggu.
      expect(kolomHariPertama(2026, 11)).toBe(6);
    });

    it('1 September 2026 adalah Selasa', () => {
      expect(kolomHariPertama(2026, 9)).toBe(1);
    });
  });

  describe('hariDalamBulan', () => {
    it('menghitung bulan pendek dan kabisat', () => {
      expect(hariDalamBulan(2026, 2)).toBe(28);
      expect(hariDalamBulan(2028, 2)).toBe(29);
      expect(hariDalamBulan(2026, 4)).toBe(30);
      expect(hariDalamBulan(2026, 12)).toBe(31);
    });
  });

  describe('labelPeriode', () => {
    it('sebulan penuh disebut sebagai bulannya', () => {
      expect(labelPeriode('2026-09-01', '2026-09-30')).toBe('September 2026');
    });

    it('bulan yang terpotong TIDAK disebut sebagai bulan itu', () => {
      /*
       * Kalau ia tetap menyebut "September 2026", ada berkas bernama
       * September yang isinya separuh Oktober — dan nama itu yang dipakai
       * orang mencarinya kembali di folder.
       */
      expect(labelPeriode('2026-09-15', '2026-09-30')).not.toBe('September 2026');
      expect(labelPeriode('2026-09-15', '2026-09-30')).toBe('15 Sep – 30 Sep 2026');
    });

    it('rentang lintas tahun menyebut kedua tahunnya', () => {
      expect(labelPeriode('2026-12-20', '2027-01-10')).toBe(
        '20 Des 2026 – 10 Jan 2027',
      );
    });
  });

  describe('labelBerkas', () => {
    it('tidak memuat aksara yang ditolak nama berkas', () => {
      const n = labelBerkas('2026-09-15', '2026-10-20');
      expect(n).not.toContain(' ');
      expect(n).not.toContain('–');
      expect(/[\\/:*?"<>|]/.test(n)).toBeFalse();
    });

    it('dua cakupan berbeda tidak menghasilkan nama yang sama', () => {
      expect(labelBerkas('2026-09-01', '2026-09-30')).not.toBe(
        labelBerkas('2026-09-15', '2026-10-20'),
      );
    });
  });
});
