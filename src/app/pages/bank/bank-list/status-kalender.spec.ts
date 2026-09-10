import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { ApiService } from 'src/app/services/api.service';
import { BankListComponent } from './bank-list.component';

/**
 * Daftar rekening menunjukkan mana yang ikut kalender kas dan mana yang tidak.
 *
 * Tanpa penanda ini, satu-satunya cara mengetahuinya adalah membuka dialog
 * penyuntingan rekening satu per satu — padahal justru rekening yang
 * DIKECUALIKAN yang perlu terlihat sekilas, karena itulah yang membuat saldo
 * gabungan berbeda dari jumlah seluruh rekening.
 */
describe('BankList — status kalender kas', () => {
  const rekening = [
    { id: 1, bankName: 'BCA', bankAccountName: 'Operasional', bankAccountNumber: '111' },
    {
      id: 2,
      bankName: 'BRI',
      bankAccountName: 'Deposit',
      bankAccountNumber: '222',
      excludeFromCalendar: true,
    },
    {
      id: 3,
      bankName: 'Mandiri',
      bankAccountName: 'Proyek',
      bankAccountNumber: '333',
      excludeFromCalendar: false,
    },
  ];

  function buat(data: any[]) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [BankListComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: ApiService,
          useValue: {
            get: () => of({ data, count: data.length, balances: [] }),
            delete: () => of({}),
          },
        },
        { provide: MatSnackBar, useValue: { open: () => {} } },
        {
          provide: MatDialog,
          useValue: { open: () => ({ afterClosed: () => of(null) }) },
        },
        { provide: Router, useValue: { navigate: () => {} } },
        { provide: ActivatedRoute, useValue: {} },
      ],
    });
    const f = TestBed.createComponent(BankListComponent);
    f.detectChanges();
    return f;
  }

  it('kolomnya ada, dan sebelum kolom saldo', () => {
    const f = buat(rekening);
    const kolom = f.componentInstance.displayedColumns;

    expect(kolom).toContain('excludeFromCalendar');
    expect(kolom.indexOf('excludeFromCalendar')).toBeLessThan(
      kolom.indexOf('balance'),
    );
  });

  it('rekening yang dikecualikan diberi penanda, sisanya ditandai termasuk', () => {
    const f = buat(rekening);
    const el: HTMLElement = f.nativeElement;

    // Satu rekening dikecualikan, dua ikut.
    expect(el.querySelectorAll('.bl-tag--off').length).toBe(1);
    expect(el.querySelectorAll('.bl-tag--on').length).toBe(2);
  });

  it('rekening tanpa kolomnya sama sekali dianggap ikut', () => {
    // Baris lama yang belum pernah disunting mengirim `undefined`, bukan
    // `false`. Kalau itu terbaca sebagai "dikecualikan", seluruh rekening lama
    // akan tampak keluar dari perhitungan.
    const f = buat([{ id: 9, bankName: 'BNI', bankAccountName: 'Lama', bankAccountNumber: '999' }]);
    const el: HTMLElement = f.nativeElement;

    expect(el.querySelectorAll('.bl-tag--off').length).toBe(0);
    expect(el.querySelectorAll('.bl-tag--on').length).toBe(1);
  });
});
