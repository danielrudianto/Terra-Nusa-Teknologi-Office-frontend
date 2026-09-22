import { registerLocaleData } from '@angular/common';
import localeId from '@angular/common/locales/id';
import { waktuRelatif } from './waktu-relatif.pipe';

registerLocaleData(localeId);

describe('waktuRelatif', () => {
  const kini = new Date(2026, 8, 22, 12, 0, 0).getTime();
  const m = 60_000;

  it('baru saja, menit, jam, hari', () => {
    expect(waktuRelatif(kini - 10_000, kini, 'id')).toBe('sekarang');
    expect(waktuRelatif(kini - 5 * m, kini, 'id')).toBe('5 menit yang lalu');
    expect(waktuRelatif(kini - 3 * 60 * m, kini, 'id')).toBe('3 jam yang lalu');
    expect(waktuRelatif(kini - 24 * 60 * m, kini, 'id')).toBe('kemarin');
  });

  it('lebih dari seminggu: tanggal biasa', () => {
    expect(waktuRelatif(new Date(2026, 7, 1, 9, 30).getTime(), kini, 'id')).toBe('01 Agu 2026 09:30');
  });

  it('bahasa Inggris', () => {
    expect(waktuRelatif(kini - 5 * m, kini, 'en')).toBe('5 minutes ago');
  });
});
