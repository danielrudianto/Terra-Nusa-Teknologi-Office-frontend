/*
 * PILL 30/60/90 HARUS TERGAMBAR — DAN BAWAANNYA 30.
 *
 * Kendali jendela hanya digambar ketika titiknya LEBIH BANYAK daripada yang
 * muat (`jendelaDipakai`). Selama bawaannya `'auto'`, "yang muat" dihitung
 * dari lebar wadah: pada satuan harian `round(lebar / 22)`, dijepit 30..120.
 *
 * Di layar lebar angkanya menjadi seratus titik lebih — dan proyek yang
 * panjangnya kurang dari itu (empat bulan = ±115 hari; hampir semua proyek)
 * karena itu TIDAK PERNAH memunculkan chip 30/60/90 sama sekali. Tidak ada
 * galat: grafiknya menggambar seluruh proyek, dan kendalinya lenyap. Yang
 * dilaporkan: "pillnya kok diilangin".
 *
 * Bawaan harian karena itu 30, bukan `'auto'` — dan jendelanya mulai dari
 * UJUNG KANAN (yang terbaru), sebab yang membuka arus kas menanyakan posisi
 * kas sekarang.
 */

import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { ApiService } from 'src/app/services/api.service';
import { ProjectReportComponent } from './project-report.component';

describe('ProjectReport — jendela arus kas bawaan', () => {
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
    return TestBed.createComponent(ProjectReportComponent)
      .componentInstance as any;
  }

  function titik(n: number) {
    const hasil: any[] = [];
    for (let i = 0; i < n; i++) {
      hasil.push({
        bulan: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`,
        label: `T${i}`,
        masuk: 10,
        keluar: 5,
        saldo: 100 + i,
      });
    }
    return hasil;
  }

  it('bawaan satuan harian 30, bukan otomatis', fakeAsync(() => {
    const c = buat();
    tick();
    expect(c.satuanKas()).toBe('hari');
    expect(c.pilihanJendela()).toBe(30);
    expect(c.lebarJendela()).toBe(30);
  }));

  it('proyek 115 hari TETAP memunculkan kendali jendelanya', fakeAsync(() => {
    const c = buat();
    tick();
    spyOn(c, 'titikArusKas').and.returnValue(titik(115));
    // Inilah yang dulu gagal: dengan `'auto'` di layar lebar, lebarnya bisa
    // 115 atau lebih dan kendalinya tidak pernah digambar.
    expect(c.jendelaDipakai()).toBeTrue();
  }));

  it('chip yang ditawarkan tetap auto/30/60/90 pada harian', fakeAsync(() => {
    const c = buat();
    tick();
    expect(c.PILIHAN_JENDELA()).toEqual(['auto', 30, 60, 90]);
  }));

  it('mulai dari UJUNG KANAN — 30 titik terakhir', fakeAsync(() => {
    const c = buat();
    tick();
    const semua = titik(115);
    spyOn(c, 'titikArusKas').and.returnValue(semua);

    const tampil = c.titikTampil();
    expect(tampil.length).toBe(30);
    expect(tampil[tampil.length - 1].label).toBe('T114');
    expect(tampil[0].label).toBe('T85');
  }));

  it('ganti ke bulanan kembali ke otomatis, bukan terbawa 30', fakeAsync(() => {
    const c = buat();
    tick();
    c.gantiSatuanKas('bulan');
    // 30 BULAN lebih panjang daripada hampir semua proyek; menguncinya di
    // sana justru mematikan kendalinya — kebalikan dari yang diperbaiki.
    expect(c.pilihanJendela()).toBe('auto');
  }));

  it('kembali ke harian kembali ke 30', fakeAsync(() => {
    const c = buat();
    tick();
    c.gantiSatuanKas('bulan');
    c.gantiSatuanKas('hari');
    expect(c.pilihanJendela()).toBe(30);
  }));

  it('ganti satuan mengembalikan jendela ke ujung kanan', fakeAsync(() => {
    const c = buat();
    tick();
    c.geserKas.set(60);
    c.gantiSatuanKas('bulan');
    expect(c.geserKas()).toBe(0);
  }));

  it('memilih chip lain tetap berlaku dan kembali ke ujung', fakeAsync(() => {
    const c = buat();
    tick();
    spyOn(c, 'titikArusKas').and.returnValue(titik(115));
    c.geserKas.set(40);
    c.pilihJendela(90);
    expect(c.lebarJendela()).toBe(90);
    expect(c.geserKas()).toBe(0);
    expect(c.titikTampil().length).toBe(90);
  }));
});
