/**
 * Premi yang dititipkan ikut terhitung sebagai nilai dokumennya.
 *
 * Pada SPK penutupan pertanggungan (6.4.2), yang berpindah tangan ada dua:
 * imbalan jasa broker — objek PPN dan PPh — dan premi yang dititipkan untuk
 * diteruskan kepada penanggung. Preminya sengaja TIDAK masuk DPP; ia hanya
 * lewat, dan memasukkannya ke dasar pajak menambah PPN atas uang orang lain.
 *
 * Akibat sampingannya yang tidak disengaja: seluruh layar yang menghitung
 * nilai dokumen dari DPP saja menampilkan ongkos pembuatan polisnya. Satu
 * dokumen yang nilainya Rp 5.002.109 tercatat Rp 35.000 di daftar, di
 * tampilannya, dan di rekap — dan ketiganya sepakat, sehingga tidak ada satu
 * pun angka yang terlihat ganjil.
 *
 * `otherValue` adalah kolom tempat premi itu disimpan.
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
import { PurchaseOrderViewComponent } from './purchase-order-view/purchase-order-view.component';

function daftar(): any {
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
      { provide: ApiService, useValue: { get: () => ({ subscribe: () => ({ add: () => {} }) }) } },
      { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => ({ subscribe: () => {} }) }) } },
      { provide: MatSnackBar, useValue: { open: () => {} } },
      { provide: TranslateService, useValue: { instant: (k: string) => k } },
      { provide: ServerMessageService, useValue: { terjemahkan: () => '' } },
      { provide: AccountService, useValue: { userId: 1, user: { id: 1, authenticationLevel: 5 } } },
      {
        provide: PermissionService,
        useValue: {
          level: () => 5,
          departments: () => [],
          inDepartment: () => false,
          can: () => true,
          loaded: () => true,
        },
      },
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

describe('daftar purchase order', () => {
  it('nilai dokumen memuat premi yang dititipkan', () => {
    // Angka dari keluhan vendor: jasa 35.000 tanpa PPN, premi 4.967.109.
    const c = daftar();
    expect(c.total({ dpp: 35_000, ppn: 0, otherValue: 4_967_109 })).toBe(5_002_109);
  });

  it('PPN tetap dihitung dari DPP saja', () => {
    /*
     * Penjaga terpenting di berkas ini. Premi bukan objek PPN — ia hanya
     * dititipkan. Menghitung PPN dari jumlah keduanya menambah pajak atas
     * uang yang cuma lewat, dan angkanya tampak wajar.
     */
    const c = daftar();
    // 10.000.000 + 1.100.000 + 50.000.000
    expect(c.total({ dpp: 10_000_000, ppn: 11, otherValue: 50_000_000 })).toBe(
      61_100_000,
    );
  });

  it('dokumen tanpa nilai lain tidak berubah sama sekali', () => {
    // Seluruh jenis purchase order lain memakai penghitung yang sama.
    const c = daftar();
    expect(c.total({ dpp: 10_000_000, ppn: 11 })).toBe(11_100_000);
    expect(c.total({ dpp: 10_000_000, ppn: 11, otherValue: null })).toBe(11_100_000);
  });
});

describe('tampilan purchase order', () => {
  /*
   * Dirakit dari prototipenya.
   *
   * Membuat komponennya utuh menuntut sepuluh layanan yang tidak satu pun
   * ikut menentukan angka-angka ini. `items` adalah GETTER pada kelasnya —
   * percobaan pertama menugaskannya langsung dan gagal dengan "has only a
   * getter", bukan karena aturannya salah.
   */
  function tampilan(data: any): any {
    const c: any = Object.create(PurchaseOrderViewComponent.prototype);
    c.data = data;
    Object.defineProperty(c, 'items', { value: data.items ?? [] });
    return c;
  }

  it('preminya ikut ke nilai akhir', () => {
    const c = tampilan({
      ppn: 0,
      pphPercentage: 0,
      otherValue: 4_967_109,
      items: [{ quantity: 1, price: 35_000 }],
    });
    expect(c.nilaiLain).toBe(4_967_109);
    expect(c.totalAkhir).toBe(5_002_109);
  });

  it('baris nilai akhir TAMPIL walau dokumennya tanpa pajak', () => {
    /*
     * Inilah yang membuat kekeliruannya bertahan: SPK penutupan
     * pertanggungan lewat broker sering tanpa PPN sama sekali, sehingga
     * syarat lama — "tampilkan bila ada pajak" — menyembunyikan satu-satunya
     * baris yang memuat preminya.
     */
    const c = tampilan({
      ppn: 0,
      pphPercentage: 0,
      otherValue: 4_967_109,
      items: [{ quantity: 1, price: 35_000 }],
    });
    expect(c.adaPajak).toBeFalse();
    expect(c.adaNilaiAkhir).toBeTrue();
  });

  it('dokumen tanpa pajak dan tanpa premi tetap tidak menampilkannya', () => {
    // Barisnya akan sama dengan subtotal di atasnya — hanya menambah baris.
    const c = tampilan({
      ppn: 0,
      pphPercentage: 0,
      items: [{ quantity: 1, price: 35_000 }],
    });
    expect(c.adaNilaiAkhir).toBeFalse();
  });

  it('PPh tetap dipotong dari DPP, bukan dari jumlah berikut preminya', () => {
    const c = tampilan({
      ppn: 0,
      pphPercentage: 2,
      otherValue: 50_000_000,
      items: [{ quantity: 1, price: 10_000_000 }],
    });
    expect(c.pphNilai).toBe(200_000);
    expect(c.totalAkhir).toBe(59_800_000);
  });
});
