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
      interpayments: [],
      rencana: [],
      rencanaBawaan: [],
      pembayaranBawaan: { keluar: 0, masuk: 0, jumlah: 0 },
      muatanRencana: 0,
      apiService: { get: () => of({ bawaanKeluar: 0, bawaanMasuk: 0, bawaanJumlah: 0 }) },
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

  /*
   * Contoh nyata 22 Sep 2026: pembayaran 24–30 September yang belum
   * disetujui (535,06 jt) tidak ada di saldo awal Oktober, karena saldo
   * awal hanya memuat yang sudah disetujui. Saldo rencana Oktober jadi
   * lebih tinggi persis sebesar itu.
   */
  it('pembayaran belum disetujui dari bulan sebelumnya ikut di saldo rencana', () => {
    const c = kalender();
    const diminta: any[] = [];
    c.apiService = {
      get: (url: string, q: any) => {
        diminta.push([url, q]);
        return of({ bawaanKeluar: 400, bawaanMasuk: 50, bawaanJumlah: 3 });
      },
    };
    c.planService = { rentang: () => of({ data: [] }) };
    c.muatRencana();
    expect(diminta).toContain(['calendar/terjadwal', { mulai: '2026-11-01', bankAccounts: [3] }]);
    expect(c.pembayaranBawaan.jumlah).toBe(3);
    expect(c.saldoSampai(1, true)).toBe(650);
    expect(c.saldoSampai(1, false)).toBe(1000);
  });

  it('jawaban bulan lama yang telat dibuang', () => {
    const c = kalender();
    c.muatanRencana = 5;
    c.apiService = { get: () => of({ bawaanKeluar: 999, bawaanMasuk: 0, bawaanJumlah: 1 }) };
    c.muatPembayaranBawaan('2026-11-01', [3], 4);
    expect(c.pembayaranBawaan.jumlah).toBe(0);
  });

  /*
   * Kasus 21 Sep 2026: kisi 8 jt lebih tinggi dari Excel dan dari "kas
   * hari ini" — transfer ke rekening yang dikecualikan tidak dikurangi.
   */
  it('transfer ke/dari rekening di luar saringan ikut; yang di dalam saling meniadakan', () => {
    const c = kalender();
    c.bankAccounts = [
      { id: 3, selected: true },
      { id: 5, selected: true },
      { id: 4, selected: false },
    ];
    c.interpayments = [
      { date: '2026-11-02', amount: 8, bankAccountIDOrigin: 3, bankAccountIDDestination: 4 },
      { date: '2026-11-02', amount: 50, bankAccountIDOrigin: 3, bankAccountIDDestination: 5 },
      { date: '2026-11-03', amount: 2, bankAccountIDOrigin: 4, bankAccountIDDestination: 5 },
      { date: '2026-11-04', amount: 99, bankAccountIDOrigin: 3, bankAccountIDDestination: 4, isDelete: 1 },
    ];
    expect(c.saldoSampai(1, false)).toBe(1000);
    expect(c.saldoSampai(2, false)).toBe(992);
    expect(c.saldoSampai(3, true)).toBe(994);
    expect(c.saldoSampai(4, false)).toBe(994);
  });
});
