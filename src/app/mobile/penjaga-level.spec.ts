/**
 * Penjaga level mobile: ambang 3, KECUALI rute yang menyatakan lain.
 *
 * TIGA KEGAGALAN YANG TIDAK MENGHASILKAN GALAT
 *
 * 1. `route.firstChild` tidak terbaca saat penjaga jalan.
 *
 *    Penjaganya terpasang pada rute INDUK, sedangkan `levelMinimum` ada di
 *    rute ANAK. Bila pohonnya belum tersusun saat penjaga dievaluasi, yang
 *    terbaca ambang bawaan — dan engineering level 1 dipantulkan dari layar
 *    yang justru dibuat untuknya. Tidak ada galat, tidak ada pesan; layarnya
 *    sekadar tidak pernah terbuka. Uji ini memakai Router SUNGGUHAN, bukan
 *    objek tiruan, karena yang sedang diuji justru anggapan itu.
 *
 * 2. Ambangnya bocor ke rute lain.
 *
 *    Satu `levelMinimum: 1` yang terbaca untuk seluruh aplikasi membuka
 *    persetujuan dan penghapusan bagi level 1. Server tetap menolak — tetapi
 *    yang membukanya melihat layar penuh tombol yang semuanya gagal.
 *
 * 3. `/TidakBerhak` memantul tanpa henti.
 *
 *    Rute itu dulu TIDAK ADA: `/TidakBerhak` jatuh ke `**`, dialihkan ke
 *    `''`, penjaga jalan lagi, levelnya masih kurang, dipantulkan lagi ke
 *    `/TidakBerhak`. Layar putih yang berkedip, tanpa satu pun galat.
 */

import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Component } from '@angular/core';

import { PermissionService } from '../services/permission.service';
import {
  LEVEL_MINIMUM_MOBILE,
  bolehDrafPembelianMobile,
  levelGuard,
} from './penjaga-level';

@Component({ standalone: true, template: 'x' })
class Kosong {}

function siapkan(level: number) {
  TestBed.configureTestingModule({
    providers: [
      {
        provide: PermissionService,
        useValue: { load: async () => {}, level: () => level },
      },
      provideRouter([
        {
          path: 'TidakBerhak',
          component: Kosong,
        },
        {
          path: '',
          canActivate: [levelGuard],
          component: Kosong,
          children: [
            { path: '', component: Kosong },
            {
              path: 'Berita-acara',
              data: { levelMinimum: 1 },
              component: Kosong,
            },
            { path: 'Purchase-order', component: Kosong },
          ],
        },
        { path: '**', redirectTo: '' },
      ]),
    ],
  });
  return TestBed.inject(Router);
}

afterEach(() => TestBed.resetTestingModule());

describe('penjaga level mobile', () => {
  it('ambang bawaannya tetap 3', () => {
    expect(LEVEL_MINIMUM_MOBILE).toBe(3);
  });

  it('level 1 DAPAT membuka rute berita acara', async () => {
    const router = siapkan(1);

    await router.navigateByUrl('/Berita-acara');

    expect(router.url)
      .withContext(
        'engineering lapangan dipantulkan dari layar yang dibuat untuknya — ' +
          '`levelMinimum` pada rute anak tidak terbaca oleh penjaga di induk',
      )
      .toBe('/Berita-acara');
  });

  it('level 1 TIDAK dapat membuka rute lain', async () => {
    const router = siapkan(1);

    await router.navigateByUrl('/Purchase-order');

    expect(router.url)
      .withContext('ambang satu rute bocor ke seluruh aplikasi')
      .toBe('/TidakBerhak');
  });

  it('level 1 tidak dapat membuka beranda', async () => {
    const router = siapkan(1);

    await router.navigateByUrl('/');

    expect(router.url).toBe('/TidakBerhak');
  });

  it('level 3 dapat membuka semuanya', async () => {
    const router = siapkan(3);

    await router.navigateByUrl('/Purchase-order');
    expect(router.url).toBe('/Purchase-order');

    await router.navigateByUrl('/Berita-acara');
    expect(router.url).toBe('/Berita-acara');
  });

  it('`/TidakBerhak` BERHENTI di sana, tidak memantul', async () => {
    /*
     * Inilah putaran tak berujung yang diperbaiki. Bila rutenya tidak ada —
     * atau ikut dijaga penjaga yang menolaknya — navigasi ini berakhir di
     * tempat lain, atau tidak pernah berakhir sama sekali.
     */
    const router = siapkan(1);

    await router.navigateByUrl('/TidakBerhak');

    expect(router.url)
      .withContext('layar penolakan memantul kembali ke penjaganya')
      .toBe('/TidakBerhak');
  });
});

describe('bolehDrafPembelianMobile — level 5, atau level 3+ procurement', () => {
  const izin = (lv: number, dept: string[], bisa = true) =>
    ({
      level: () => lv,
      can: () => bisa,
      inDepartment: (...k: string[]) => k.some((x) => dept.includes(x)),
    }) as unknown as PermissionService;

  it('level 5 boleh, apa pun divisinya', () => {
    expect(bolehDrafPembelianMobile(izin(5, ['accounting']))).toBeTrue();
  });
  it('level 3 dan 4 procurement boleh', () => {
    expect(bolehDrafPembelianMobile(izin(3, ['procurement']))).toBeTrue();
    expect(bolehDrafPembelianMobile(izin(4, ['procurement']))).toBeTrue();
  });
  it('level 4 accounting dan level 2 procurement tidak', () => {
    expect(bolehDrafPembelianMobile(izin(4, ['accounting']))).toBeFalse();
    expect(bolehDrafPembelianMobile(izin(2, ['procurement']))).toBeFalse();
  });
  it('tanpa izin purchase_draft:create tidak, walau level 5', () => {
    expect(bolehDrafPembelianMobile(izin(5, ['procurement'], false))).toBeFalse();
  });
});
