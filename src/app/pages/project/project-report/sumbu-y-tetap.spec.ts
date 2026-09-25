/*
 * SUMBU Y ARUS KAS TIDAK IKUT BERGESER BERSAMA JENDELANYA.
 *
 * Grafik arus kas proyek digeser per 30/60/90 hari. Selama sumbu Y
 * dibiarkan menyesuaikan sendiri, skalanya berubah SETIAP kali jendelanya
 * bergerak: bulan bersaldo kecil melar memenuhi tinggi kotak, bulan
 * berikutnya menyusut, dan bentuk garis yang sama terbaca naik-turun
 * berbeda-beda. Yang menggeser mengira arus kasnya berubah, padahal yang
 * berubah penggarisnya.
 *
 * Batasnya karena itu dihitung dari SELURUH proyek, bukan dari jendela.
 */

import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { ApiService } from 'src/app/services/api.service';
import { ProjectReportComponent } from './project-report.component';

describe('ProjectReport — sumbu Y arus kas', () => {
  function buat() {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ProjectReportComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: ApiService,
          useValue: {
            get: () => of(null),
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
    return TestBed.createComponent(ProjectReportComponent).componentInstance as any;
  }

  /** Titik kas palsu: saldo memuncak di tengah, supaya jendela awal dan
   *  jendela tengah punya nilai tertinggi yang JAUH berbeda. */
  function titik(n: number) {
    const hasil: any[] = [];
    for (let i = 0; i < n; i++) {
      const puncak = i === Math.floor(n / 2) ? 900 : 10;
      hasil.push({
        bulan: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`,
        label: `T${i}`,
        masuk: puncak,
        keluar: 5,
        saldo: puncak,
      });
    }
    return hasil;
  }

  it('batasnya dihitung dari SELURUH titik, bukan dari jendela', fakeAsync(() => {
    const c = buat();
    tick();
    spyOn(c, 'titikArusKas').and.returnValue(titik(90));
    // Jendela sempit yang TIDAK memuat puncaknya.
    spyOn(c, 'titikTampil').and.returnValue(titik(90).slice(0, 5));

    const b = c.batasArusKas();
    // Puncak 900 ada di luar jendela, tetapi tetap menentukan batasnya.
    expect(b.max).toBeGreaterThanOrEqual(900);
    // Dan tidak melar jauh — ruang napas, bukan kotak kosong.
    expect(b.max).toBeLessThan(900 * 2);
  }));

  it('nol SELALU di dalam kotak', fakeAsync(() => {
    const c = buat();
    tick();
    spyOn(c, 'titikArusKas').and.returnValue(
      titik(10).map((t) => ({ ...t, masuk: 50, keluar: 40, saldo: 50 })),
    );
    const b = c.batasArusKas();
    expect(b.min).toBeLessThanOrEqual(0);
    expect(b.max).toBeGreaterThan(0);
  }));

  it('saldo MINUS tidak dipotong', fakeAsync(() => {
    /*
     * Penjaga terpenting di berkas ini. Saldo kas proyek memang bisa minus
     * — proyek yang menalangi pekerjaan sebelum termin cair — dan justru
     * itu yang dicari orang dari grafik ini. Memaksa `min: 0` memotong
     * seluruh bagian yang menjawab pertanyaannya.
     */
    const c = buat();
    tick();
    spyOn(c, 'titikArusKas').and.returnValue(
      titik(10).map((t) => ({ ...t, masuk: 10, keluar: 200, saldo: -450 })),
    );
    const b = c.batasArusKas();
    expect(b.min).toBeLessThanOrEqual(-450);
  }));

  it('seri yang DIMATIKAN tidak lagi menyediakan ruang', fakeAsync(() => {
    /*
     * Mematikan seri adalah tindakan sengaja dengan sebab yang terlihat;
     * menggeser jendela bukan. Jadi yang pertama boleh mengubah skala,
     * yang kedua tidak.
     */
    const c = buat();
    tick();
    spyOn(c, 'titikArusKas').and.returnValue(
      titik(10).map((t) => ({ ...t, masuk: 5000, keluar: 5, saldo: 5 })),
    );

    const dengan = c.batasArusKas().max;
    expect(dengan).toBeGreaterThanOrEqual(5000);

    c.toggleSeriKas('masuk');
    const tanpa = c.batasArusKas().max;
    expect(tanpa).toBeLessThan(dengan);
  }));

  it('opsinya benar-benar menyebutkan min dan max', fakeAsync(() => {
    // Tanpa ini, `batasArusKas` dapat benar sementara grafiknya tetap
    // menyesuaikan sendiri — dan tidak ada yang terlihat salah di kode.
    const c = buat();
    tick();
    spyOn(c, 'titikArusKas').and.returnValue(titik(20));
    const y: any = c.opsiArusKas().scales.y;
    expect(y.max).toBe(c.batasArusKas().max);
    expect(y.min).toBe(c.batasArusKas().min);
  }));
});
