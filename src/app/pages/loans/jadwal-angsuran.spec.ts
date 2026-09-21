/*
 * Muatan jadwal angsuran pinjaman.
 *
 * Tenornya menentukan apakah pinjaman masuk kewajiban lancar di Status
 * Keuangan. Yang dijaga: mengosongkan tenor MENGHAPUS jadwalnya (dikirim
 * `null`, bukan dihilangkan), dan tanggal tidak bergeser sehari.
 */

import { jadwalAngsuran } from './jadwal-angsuran';

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
