import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { ApiService } from 'src/app/services/api.service';
import { BankListComponent } from './bank-list.component';

/**
 * Penyaring keadaan pada daftar rekening.
 *
 * Sebelumnya server menghitung halaman dengan menyaring `isDelete = 0`
 * sementara kueri datanya TIDAK menyaring apa pun — sehingga paginator
 * menyebut satu angka dan tabelnya menampilkan angka lain, lengkap dengan
 * rekening yang sudah dihapus.
 *
 * Penyaringnya sekarang dikirim ke server, dan bawaannya "aktif".
 */
describe('BankList — penyaring keadaan', () => {
  let terkirim: any[];

  function buat() {
    terkirim = [];
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [BankListComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: ApiService,
          useValue: {
            get: (_jalur: string, params: any) => {
              terkirim.push(params);
              return of({ data: [], count: 0, balances: [] });
            },
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

  it('bawaannya hanya rekening yang belum dihapus', () => {
    buat();
    expect(terkirim.length).toBeGreaterThan(0);
    expect(terkirim[0].keadaan).toBe('aktif');
  });

  it('kata kunci ikut dikirim ke server', () => {
    // Pencariannya dilakukan server, bukan disaring di layar: yang tampil
    // hanya sepuluh baris per halaman, jadi menyaring di sisi klien hanya
    // mencari di dalam halaman yang sedang terbuka.
    const f = buat();
    f.componentInstance.formControl.setValue('mandiri');
    f.componentInstance.fetchBankAccounts(1);

    expect(terkirim[terkirim.length - 1].keyword).toBe('mandiri');
  });

  it('berganti keadaan kembali ke halaman pertama', () => {
    const f = buat();
    f.componentInstance.page = 4;

    f.componentInstance.gantiKeadaan('dihapus');

    expect(f.componentInstance.keadaan).toBe('dihapus');
    expect(f.componentInstance.page).toBe(1);
    expect(terkirim[terkirim.length - 1].keadaan).toBe('dihapus');
  });

  it('menekan pil yang sedang aktif tidak mengosongkan penyaring', () => {
    // `mat-chip-listbox` mengirim `undefined` saat pilihan yang sedang aktif
    // ditekan lagi. Tanpa penjagaan, penyaringnya jadi kosong dan server
    // mengembalikan bawaan yang tidak lagi cocok dengan pil yang tampak.
    const f = buat();
    const sebelum = terkirim.length;

    f.componentInstance.gantiKeadaan(undefined as any);
    f.componentInstance.gantiKeadaan('aktif');

    expect(f.componentInstance.keadaan).toBe('aktif');
    expect(terkirim.length).toBe(sebelum);
  });
});
