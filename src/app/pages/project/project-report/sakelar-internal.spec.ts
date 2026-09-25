/*
 * SAKELAR "SERTAKAN INTERNAL" HARUS MENGENAI SELURUH LAPORAN, TERMASUK
 * GRAFIKNYA.
 *
 * Pembelian internal adalah pembelian dari dalam grup: uangnya berpindah
 * tetapi tidak keluar dari perusahaan. Karena itu ada sakelarnya — dan
 * sakelar yang mengenai SEBAGIAN saja lebih buruk daripada tidak ada sama
 * sekali: angka besar di kartu berubah, grafik di bawahnya tidak, dan yang
 * membacanya menyimpulkan salah satunya rusak tanpa tahu yang mana.
 *
 * Yang diperiksa SELURUH jalur yang memakai biaya:
 *
 *   kategori            rincian biaya per jenis pengadaan
 *   biayaSeumurProyek   dasar margin
 *   margin              kontrak - biaya
 *   mingguan            batang biaya per pekan
 *   kurvaS              garis biaya pada kurva S       <- yang ditanyakan
 *   arusKasKeluarPakai  kas keluar
 *
 * Kurva S yang paling mudah tertinggal: ia disusun dari `mingguan()` dan
 * `biayaDibawa()`, dua lapis jauh dari sakelarnya, sehingga tidak ada satu
 * baris pun di dalamnya yang menyebut kata "internal".
 */

import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { ApiService } from 'src/app/services/api.service';
import { ProjectReportComponent } from './project-report.component';

describe('ProjectReport — sakelar sertakan internal', () => {
  const PROYEK = {
    id: 1,
    code: 'R501',
    name: 'Bored pile R501',
    isActive: true,
    isCancelled: false,
    contractValue: 1110,
    contractDpp: 1000,
    contractCount: 1,
  };

  // 200 dari luar grup, 300 dari DALAM grup. Mematikan sakelarnya harus
  // menyisakan 200 di mana pun biaya dihitung.
  const LAPORAN = {
    purchases: [
      { date: '2026-01-05', dpp: 200, isInternal: false, purchaseType: 'F' },
      { date: '2026-02-02', dpp: 300, isInternal: true, purchaseType: 'F' },
    ],
    purchase_drafts: [],
    reimbursements: [],
    sales_invoices: [],
  };

  function buat() {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ProjectReportComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: ApiService,
          useValue: {
            get: (jalur: string) => {
              if (jalur.startsWith('purchases/report/project/'))
                return of(LAPORAN);
              if (jalur.endsWith('/progress'))
                return of([{ id: 1, date: '2026-01-05', percentage: 10 }]);
              if (jalur === 'projects') return of({ data: [PROYEK] });
              return of(null);
            },
            post: () => of({}),
            put: () => of({}),
            delete: () => of({}),
          },
        },
        { provide: MatSnackBar, useValue: { open: () => {} } },
        {
          provide: MatDialog,
          useValue: { open: () => ({ afterClosed: () => of(false) }) },
        },
        { provide: Router, useValue: { navigate: () => {} } },
        { provide: ActivatedRoute, useValue: { snapshot: { params: {} } } },
      ],
    });
    const f = TestBed.createComponent(ProjectReportComponent);
    f.componentInstance.muat('R501');
    tick();
    return f.componentInstance as any;
  }

  it('menyala: seluruh biaya terhitung (200 + 300)', fakeAsync(() => {
    const c = buat();
    expect(c.sertakanInternal()).toBeTrue();
    expect(c.biayaSeumurProyek()).toBeCloseTo(500, 5);
  }));

  it('DIMATIKAN: kurva S ikut membuang pembelian internal', fakeAsync(() => {
    /*
     * INI YANG DITANYAKAN, dan yang paling mudah tertinggal.
     *
     * Biaya pada kurva S dinyatakan sebagai persen nilai kontrak (1000):
     * dengan internal 500/1000 = 50%, tanpanya 200/1000 = 20%.
     */
    const c = buat();

    const dengan = c.kurvaS();
    const puncakDengan = dengan[dengan.length - 1].biaya;
    expect(puncakDengan).toBeCloseTo(50, 5);

    c.toggleInternal();
    expect(c.sertakanInternal()).toBeFalse();

    const tanpa = c.kurvaS();
    const puncakTanpa = tanpa[tanpa.length - 1].biaya;
    expect(puncakTanpa).toBeCloseTo(20, 5);
    expect(puncakTanpa).toBeLessThan(puncakDengan);
  }));

  it('DIMATIKAN: batang mingguan ikut membuangnya', fakeAsync(() => {
    const c = buat();
    const dengan = c.mingguan();
    const totalDengan = dengan.reduce((a: number, w: any) => a + w.biaya, 0);
    expect(totalDengan).toBeCloseTo(500, 5);

    c.toggleInternal();
    const tanpa = c.mingguan();
    const totalTanpa = tanpa.reduce((a: number, w: any) => a + w.biaya, 0);
    expect(totalTanpa).toBeCloseTo(200, 5);
  }));

  it('DIMATIKAN: kategori, biaya seumur proyek, dan margin ikut', fakeAsync(() => {
    const c = buat();
    const marginDengan = c.margin();

    c.toggleInternal();

    expect(c.biayaSeumurProyek()).toBeCloseTo(200, 5);
    // Kontrak 1000 - biaya 200.
    expect(c.margin()).toBeCloseTo(800, 5);
    expect(c.margin()).toBeGreaterThan(marginDengan);

    const total = c.kategori().reduce((a: number, k: any) => a + k.nilai, 0);
    expect(total).toBeCloseTo(200, 5);
  }));

  it('jumlah internal tetap dilaporkan walau sakelarnya mati', fakeAsync(() => {
    /*
     * Sakelarnya menyembunyikan NILAINYA, bukan keberadaannya. Layar tetap
     * harus dapat mengatakan "ada 1 pembelian internal yang tidak
     * dihitung" — kalau tidak, angka yang berubah tidak punya keterangan.
     */
    const c = buat();
    expect(c.jumlahInternal()).toBe(1);
    c.toggleInternal();
    expect(c.jumlahInternal()).toBe(1);
  }));
});
