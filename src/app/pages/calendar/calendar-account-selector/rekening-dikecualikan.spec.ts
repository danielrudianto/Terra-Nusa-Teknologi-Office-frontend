import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { CalendarAccountSelectorComponent } from './calendar-account-selector.component';
import { ApiService } from 'src/app/services/api.service';

/**
 * Rekening yang dikecualikan tidak ikut terpilih di awal.
 *
 * Deposito dan sejenisnya uangnya ada tetapi bukan kas yang dapat
 * dibelanjakan; ikut dalam saldo gabungan membuat perencanaan kas terbaca
 * lebih longgar daripada keadaan sebenarnya.
 */
describe('CalendarAccountSelector — rekening yang dikecualikan', () => {
  const rekening = [
    { id: 1, bankAccountName: 'Operasional', bankAccountNumber: '111' },
    { id: 2, bankAccountName: 'Deposito', bankAccountNumber: '222', excludeFromCalendar: true },
    { id: 3, bankAccountName: 'Proyek', bankAccountNumber: '333', excludeFromCalendar: false },
  ];

  function buat(data: any[]) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [CalendarAccountSelectorComponent, TranslateModule.forRoot()],
      providers: [
        { provide: ApiService, useValue: { get: () => of(data) } },
        { provide: MatSnackBar, useValue: { open: () => {} } },
        { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => of(null) }) } },
      ],
    });
    const f = TestBed.createComponent(CalendarAccountSelectorComponent);
    f.detectChanges();
    return f;
  }

  it('yang dikecualikan tidak tercentang, yang lain tercentang', fakeAsync(() => {
    const f = buat(rekening);
    tick();
    const akun = f.componentInstance.bankAccounts;
    expect(akun.find((x: any) => x.id === 1).selected).toBeTrue();
    expect(akun.find((x: any) => x.id === 2).selected).toBeFalse();
    expect(akun.find((x: any) => x.id === 3).selected).toBeTrue();
    expect(f.componentInstance.selectedBankAccounts).toBe(2);
  }));

  it('pilihan awal dipancarkan tanpa membuka dialog', fakeAsync(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [CalendarAccountSelectorComponent, TranslateModule.forRoot()],
      providers: [
        { provide: ApiService, useValue: { get: () => of(rekening) } },
        { provide: MatSnackBar, useValue: { open: () => {} } },
        { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => of(null) }) } },
      ],
    });
    const f = TestBed.createComponent(CalendarAccountSelectorComponent);
    let dipancarkan: any[] | null = null;
    f.componentInstance.bankAccountChanges.subscribe((v: any[]) => (dipancarkan = v));
    f.detectChanges();
    tick();
    // Tanpa ini kalender memulai dengan daftar kosong, dan server
    // memperlakukannya sebagai "seluruh rekening" — termasuk yang
    // dikecualikan.
    expect(dipancarkan).not.toBeNull();
    expect(dipancarkan!.filter((x) => x.selected).map((x) => x.id)).toEqual([1, 3]);
  }));

  it('rekening tanpa kolomnya tetap ikut — baris lama tidak berubah arti', fakeAsync(() => {
    const f = buat([{ id: 9, bankAccountName: 'Lama', bankAccountNumber: '999' }]);
    tick();
    expect(f.componentInstance.bankAccounts[0].selected).toBeTrue();
  }));
});
