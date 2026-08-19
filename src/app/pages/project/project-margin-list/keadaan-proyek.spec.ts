/**
 * Daftar margin proyek: kapan angkanya boleh disembunyikan.
 *
 * Jawabannya TIDAK PERNAH.
 *
 * Sebelumnya baris proyek yang belum punya tagihan diciutkan menjadi satu sel
 * melintang bertuliskan "tanpa kontrak" — dan biaya yang sudah keluar ikut
 * hilang bersamanya. Dua keadaan yang biasa terjadi jadi tidak terbaca:
 *
 *   - pekerjaan dikerjakan lebih dulu atas permintaan pemilik, SPK-nya
 *     menyusul; pembeliannya berjalan, tagihannya nol;
 *   - kontraknya sudah terbit tetapi belum ada pembelian sama sekali.
 *
 * Keduanya sah. Yang keliru menyembunyikannya.
 *
 * Ada pula salah nama yang membuatnya lebih luas dari yang dimaksud:
 * `tanpaKontrak()` sebenarnya memeriksa TAGIHAN, bukan kontrak — sehingga
 * proyek yang sudah berkontrak tetapi belum ditagih pun ikut diciutkan.
 */

import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { ApiService } from '../../../services/api.service';
import { ProjectMarginListComponent } from './project-margin-list.component';

/*
 * Komponennya memakai `inject()`, bukan parameter konstruktor — sehingga
 * merakitnya dengan `new` di luar konteks suntikan melempar. `TestBed`
 * menyediakan konteks itu; layanannya cukup diganti benda kosong, sebab yang
 * diuji di sini perhitungan barisnya, bukan pemuatannya.
 */
function komponen(): any {
  TestBed.configureTestingModule({
    providers: [
      { provide: ApiService, useValue: { get: () => ({ subscribe: () => ({ add: () => {} }) }) } },
      { provide: Router, useValue: { navigate: () => {} } },
    ],
  });
  return TestBed.runInInjectionContext(
    () => new (ProjectMarginListComponent as any)(),
  );
}

afterEach(() => TestBed.resetTestingModule());

/** Satu baris seperti yang dikirim `/projects/margin-summary`. */
function baris(x: Partial<Record<string, unknown>> = {}): any {
  return {
    id: 1,
    code: 'R501',
    name: 'Proyek Uji',
    isActive: true,
    isCancelled: false,
    kontrak: 0,
    tertagih: 0,
    pembelian: 0,
    pembelianInternal: 0,
    draft: 0,
    reimbursement: 0,
    ...x,
  };
}

describe('keadaan baris margin proyek', () => {
  it('belum ada kontrak dibedakan dari belum ditagih', () => {
    const c = komponen();

    // Sudah berkontrak, belum ditagih — dikerjakan tetapi belum difakturkan.
    const berkontrak = baris({ kontrak: 500_000_000, tertagih: 0 });
    expect(c.tanpaKontrak(berkontrak)).toBeFalse();
    expect(c.belumTertagihSamaSekali(berkontrak)).toBeTrue();

    // Belum berkontrak tetapi sudah ada pembelian — SPK menyusul.
    const belumKontrak = baris({ kontrak: 0, pembelian: 75_000_000 });
    expect(c.tanpaKontrak(belumKontrak)).toBeTrue();
    expect(c.belumTertagihSamaSekali(belumKontrak)).toBeTrue();
  });

  it('biaya tetap terhitung meski belum ada kontrak', () => {
    /*
     * Inilah yang dulu hilang. Proyek tanpa kontrak yang sudah berbelanja
     * 75 juta tetap harus menunjukkan angka itu — di situlah uang perusahaan
     * sedang tertanam.
     */
    const c = komponen();
    const p = baris({ kontrak: 0, pembelian: 75_000_000, draft: 5_000_000 });

    expect(c.biaya(p)).toBeGreaterThan(0);
    expect(c.biaya(p)).toBe(80_000_000);
  });

  it('persentase tidak dapat dihitung tanpa tagihan', () => {
    // Dibedakan dari nol: nol berarti impas, ini berarti belum diketahui.
    const c = komponen();
    expect(c.persenTakTerhitung(baris({ tertagih: 0 }))).toBeTrue();
    expect(c.persenTakTerhitung(baris({ tertagih: 100_000_000 }))).toBeFalse();
  });

  it('margin proyek yang sudah ditagih tetap dihitung seperti biasa', () => {
    const c = komponen();
    const p = baris({
      kontrak: 500_000_000,
      tertagih: 200_000_000,
      pembelian: 150_000_000,
    });

    expect(c.margin(p)).toBe(50_000_000);
    expect(c.persen(p)).toBeCloseTo(25, 5);
  });

  it('belum tertagih = kontrak dikurangi yang sudah difakturkan', () => {
    const c = komponen();
    const p = baris({ kontrak: 500_000_000, tertagih: 200_000_000 });
    expect(c.belumTertagih(p)).toBe(300_000_000);
  });
});
