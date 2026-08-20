/**
 * "Cabut pemeriksaan" tidak ditawarkan kepada yang pasti ditolak.
 *
 * Memberi centang adalah menyatakan "saya sudah membaca isinya dan isinya
 * benar" — pernyataan atas nama sendiri. MENCABUT centang orang lain
 * menghapus pernyataan orang lain, dan di sistem ini ia sekaligus
 * menggugurkan persetujuan yang terlanjur terbit: dokumennya kembali menjadi
 * draf.
 *
 * Sebelumnya menu ini terbuka bagi siapa pun yang berizin
 * `purchase_order:update` — artinya satu klik dapat membatalkan tanda tangan
 * seorang direktur tanpa dokumen itu berubah satu huruf pun.
 *
 * Servernya yang menentukan (`boleh_mencabut_pemeriksaan`). Yang diuji di
 * sini layarnya: tombol yang pasti ditolak tidak boleh disodorkan, sebab
 * penolakan sesudah ditekan terbaca sebagai kerusakan — bukan sebagai
 * aturan.
 */

import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';

import { AccountService } from '../../services/account.service';
import { ApiService } from '../../services/api.service';
import { PermissionService } from '../../services/permission.service';
import { ServerMessageService } from '../../services/server-message.service';
import { SettingsService } from '../../services/setting.service';
import { PurchaseOrderListComponent } from './purchase-order-list/purchase-order-list.component';

const SAYA = 7;
const ORANG_LAIN = 9;

function komponen(level: number, userId: number | null = SAYA): any {
  const akun = {
    userId,
    user: { id: userId, authenticationLevel: level },
  };
  const izin = {
    level: () => level,
    departments: () => ['procurement'],
    inDepartment: () => true,
    can: () => true,
    loaded: () => true,
  };

  TestBed.configureTestingModule({
    providers: [
      { provide: SettingsService, useValue: { pageSize: 10 } },
      { provide: Router, useValue: { navigate: () => {} } },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: { params: {}, queryParams: {} },
          queryParams: { subscribe: () => {} },
        },
      },
      {
        provide: ApiService,
        useValue: { get: () => ({ subscribe: () => ({ add: () => {} }) }) },
      },
      {
        provide: MatDialog,
        useValue: {
          open: () => ({ afterClosed: () => ({ subscribe: () => {} }) }),
        },
      },
      { provide: MatSnackBar, useValue: { open: () => {} } },
      { provide: TranslateService, useValue: { instant: (k: string) => k } },
      { provide: ServerMessageService, useValue: { terjemahkan: () => '' } },
      { provide: AccountService, useValue: akun },
      { provide: PermissionService, useValue: izin },
    ],
  });

  return TestBed.runInInjectionContext(
    () =>
      new (PurchaseOrderListComponent as any)(
        TestBed.inject(SettingsService),
        TestBed.inject(Router),
        TestBed.inject(ActivatedRoute),
        TestBed.inject(ApiService),
        TestBed.inject(MatDialog),
        TestBed.inject(MatSnackBar),
        TestBed.inject(TranslateService),
        TestBed.inject(ServerMessageService),
        TestBed.inject(AccountService),
        TestBed.inject(PermissionService),
      ),
  );
}

afterEach(() => TestBed.resetTestingModule());

function po(checkedBy: number | null): any {
  return { id: 1, name: 'PO-001', isChecked: true, checkedBy };
}

describe('cabut pemeriksaan', () => {
  it('pemeriksanya sendiri boleh menarik pernyataannya', () => {
    /*
     * Yang menemukan kekeliruan SESUDAH mencentang harus punya jalan
     * membetulkannya. Tanpa itu ia akan diam saja — dan diamnya lebih mahal
     * daripada pencabutannya.
     */
    const c = komponen(3);
    expect(c.bolehCabutPeriksa(po(SAYA))).toBeTrue();
  });

  it('pemeriksa lain selevel tidak boleh', () => {
    const c = komponen(3);
    expect(c.bolehCabutPeriksa(po(ORANG_LAIN))).toBeFalse();
  });

  it('level 4 boleh atas siapa pun', () => {
    // Kerap merekalah satu-satunya yang hadir ketika pemeriksanya cuti.
    const c = komponen(4);
    expect(c.bolehCabutPeriksa(po(ORANG_LAIN))).toBeTrue();
  });

  it('pemilik (level 5) boleh', () => {
    const c = komponen(5);
    expect(c.bolehCabutPeriksa(po(ORANG_LAIN))).toBeTrue();
  });

  it('tanpa id pengguna, dianggap bukan pemeriksanya', () => {
    /*
     * Bukan diloloskan. Bila ternyata memang pemeriksanya, server tetap
     * mengizinkan — yang hilang hanya satu tombol, dan itu jauh lebih murah
     * daripada menawarkan pencabutan kepada yang tidak berhak.
     */
    const c = komponen(3, null);
    expect(c.bolehCabutPeriksa(po(SAYA))).toBeFalse();
  });

  it('level yang tidak terbaca jatuh ke yang paling sedikit haknya', () => {
    const c = komponen(NaN as any, ORANG_LAIN);
    expect(c.bolehCabutPeriksa(po(SAYA))).toBeFalse();
  });

  it('dokumen tanpa pemeriksa tidak menjadikan siapa pun pemeriksanya', () => {
    /*
     * `Number(null)` adalah 0, dan `Number(undefined)` adalah NaN —
     * perbandingan yang ceroboh membuat salah satunya cocok dengan id
     * pengguna yang kebetulan bernilai sama.
     */
    const c = komponen(3);
    expect(c.bolehCabutPeriksa(po(null))).toBeFalse();
    expect(c.bolehCabutPeriksa({ id: 1, isChecked: true })).toBeFalse();
  });
});
