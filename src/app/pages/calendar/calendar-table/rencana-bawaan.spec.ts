/*
 * Rencana yang belum jalan dari bulan-bulan sebelumnya ikut ke saldo rencana.
 * Saldo awal bulan hanya memuat yang SUDAH terjadi, jadi tanpa ini rencana
 * Oktober yang masih menunggu hilang dari saldo rencana November.
 */
import { of } from 'rxjs';
import { CalendarTableComponent, rentangBawaan } from './calendar-table.component';

describe('rencana bawaan kalender', () => {
  it('rentangnya 12 bulan ke belakang, berakhir sehari sebelum bulan ini', () => {
    expect(rentangBawaan('2026-11-01')).toEqual(['2025-11-01', '2026-10-31']);
    expect(rentangBawaan('2026-03-01')).toEqual(['2025-03-01', '2026-02-28']);
  });

  function kalender(): any {
    const c: any = Object.create(CalendarTableComponent.prototype);
    Object.assign(c, {
      year: 2026,
      month: 10, // November (0-based)
      bankAccounts: [{ id: 3, selected: true }, { id: 4, selected: false }],
      balance: 1000,
      data: [],
      incomeData: [],
      rencana: [],
      rencanaBawaan: [],
      muatanRencana: 0,
    });
    return c;
  }

  it('saldo rencana dikurangi bawaan; saldo aktual tidak', () => {
    const c = kalender();
    c.rencanaBawaan = [
      { planType: 'keluar', amount: 300, status: 'rencana', date: '2026-10-20' },
      { planType: 'masuk', amount: 100, status: 'rencana', date: '2026-09-02' },
    ];
    expect(c.saldoSampai(1, true)).toBe(800);
    expect(c.saldoSampai(1, false)).toBe(1000);
  });

  it('memuat bawaan dengan rekening terpilih, hanya yang masih menunggu', () => {
    const c = kalender();
    const panggilan: any[] = [];
    c.planService = {
      rentang: (...a: any[]) => {
        panggilan.push(a);
        return a[0] === '2026-11-01'
          ? of({ data: [] })
          : of({
              data: [
                { status: 'rencana', planType: 'keluar', amount: 5, date: '2026-10-01' },
                { status: 'terpakai', planType: 'keluar', amount: 9, date: '2026-10-02' },
              ],
            });
      },
    };
    c.muatRencana();
    expect(panggilan).toContain(['2026-11-01', '2026-11-30', '', [3]]);
    expect(panggilan).toContain(['2025-11-01', '2026-10-31', '', [3]]);
    expect(c.rencanaBawaan.length).toBe(1);
    expect(c.nilaiBawaan).toBe(-5);
  });

  it('yang terlewat di bulan sebelumnya ikut di spanduk', () => {
    const c = kalender();
    c.rencanaBawaan = [{ lewat: true, date: '2026-08-10' }];
    c.rencana = [{ lewat: false, date: '2026-11-10' }];
    expect(c.rencanaTerlewat.length).toBe(1);
  });
});
