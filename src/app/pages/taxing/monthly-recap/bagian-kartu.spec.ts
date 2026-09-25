/*
 * BAGIAN LAPORAN: KARTU PILIH, SATU DAFTAR.
 *
 * Dulu tujuh nama ditulis di template (satu `mat-slide-toggle` per bagian)
 * DAN sekali lagi sebagai array di dalam validatornya. Menambah satu bagian
 * berarti menyentuh dua tempat, dan yang terlupa validatornya: bagian baru
 * yang dicentang sendirian tetap membuat tombol unduhnya mati, tanpa satu
 * pun keterangan.
 *
 * Sekarang satu daftar — `BAGIAN` — dipakai keduanya. Yang diuji di sini
 * justru sambungannya: setiap kunci di daftar itu HARUS punya kontrol di
 * form, dan mencentang mana pun dari daftar itu harus menyahkan formnya.
 */

import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { ApiService } from 'src/app/services/api.service';
import { MonthlyRecapComponent } from './monthly-recap.component';

describe('MonthlyRecap — bagian laporan', () => {
  /*
   * TestBed sungguhan, bukan `Object.create(prototype)`.
   *
   * Komponen ini memakai `inject()` pada field-nya (`ServerMessageService`,
   * `TranslateService`, `MAT_DIALOG_DATA`), dan itu hanya sah di dalam
   * konteks injeksi. `Object.create` juga TIDAK menjalankan field
   * initialiser sama sekali — `formGroup` tidak akan ada, dan yang diuji di
   * sini justru sambungan antara `BAGIAN` dan `formGroup`.
   */
  function buat(): any {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [MonthlyRecapComponent, TranslateModule.forRoot()],
      providers: [
        { provide: ApiService, useValue: { get: () => of(null) } },
        { provide: MatSnackBar, useValue: { open: () => {} } },
        { provide: MAT_DIALOG_DATA, useValue: { month: 9, year: 2026 } },
      ],
    });
    return TestBed.createComponent(MonthlyRecapComponent)
      .componentInstance as any;
  }

  it('setiap kunci BAGIAN punya kontrolnya di form', () => {
    const c = buat();
    expect(c.BAGIAN.length).toBe(7);
    for (const b of c.BAGIAN) {
      expect(c.formGroup.get(b.kunci))
        .withContext(`kontrol untuk ${b.kunci}`)
        .toBeTruthy();
    }
  });

  it('semua label memakai kunci terjemahan, bukan teks mentah', () => {
    const c = buat();
    for (const b of c.BAGIAN) {
      expect(b.label).toMatch(/^taxing\./);
    }
  });

  it('tanpa satu pun bagian, form tidak sah', () => {
    const c = buat();
    c.formGroup.patchValue({ month: 9, year: 2026 });
    expect(c.formGroup.errors?.atLeastOneRequired).toBeTrue();
  });

  it('MASING-MASING bagian sendirian sudah menyahkan form', () => {
    for (const kunci of [
      'mutation',
      'purchase',
      'sales',
      'asset',
      'ar',
      'ap',
      'loans',
    ]) {
      const c = buat();
      c.formGroup.patchValue({ month: 9, year: 2026 });
      c.toggleBagian(kunci);
      expect(c.formGroup.errors)
        .withContext(`hanya ${kunci} dicentang`)
        .toBeNull();
    }
  });

  it('toggleBagian membalik nilainya, bukan selalu menyalakan', () => {
    const c = buat();
    c.toggleBagian('sales');
    expect(c.formGroup.get('sales')!.value).toBeTrue();
    c.toggleBagian('sales');
    expect(c.formGroup.get('sales')!.value).toBeFalse();
  });

  it('kunci yang tidak ada tidak melempar', () => {
    const c = buat();
    expect(() => c.toggleBagian('tidak-ada')).not.toThrow();
  });
});
