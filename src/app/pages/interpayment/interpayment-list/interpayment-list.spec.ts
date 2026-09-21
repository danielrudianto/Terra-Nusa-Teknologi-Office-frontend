/*
 * Transfer antar rekening: rentang tanggal HARUS di kanan (dulu jatuh di
 * tengah karena dua `margin-left: auto` berbagi ruang), dan saringan
 * rekening/kata kunci ikut terkirim ke server.
 */
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { InterpaymentListComponent } from './interpayment-list.component';
import { ApiService } from 'src/app/services/api.service';

describe('InterpaymentListComponent', () => {
  let panggilan: any[];

  function buat() {
    panggilan = [];
    TestBed.configureTestingModule({
      imports: [InterpaymentListComponent, TranslateModule.forRoot()],
      providers: [
        provideNoopAnimations(),
        {
          provide: ApiService,
          useValue: {
            get: (jalur: string, p: any) => {
              panggilan.push({ jalur, p });
              if (jalur === 'banks/all') return of([{ id: 3, bankAccountName: 'A', bankAccountNumber: '1' }]);
              return of({ data: [], count: 0 });
            },
          },
        },
        { provide: MatDialog, useValue: {} },
        { provide: MatSnackBar, useValue: { open: () => {} } },
        { provide: Router, useValue: { navigate: () => {} } },
      ],
    });
    const f = TestBed.createComponent(InterpaymentListComponent);
    (f.nativeElement as HTMLElement).style.display = 'block';
    (f.nativeElement as HTMLElement).style.width = '1200px';
    document.body.appendChild(f.nativeElement);
    f.detectChanges();
    return f;
  }

  afterEach(() => document.querySelectorAll('app-interpayment-list').forEach((e) => e.remove()));

  it('rentang tanggal berada di sisi KANAN bilah alat', fakeAsync(() => {
    const f = buat();
    tick(500);
    const bilah = f.nativeElement.querySelector('.ip-toolbar').getBoundingClientRect();
    const rentang = f.nativeElement.querySelector('.ip-range').getBoundingClientRect();
    const tengahBilah = bilah.left + bilah.width / 2;
    expect(rentang.left).toBeGreaterThan(tengahBilah);
  }));

  it('saringan rekening dan kata kunci terkirim, dan kembali ke halaman 1', fakeAsync(() => {
    const f = buat();
    tick(500);
    const c = f.componentInstance;
    c.page = 3;
    c.rekeningControl.setValue(3);
    c.searchControl.setValue(' kas ');
    tick(500);
    const akhir = panggilan.filter((x) => x.jalur === 'interpayments').pop();
    expect(akhir.p.bankAccountID).toBe(3);
    expect(akhir.p.keyword).toBe('kas');
    expect(akhir.p.page).toBe(1);
    expect(c.page).toBe(1);
  }));

  it('kolom keterangan tampil setelah tujuan', () => {
    const f = buat();
    const k = f.componentInstance.displayedColumns;
    expect(k.indexOf('description')).toBe(k.indexOf('bankAccountDestination') + 1);
  });
});
