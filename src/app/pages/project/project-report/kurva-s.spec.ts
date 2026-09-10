import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { ApiService } from 'src/app/services/api.service';
import { ProjectReportComponent } from './project-report.component';

/**
 * Kurva S: kemajuan pekerjaan vs biaya terpakai.
 *
 * Sampai ada bagian ini, laporan proyek hanya dapat menjawab "berapa biaya
 * yang sudah keluar dibanding kontrak". Biaya 60% belum tentu buruk bila
 * pekerjaannya juga 60% — dan sangat buruk bila pekerjaannya baru 30%; tanpa
 * angka kemajuan, keduanya terbaca persis sama.
 *
 * Yang diuji di sini bentuk kurvanya, bukan gambarnya: fungsi tangga untuk
 * kemajuan, kumulatif untuk biaya, dan rentang waktu yang mencakup keduanya.
 */
describe('ProjectReport — kurva S', () => {
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

  const LAPORAN = {
    // Dua pembelian: 200 pada 5 Jan, 300 pada 2 Feb. Kontrak DPP 1000,
    // jadi kumulatifnya 20% lalu 50%.
    purchases: [
      { date: '2026-01-05', dpp: 200, isInternal: false, purchaseType: 'F' },
      { date: '2026-02-02', dpp: 300, isInternal: false, purchaseType: 'F' },
    ],
    purchase_drafts: [],
    reimbursements: [],
    sales_invoices: [],
  };

  function buat(progress: any[] | 'terlarang') {
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
              if (jalur.endsWith('/progress')) {
                return progress === 'terlarang'
                  ? throwError(() => ({ status: 403 }))
                  : of(progress);
              }
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
    return TestBed.createComponent(ProjectReportComponent);
  }

  it('kemajuan dibaca sebagai fungsi tangga, bukan turun ke nol', fakeAsync(() => {
    const f = buat([
      { id: 1, date: '2026-01-05', percentage: 10 },
      { id: 2, date: '2026-02-02', percentage: 50 },
    ]);
    f.componentInstance.muat('R501');
    tick();

    const titik = f.componentInstance.kurvaS();
    expect(titik.length).toBeGreaterThan(2);

    // Pekan-pekan di antara dua catatan meneruskan angka sebelumnya.
    const progres = titik.map((t) => t.progres);
    expect(progres[0]).toBe(10);
    expect(progres[progres.length - 1]).toBe(50);
    expect(progres.every((p) => p !== null)).toBeTrue();
    // Tidak pernah kembali ke nol di tengah.
    expect(progres.some((p, i) => i > 0 && p === 0)).toBeFalse();
  }));

  it('biaya dinyatakan sebagai persen nilai kontrak, kumulatif', fakeAsync(() => {
    const f = buat([{ id: 1, date: '2026-01-05', percentage: 10 }]);
    f.componentInstance.muat('R501');
    tick();

    const titik = f.componentInstance.kurvaS();
    // 200 dari 1000 pada pekan pertama; 500 dari 1000 pada pekan terakhir.
    expect(titik[0].biaya).toBeCloseTo(20, 5);
    expect(titik[titik.length - 1].biaya).toBeCloseTo(50, 5);

    // Kumulatif tidak pernah turun.
    for (let i = 1; i < titik.length; i++) {
      expect(titik[i].biaya!).toBeGreaterThanOrEqual(titik[i - 1].biaya!);
    }
  }));

  it('selisih negatif berarti biaya mendahului pekerjaan', fakeAsync(() => {
    const f = buat([{ id: 1, date: '2026-02-02', percentage: 30 }]);
    f.componentInstance.muat('R501');
    tick();

    // Biaya 50%, kemajuan 30% -> selisih -20 poin.
    expect(f.componentInstance.selisihKurva()).toBeCloseTo(-20, 5);
  }));

  it('rentangnya mencakup kemajuan yang dicatat di luar pekan berbiaya', fakeAsync(() => {
    // Kemajuan Maret, sedangkan biaya terakhir Februari. Masa tanpa
    // pengeluaran itu justru yang paling perlu terbaca.
    const f = buat([
      { id: 1, date: '2026-01-05', percentage: 10 },
      { id: 2, date: '2026-03-30', percentage: 80 },
    ]);
    f.componentInstance.muat('R501');
    tick();

    const titik = f.componentInstance.kurvaS();
    const terakhir = titik[titik.length - 1];
    expect(terakhir.mulai >= '2026-03-30').toBeTrue();
    expect(terakhir.progres).toBe(80);
    // Biayanya mendatar, bukan hilang.
    expect(terakhir.biaya).toBeCloseTo(50, 5);
  }));

  it('tanpa catatan kemajuan, bagiannya kosong dan grafiknya tidak muncul', fakeAsync(() => {
    const f = buat([]);
    f.componentInstance.muat('R501');
    tick();

    expect(f.componentInstance.progress().length).toBe(0);
    expect(f.componentInstance.adaKurvaS()).toBeFalse();
    expect(f.componentInstance.selisihKurva()).toBeNull();
  }));

  it('403 menyembunyikan bagiannya, bukan menampilkan galat', fakeAsync(() => {
    // Sebagian divisi memang tidak punya modul `project_progress`. Laporan
    // biayanya tetap utuh, dan tidak ada yang perlu mereka lakukan soal ini.
    const f = buat('terlarang');
    f.componentInstance.muat('R501');
    tick();

    expect(f.componentInstance.progressTerkunci()).toBeTrue();
    expect(f.componentInstance.galat()).toBeNull();
  }));
});
