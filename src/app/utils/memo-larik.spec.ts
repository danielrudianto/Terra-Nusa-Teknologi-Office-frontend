import { memoLarik, memoPerBaris } from './memo-larik';

describe('memoLarik', () => {
  it('mengembalikan larik yang SAMA selama kuncinya tidak berubah', () => {
    let sumber = [1, 2, 3];
    let hitung = 0;
    const ambil = memoLarik(
      () => {
        hitung++;
        return sumber.map((x) => x * 2);
      },
      () => [sumber],
    );
    const a = ambil();
    const b = ambil();
    expect(a).toBe(b);
    expect(hitung).toBe(1);
  });

  it('menghitung ulang saat kuncinya berganti', () => {
    let sumber = [1];
    const ambil = memoLarik(
      () => sumber.slice(),
      () => [sumber],
    );
    const a = ambil();
    sumber = [1, 2];
    const b = ambil();
    expect(b).not.toBe(a);
    expect(b).toEqual([1, 2]);
  });

  it('kunci banyak unsur: satu berubah sudah cukup', () => {
    let arah = 'masuk';
    const data = [1];
    let hitung = 0;
    const ambil = memoLarik(
      () => {
        hitung++;
        return [arah];
      },
      () => [data, arah],
    );
    ambil();
    ambil();
    expect(hitung).toBe(1);
    arah = 'keluar';
    expect(ambil()).toEqual(['keluar']);
    expect(hitung).toBe(2);
  });
});

describe('memoPerBaris', () => {
  it('satu hasil per objek baris', () => {
    let hitung = 0;
    const chip = memoPerBaris((b: { v: string }) => {
      hitung++;
      return b.v.split(',');
    });
    const baris = { v: 'a,b' };
    expect(chip(baris)).toBe(chip(baris));
    expect(hitung).toBe(1);
    expect(chip({ v: 'c' })).toEqual(['c']);
  });

  it('null tidak dijadikan kunci', () => {
    const chip = memoPerBaris((b: any) => (b ? [b.v] : []));
    expect(chip(null)).toEqual([]);
    expect(chip(undefined)).toEqual([]);
  });
});
