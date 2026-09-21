/*
 * Muatan jadwal angsuran pinjaman.
 *
 * Tenornya menentukan apakah pinjaman masuk kewajiban lancar di Status
 * Keuangan. Yang dijaga: mengosongkan tenor MENGHAPUS jadwalnya (dikirim
 * `null`, bukan dihilangkan), dan tanggal tidak bergeser sehari.
 */

import { jadwalAngsuran, ringkasJadwal } from './jadwal-angsuran';

describe('jadwalAngsuran', () => {
  it('tenor dan tanggal dikirim apa adanya', () => {
    expect(jadwalAngsuran(36, new Date(2026, 1, 1))).toEqual({
      tenorMonths: 36,
      firstInstallmentDate: '2026-02-01',
    });
  });

  it('tenor kosong MENGHAPUS jadwal — dikirim null, bukan dihilangkan', () => {
    const r = jadwalAngsuran(null, new Date(2026, 1, 1));
    expect('tenorMonths' in r).toBeTrue();
    expect(r).toEqual({ tenorMonths: null, firstInstallmentDate: null });
  });

  it('tenor nol atau negatif dianggap tanpa jadwal', () => {
    expect(jadwalAngsuran(0, null).tenorMonths).toBeNull();
    expect(jadwalAngsuran(-3, null).tenorMonths).toBeNull();
  });

  it('tenor pecahan dibulatkan ke bawah', () => {
    expect(jadwalAngsuran('24.7', null).tenorMonths).toBe(24);
  });

  it('tanggal pertama boleh kosong walau tenornya ada', () => {
    // Server menganggapnya sebulan sesudah tanggal pinjaman.
    expect(jadwalAngsuran(12, null)).toEqual({
      tenorMonths: 12,
      firstInstallmentDate: null,
    });
  });

  it('tanggal lokal tengah malam tidak bergeser sehari', () => {
    expect(jadwalAngsuran(12, new Date(2026, 0, 1, 0, 0, 0)).firstInstallmentDate).toBe(
      '2026-01-01',
    );
  });
});

describe('ringkasJadwal — angka sama dengan server (porsi_lancar)', () => {
  const kini = new Date(2026, 8, 21); // 21 Sep 2026
  const orix = { debt: 36e6, tenorMonths: 36, firstInstallmentDate: '2026-02-01', date: '2026-01-05' };

  it('tanpa tenor: null (pinjaman pribadi)', () => {
    expect(ringkasJadwal({ debt: 1e7, tenorMonths: null }, 0, kini)).toBeNull();
  });

  it('8 jadwal sudah jatuh tempo, berikutnya 1 Okt, terakhir Jan 2029', () => {
    const r = ringkasJadwal(orix, 8e6, kini)!;
    expect(r.angsuran).toBe(1e6);
    expect(r.jatuhTempo).toBe(8);
    expect(r.berikutnya).toBe('2026-10-01');
    expect(r.terakhir).toBe('2029-01-01');
    expect(r.tunggakan).toBe(0);
  });

  it('baru bayar 5 jt: tertunggak 3 jt', () => {
    expect(ringkasJadwal(orix, 5e6, kini)!.tunggakan).toBe(3e6);
  });

  it('tanpa tanggal angsuran pertama: sebulan setelah tanggal pinjaman', () => {
    const r = ringkasJadwal({ ...orix, firstInstallmentDate: null }, 0, kini)!;
    expect(r.pertama).toBe('2026-02-05');
  });

  it('jadwal habis: berikutnya null', () => {
    const r = ringkasJadwal({ debt: 12e6, tenorMonths: 12, firstInstallmentDate: '2024-01-01' }, 12e6, kini)!;
    expect(r.berikutnya).toBeNull();
    expect(r.jatuhTempo).toBe(12);
  });
});
