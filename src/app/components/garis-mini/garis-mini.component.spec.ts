import { susunTitik, GarisMiniComponent } from './garis-mini.component';

describe('GarisMini', () => {
  it('titik mengisi lebar; nilai tertinggi di atas', () => {
    const t = susunTitik([0, 10], 100, 40);
    expect(t[0][0]).toBe(0);
    expect(t[1][0]).toBe(100);
    expect(t[1][1]).toBeLessThan(t[0][1]);
  });

  it('null dilewati, bukan dianggap nol', () => {
    const t = susunTitik([5, null, 5], 100, 40);
    expect(t.length).toBe(2);
    expect(t[1][0]).toBe(100);
  });

  it('arah naik / turun / datar', () => {
    const g = new GarisMiniComponent();
    g.nilai = [1, 3];
    expect(g.arah).toBe('naik');
    g.nilai = [3, 1];
    expect(g.arah).toBe('turun');
    g.nilai = [2, 2];
    expect(g.arah).toBe('datar');
  });

  it('kurang dari dua titik: tidak digambar', () => {
    const g = new GarisMiniComponent();
    g.nilai = [7];
    expect(g.jalur).toBe('');
  });
});
