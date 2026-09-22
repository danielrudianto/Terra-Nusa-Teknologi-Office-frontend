/*
 * Kalender TIDAK memuat sebelum daftar rekening datang dari pemilihnya.
 * Daftar kosong dibaca server sebagai seluruh rekening — satu putaran
 * permintaan yang hasilnya pasti dibuang.
 */
import { of } from 'rxjs';
import { CalendarTableComponent } from './calendar-table.component';

describe('kalender menunggu rekening', () => {
  function kalender(siap: boolean): any {
    const c: any = Object.create(CalendarTableComponent.prototype);
    const diminta: string[] = [];
    Object.assign(c, {
      year: 2026,
      month: 8,
      bankAccounts: [],
      rekeningSiap: siap,
      muatanRencana: 0,
      apiService: {
        get: (url: string) => {
          diminta.push(url);
          return of({ payments: [], incomes: [], interpayments: [], balances: 0 });
        },
      },
      planService: {
        rentang: () => of({ data: [] }),
        ringkasan: () => of({}),
      },
      muatTertunda: () => {},
      muatRingkasan: () => {},
    });
    c.diminta = diminta;
    return c;
  }

  it('belum siap: kisi tetap digambar, tidak ada permintaan', () => {
    const c = kalender(false);
    c.generateCalendar();
    expect(c.weeks.length).toBeGreaterThan(3);
    expect(c.diminta).toEqual([]);
    expect(c.memuat).toBeTrue();
  });

  it('sudah siap: memuat seperti biasa', () => {
    const c = kalender(true);
    c.generateCalendar();
    expect(c.diminta).toContain('calendar');
  });
});
