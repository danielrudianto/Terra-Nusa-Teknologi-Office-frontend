import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideNativeDateAdapter } from '@angular/material/core';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { RencanaDialogComponent } from './rencana-dialog.component';
import { ApiService } from 'src/app/services/api.service';

/** Apa yang BENAR-BENAR dikirim saat menyimpan suntingan rencana. */
describe('RencanaDialog — muatan yang dikirim saat menyimpan', () => {
  let ditutupDengan: any = null;

  function buat(rencana: any) {
    ditutupDengan = null;
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [
        RencanaDialogComponent,
        NoopAnimationsModule,
        TranslateModule.forRoot(),
      ],
      providers: [
        provideNativeDateAdapter(),
        {
          provide: MatDialogRef,
          useValue: { close: (v: any) => (ditutupDengan = v) },
        },
        { provide: MAT_DIALOG_DATA, useValue: { rencana } },
        { provide: ApiService, useValue: { get: () => of([]) } },
      ],
    });
    const f = TestBed.createComponent(RencanaDialogComponent);
    f.detectChanges();
    return f;
  }

  const dasar = {
    id: 7,
    planType: 'keluar',
    date: '2026-09-20',
    amount: 5000000,
    description: 'Sewa crane',
    category: 'material',
    projectName: 'R501',
    bankAccountID: 2,
    notes: '',
    status: 'rencana',
  };

  it('nominal yang diketik ulang ikut terkirim', fakeAsync(() => {
    const f = buat(dasar);
    tick();
    f.detectChanges();

    const input: HTMLInputElement =
      f.nativeElement.querySelector('input[formControlName="amount"]');
    input.value = '7500000';
    input.dispatchEvent(new Event('input'));
    f.detectChanges();

    f.componentInstance.simpan();
    console.log('MUATAN:', JSON.stringify(ditutupDengan));
    expect(ditutupDengan).toBeTruthy();
    expect(ditutupDengan.amount).toBe(7500000);
    expect(Number.isFinite(ditutupDengan.amount)).toBeTrue();
  }));

  it('nominal yang TIDAK disentuh tetap terkirim apa adanya', fakeAsync(() => {
    const f = buat(dasar);
    tick();
    f.detectChanges();
    // Hanya keterangan yang diubah; nominalnya dibiarkan.
    f.componentInstance.formGroup.get('description')!.setValue('Sewa crane 2');
    f.componentInstance.simpan();
    console.log('MUATAN (tak disentuh):', JSON.stringify(ditutupDengan));
    expect(ditutupDengan).toBeTruthy();
    expect(ditutupDengan.amount).toBe(5000000);
  }));
});
