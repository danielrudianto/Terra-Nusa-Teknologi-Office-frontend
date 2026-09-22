import { susunJudul, JUDUL_DASAR } from './judul-tab.strategy';

describe('susunJudul', () => {
  it('nama halaman + merek', () => {
    expect(susunJudul('Master Data', 0)).toBe('Master Data · TerraBot');
  });
  it('yang menunggu disebut di depan', () => {
    expect(susunJudul('Purchase Order', 3)).toBe('(3) Purchase Order · TerraBot');
  });
  it('tanpa nama halaman: judul dasar', () => {
    expect(susunJudul('', 0)).toBe(JUDUL_DASAR);
  });
});
