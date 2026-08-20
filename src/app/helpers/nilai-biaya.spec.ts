import {
  biayaDraft,
  biayaPembelian,
  biayaReimbursement,
  nilaiTagihan,
  nilaiTagihanKotor,
} from './nilai-biaya.helper';

/**
 * Angka-angka di bawah bukan karangan: keduanya diambil dari R35CH, proyek
 * yang membuat selisihnya ketahuan. Daftar margin menunjukkan 55.308.999,
 * laporan proyek menunjukkan 4.936.467, dan yang membedakan persis
 * PPN + PBBKB + nilai lain sebesar 158.247.531,71 pada sisi biaya.
 */
describe('nilai biaya proyek', () => {
  it('PPN masukan tidak dihitung sebagai biaya', () => {
    expect(biayaPembelian({ dpp: 1_000_000, ppn: 11 } as any)).toBe(1_000_000);
  });

  it('PBBKB dan nilai lain tidak ditambahkan lagi', () => {
    expect(
      biayaPembelian({
        dpp: 1_000_000,
        ppn: 11,
        pbbkb: 75_000,
        otherValue: 40_000,
      } as any),
    ).toBe(1_000_000);
  });

  it('draft memakai dasar yang sama dengan pembelian', () => {
    const d = { dpp: 250_000, ppn: 11, pbbkb: 9_000 } as any;
    expect(biayaDraft(d)).toBe(biayaPembelian(d));
  });

  it('reimbursement memakai nominal barisnya, bukan DPP', () => {
    expect(biayaReimbursement({ amount: 812_500 })).toBe(812_500);
    expect(biayaReimbursement({} as any)).toBe(0);
  });

  it('tagihan yang dibandingkan dengan biaya adalah DPP-nya', () => {
    expect(nilaiTagihan({ dpp: 2_000_000, ppn: 11 } as any)).toBe(2_000_000);
  });

  it('nilai kotor tetap tersedia untuk ditampilkan, berikut PPN-nya', () => {
    expect(nilaiTagihanKotor({ dpp: 2_000_000, ppn: 11 })).toBe(2_220_000);
  });

  it('nilai yang hilang atau bukan angka terbaca nol, bukan NaN', () => {
    expect(biayaPembelian({} as any)).toBe(0);
    expect(biayaPembelian({ dpp: 'entah' } as any)).toBe(0);
    expect(nilaiTagihanKotor({ dpp: null, ppn: undefined })).toBe(0);
  });

  it('margin R35CH: kedua layar menghasilkan angka yang sama', () => {
    // Biaya sekelompok dokumen, sebagian ber-PPN sebagian tidak.
    const pembelian = [
      { dpp: 100_000_000, ppn: 11, pbbkb: 500_000, otherValue: 250_000 },
      { dpp: 50_000_000, ppn: 0 },
    ];
    const draft = [{ dpp: 20_000_000, ppn: 11, pbbkb: 100_000 }];
    const reimburse = [{ amount: 5_000_000 }];

    const biaya =
      pembelian.reduce((a, p) => a + biayaPembelian(p as any), 0) +
      draft.reduce((a, p) => a + biayaDraft(p as any), 0) +
      reimburse.reduce((a, r) => a + biayaReimbursement(r), 0);

    // Persis yang dijumlahkan `margin_summary` di server: SUM(dpp) + amount.
    const sepertiServer =
      100_000_000 + 50_000_000 + 20_000_000 + 5_000_000;

    expect(biaya).toBe(sepertiServer);
  });
});
