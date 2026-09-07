import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { provideNativeDateAdapter } from '@angular/material/core';

import { RencanaDialogComponent } from './rencana-dialog.component';
import { ApiService } from 'src/app/services/api.service';

/** Apa yang sebenarnya terjadi pada kolom nominal saat menyunting. */
describe('RencanaDialog — kolom nominal saat menyunting', () => {
  function buat(rencana: any) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [
        RencanaDialogComponent,
        NoopAnimationsModule,
        TranslateModule.forRoot(),
      ],
      providers: [
        provideNativeDateAdapter(),
        { provide: MatDialogRef, useValue: { close: () => {} } },
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
    description: 'Sewa crane',
    category: 'material',
    status: 'rencana',
  };

  it('melaporkan keadaan kolom nominal untuk nilai ANGKA', fakeAsync(() => {
    const f = buat({ ...dasar, amount: 5000000 });
    tick();
    f.detectChanges();
    const c = f.componentInstance.formGroup.get('amount')!;
    const input: HTMLInputElement =
      f.nativeElement.querySelector('input[formControlName="amount"]');
    console.log('ANGKA  -> nilai kendali:', JSON.stringify(c.value),
      '| tampil:', JSON.stringify(input?.value),
      '| disabled:', c.disabled, '| terkunci:', f.componentInstance.terkunci);
    expect(c.disabled).toBeFalse();
  }));

  it('nominal UNTAI dari server juga tampil', fakeAsync(() => {
    const f = buat({ ...dasar, amount: '5000000.00' });
    tick();
    f.detectChanges();
    const c = f.componentInstance.formGroup.get('amount')!;
    const input: HTMLInputElement =
      f.nativeElement.querySelector('input[formControlName="amount"]');
    console.log('UNTAI  -> nilai kendali:', JSON.stringify(c.value),
      '| tampil:', JSON.stringify(input?.value),
      '| disabled:', c.disabled);
    expect(c.disabled).toBeFalse();
    expect(input.value).toContain('5 000 000');
  }));

  it('nilai baru yang diketik sampai ke kendali', () => {
    const f = buat({ ...dasar, amount: 5000000 });
    const input: HTMLInputElement =
      f.nativeElement.querySelector('input[formControlName="amount"]');
    input.value = '7500000';
    input.dispatchEvent(new Event('input'));
    f.detectChanges();
    const c = f.componentInstance.formGroup.get('amount')!;
    console.log('KETIK  -> nilai kendali:', JSON.stringify(c.value),
      '| tampil:', JSON.stringify(input.value), '| sah:', c.valid);
    expect(Number(String(c.value).replace(/[^\d.]/g, ''))).toBe(7500000);
  });

  it('rencana TERPAKAI tetap terkunci sesudah penyetelan ulang', fakeAsync(() => {
    const f = buat({ ...dasar, amount: 5000000, status: 'terpakai' });
    tick();
    f.detectChanges();
    expect(f.componentInstance.formGroup.get('amount')!.disabled).toBeTrue();
  }));
});
