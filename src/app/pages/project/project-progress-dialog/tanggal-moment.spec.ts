import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import moment from 'moment';
import { provideMomentDateAdapter } from '@angular/material-moment-adapter';

import { ApiService } from 'src/app/services/api.service';
import { ProjectProgressDialogComponent } from './project-progress-dialog.component';

/**
 * Nilai datepicker aplikasi ini adalah MOMENT, bukan `Date`.
 *
 * `app.module` memasang `provideMomentDateAdapter`, sehingga setiap datepicker
 * mengisi bidang formulirnya dengan objek Moment. Memanggil `.getMonth()`
 * langsung pada nilai itu melempar
 *
 *     TypeError: n.getMonth is not a function
 *
 * tepat saat tombol Simpan ditekan — dan tidak ada satu pun tanda sebelum itu:
 * formulirnya sah, tombolnya menyala, kesalahannya baru muncul di konsol.
 *
 * Uji ini mengirimkan Moment sungguhan, bukan `Date`, supaya kekeliruan yang
 * sama tidak dapat kembali diam-diam.
 */
describe('ProjectProgressDialog — tanggal dari adapter Moment', () => {
  let terkirim: any;

  function buat(progress: any = null) {
    terkirim = null;
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ProjectProgressDialogComponent, TranslateModule.forRoot()],
      providers: [
        // Adapter yang sama dengan yang dipasang `app.module`. Dialognya
        // sengaja TIDAK mendaftarkan adapter sendiri — mendaftarkan yang
        // kedua justru menabrak yang dipakai seluruh aplikasi.
        provideMomentDateAdapter(),
        {
          provide: ApiService,
          useValue: {
            post: (_jalur: string, muatan: any) => {
              terkirim = muatan;
              return of({});
            },
            put: (_jalur: string, muatan: any) => {
              terkirim = muatan;
              return of({});
            },
          },
        },
        { provide: MAT_DIALOG_DATA, useValue: { projectID: 7, progress } },
        { provide: MatDialogRef, useValue: { close: () => {} } },
        { provide: MatSnackBar, useValue: { open: () => {} } },
      ],
    });
    return TestBed.createComponent(ProjectProgressDialogComponent);
  }

  it('Moment tidak membuat penyimpanan gagal, dan tanggalnya utuh', () => {
    const f = buat();
    f.componentInstance.form.patchValue({
      date: moment('2026-09-01'),
      percentage: 42.5,
      description: '  pekerjaan pilecap  ',
    });

    expect(() => f.componentInstance.simpan()).not.toThrow();

    expect(terkirim).toBeTruthy();
    expect(terkirim.date).toBe('2026-09-01');
    expect(terkirim.percentage).toBe(42.5);
    expect(terkirim.description).toBe('pekerjaan pilecap');
  });

  it('`Date` biasa tetap diterima', () => {
    // Bila suatu saat adapternya diganti kembali ke bawaan, jalur ini yang
    // menjaga dialognya tidak ikut patah.
    const f = buat();
    f.componentInstance.form.patchValue({
      date: new Date(2026, 8, 1),
      percentage: 10,
    });

    f.componentInstance.simpan();
    expect(terkirim.date).toBe('2026-09-01');
  });

  it('tanggal disusun dari waktu SETEMPAT, tidak mundur sehari', () => {
    /*
     * `toISOString()` mengubah ke UTC lebih dulu. Bagi WIB (+7), opname yang
     * dicatat dini hari akan mundur ke tanggal sebelumnya — dan kurvanya
     * bergeser tanpa ada yang tahu sebabnya.
     */
    const f = buat();
    f.componentInstance.form.patchValue({
      date: new Date(2026, 8, 1, 1, 30), // 1 September, 01:30 setempat
      percentage: 10,
    });

    f.componentInstance.simpan();
    expect(terkirim.date).toBe('2026-09-01');
  });

  it('keterangan kosong dikirim sebagai null, bukan teks kosong', () => {
    const f = buat();
    f.componentInstance.form.patchValue({
      date: moment('2026-09-01'),
      percentage: 10,
      description: '   ',
    });

    f.componentInstance.simpan();
    expect(terkirim.description).toBeNull();
  });

  it('formulir tidak sah tidak mengirim apa pun', () => {
    const f = buat();
    f.componentInstance.form.patchValue({ date: null, percentage: 150 });

    f.componentInstance.simpan();
    expect(terkirim).toBeNull();
  });
});
