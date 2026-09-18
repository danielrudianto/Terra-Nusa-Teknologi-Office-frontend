/*
 * SPK D HARGA SATUAN pada layar pembuatan CoP.
 *
 * SPK D tidak menyepakati volume — yang disepakati harga satuannya. Baris
 * seperti itu bersisa NOL, dan layar ini punya DUA aturan yang membaca sisa:
 *
 *   1. `bangunKontrol()` MEMATIKAN kotak isian bila sisanya habis;
 *   2. `melebihi()` menandai merah dan menutup tombol simpan.
 *
 * Yang pertama lebih buruk daripada yang kedua: kotaknya sekadar tidak dapat
 * diketik, tanpa satu pun pesan yang menjelaskan mengapa. Yang membuat CoP
 * melihat baris pekerjaan yang benar dengan kotak yang mati, dan tidak ada
 * apa pun di layar yang menyebutkan sebabnya.
 *
 * Servernya sendiri MENERIMA volume itu. Jadi yang menghalangi hanya layar.
 */

import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

import { CertificateOfPaymentCreateComponent } from './certificate-of-payment-create.component';
import { CertificateOfPaymentService } from 'src/app/services/certificate-of-payment.service';
import { ServerMessageService } from 'src/app/services/server-message.service';
import { PermissionService } from 'src/app/services/permission.service';

function komponen(): any {
  TestBed.configureTestingModule({
    providers: [
      { provide: CertificateOfPaymentService, useValue: {} },
      { provide: Router, useValue: { navigate: () => {} } },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            paramMap: { get: () => null },
            queryParamMap: { get: () => null },
          },
        },
      },
      { provide: MatSnackBar, useValue: { open: () => {} } },
      { provide: MatDialog, useValue: {} },
      { provide: TranslateService, useValue: { instant: (k: string) => k } },
      { provide: ServerMessageService, useValue: { terjemahkan: () => 'x' } },
      { provide: PermissionService, useValue: { has: () => true } },
    ],
  });
  return TestBed.runInInjectionContext(
    () => new (CertificateOfPaymentCreateComponent as any)(),
  );
}

afterEach(() => TestBed.resetTestingModule());

function baris(id: number, sisa: number, tambahan: any = {}): any {
  return {
    purchaseOrderItemID: id,
    purchaseOrderID: 5,
    task: 'Operator Drilling Rig',
    unit: "m'",
    itemID: null,
    equipmentID: null,
    keterangan: null,
    pagu: sisa,
    terpakai: 0,
    sisa,
    ...tambahan,
  };
}

/** Pasang baris lalu bangun kontrolnya, seperti `muatPagu()` melakukannya. */
function pasang(c: any, daftar: any[]): void {
  c.baris.set(daftar);
  c.bangunKontrol();
}

describe('CoP atas SPK harga satuan', () => {
  it('kotak isian baris tanpa plafon TIDAK dimatikan', () => {
    const c = komponen();
    pasang(c, [baris(1, 0, { tanpaPagu: true })]);

    expect(c.kontrolVol(1).disabled)
      .withContext(
        'kotaknya mati tanpa satu pun pesan — SPK yang sah tidak dapat ' +
          'dibuatkan CoP, dan tidak ada apa pun di layar yang menjelaskan',
      )
      .toBeFalse();
  });

  it('baris berplafon yang sudah habis TETAP dimatikan', () => {
    /*
     * Yang dibuka hanya baris tanpa plafon. Membuka semuanya berarti
     * menghapus penjagaan pagu di seluruh jenis SPK.
     */
    const c = komponen();
    pasang(c, [baris(2, 0)]);

    expect(c.kontrolVol(2).disabled).toBeTrue();
  });

  it('volume berapa pun pada baris tanpa plafon tidak ditandai melebihi', () => {
    const c = komponen();
    pasang(c, [baris(1, 0, { tanpaPagu: true })]);
    c.kontrolVol(1).setValue('2000');

    expect(c.melebihi(c.baris()[0])).toBeFalse();
    expect(c.adaYangMelebihi).toBeFalse();
  });

  it('baris berplafon di SPK yang sama tetap ditandai', () => {
    /*
     * Satu SPK D punya keduanya: upah tanpa plafon, mobilisasi 2 kali.
     * Penandanya per BARIS — bila terbaca per dokumen, membuka yang satu
     * membuka yang lain diam-diam.
     */
    const c = komponen();
    pasang(c, [
      baris(1, 0, { tanpaPagu: true }),
      baris(2, 2, { task: 'Mobilisasi', unit: 'kali' }),
    ]);
    c.kontrolVol(1).setValue('2000');
    c.kontrolVol(2).setValue('3');

    expect(c.melebihi(c.baris()[0])).toBeFalse();
    expect(c.melebihi(c.baris()[1])).toBeTrue();
    expect(c.adaYangMelebihi).toBeTrue();
  });
});
