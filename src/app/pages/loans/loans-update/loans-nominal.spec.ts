import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';

import { LoansUpdateComponent } from './loans-update.component';
import { ApiService } from 'src/app/services/api.service';

/**
 * Nilai pinjaman harus TERLIHAT saat dialog sunting dibuka.
 *
 * Sama seperti kolom nominal pada rencana pembayaran: ngx-mask baru siap
 * setelah `ngOnInit`, sehingga `patchValue` yang datang lebih awal tidak
 * menghasilkan tampilan apa pun — kolomnya kosong walaupun nilainya ada.
 */
describe('LoansUpdate — nilai utang & diterima saat menyunting', () => {
  function buat() {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [
        LoansUpdateComponent,
        NoopAnimationsModule,
        TranslateModule.forRoot(),
      ],
      providers: [
        { provide: MatDialogRef, useValue: { close: () => {} } },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            loan: {
              id: 3,
              creditorName: 'PT Contoh',
              creditorAddress: 'Bekasi',
              description: 'Modal kerja',
              bankAccountName: 'PT Contoh',
              bankAccountNumber: '123456',
              bankName: 'BCA',
              debt: 250000000,
              received: 200000000,
              bankAccountID: 2,
              date: '2026-07-26',
            },
          },
        },
        { provide: ApiService, useValue: { get: () => of([]) } },
        { provide: MatSnackBar, useValue: { open: () => {} } },
      ],
    });
    const f = TestBed.createComponent(LoansUpdateComponent);
    f.detectChanges();
    return f;
  }

  it('utang dan diterima tampil di kotaknya', fakeAsync(() => {
    const f = buat();
    tick();
    f.detectChanges();
    const utang: HTMLInputElement =
      f.nativeElement.querySelector('input[formControlName="debt"]');
    const diterima: HTMLInputElement =
      f.nativeElement.querySelector('input[formControlName="received"]');
    console.log('LOANS -> utang:', JSON.stringify(utang?.value),
      '| diterima:', JSON.stringify(diterima?.value));
    expect(utang.value).toContain('250 000 000');
    expect(diterima.value).toContain('200 000 000');
  }));
});
