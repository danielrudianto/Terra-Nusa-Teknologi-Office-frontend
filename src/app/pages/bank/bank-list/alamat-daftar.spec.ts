import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { ApiService } from 'src/app/services/api.service';
import { BankListComponent } from './bank-list.component';

/**
 * Keadaan daftar rekening disimpan di ALAMAT — kembali dari Mutasi atau
 * menyegarkan halaman mendarat di halaman & pencarian yang sama. Alamat
 * yang sudah benar TIDAK ditulis ulang (itu menjalankan transisi dua kali).
 */
describe('BankList — keadaan di alamat', () => {
  let terkirim: any[];
  let navigasi: jasmine.Spy;

  function buat(qp: Record<string, string>) {
    terkirim = [];
    navigasi = jasmine.createSpy('navigate');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [BankListComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: ApiService,
          useValue: {
            get: (_j: string, p: any) => {
              terkirim.push(p);
              return of({ data: [], count: 0, balances: [] });
            },
          },
        },
        { provide: MatSnackBar, useValue: { open: () => {} } },
        { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => of(null) }) } },
        { provide: Router, useValue: { navigate: navigasi } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(qp), queryParams: qp } },
        },
      ],
    });
    const f = TestBed.createComponent(BankListComponent);
    f.detectChanges();
    return f;
  }

  it('membaca halaman, pencarian, dan saringan dari alamat', () => {
    buat({ keadaan: 'dihapus', cari: 'bca', hal: '3' });
    const p = terkirim[0];
    expect(p.page).toBe(3);
    expect(p.keadaan).toBe('dihapus');
    expect(p.keyword).toBe('bca');
  });

  it('alamat yang sudah sesuai tidak ditulis ulang', () => {
    buat({ keadaan: 'dihapus', cari: 'bca', hal: '3' });
    expect(navigasi).not.toHaveBeenCalled();
  });

  it('bawaan tanpa parameter tidak menulis alamat', () => {
    buat({});
    expect(navigasi).not.toHaveBeenCalled();
  });

  it('berganti saringan menulis alamat', () => {
    const f = buat({});
    f.componentInstance.gantiKeadaan('semua');
    expect(navigasi).toHaveBeenCalled();
    expect(navigasi.calls.mostRecent().args[1].queryParams).toEqual({ keadaan: 'semua' });
  });
});
