/*
 * DUA CACAT YANG DITEMUKAN BERSAMAAN PADA PEMBELIAN ASURANSI (6.4.2).
 *
 * 1. POLA JENIS PEMBELIAN DISALIN KE EMPAT FORMULIR, DAN SUDAH BERSELISIH.
 *
 *    Buat pembelian menerima 6.4.2; ubah pembelian dan ubah-draf tidak.
 *    Jadi pembelian asuransi bisa DIBUAT tetapi tidak bisa disunting dan
 *    tidak bisa diterbitkan dari draf — tanpa satu pun pesan yang menyebut
 *    sebabnya; isiannya sekadar merah.
 *
 *    Polanya pun praktis tidak menyaring apa pun: tanpa tanda kurung,
 *    jangkar `^`/`$` hanya mengikat cabang pertama dan terakhir, sehingga
 *    "ABC" dan "xxBxx" ikut lolos.
 *
 * 2. TOTAL LAMA TETAP TERPAMPANG sesudah isiannya berubah. Yang menambahkan
 *    "Nilai lain" sepuluh setengah juta tetap melihat total hasil hitungan
 *    SEBELUM nilai itu masuk — dan bila tombol hitungnya sedang tidak dapat
 *    ditekan (PPh belum diputuskan), tidak ada petunjuk apa pun bahwa angka
 *    itu sudah basi.
 */

import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { provideMomentDateAdapter } from '@angular/material-moment-adapter';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { PurchaseCreateComponent } from './purchase-create/purchase-create.component';
import { PurchaseUpdateComponent } from './purchase-update/purchase-update.component';
import { PurchaseDraftCreateComponent } from '../purchase-draft/purchase-draft-create/purchase-draft-create.component';
import { PurchaseDraftConvertComponent } from '../purchase-draft/purchase-draft-convert/purchase-draft-convert.component';
import {
  JENIS_TANPA_PPH,
  POLA_TIPE_PEMBELIAN,
  PURCHASE_TYPE_LABELS,
} from 'src/app/constants/purchase-type-label.constant';

function buat(Komponen: any) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [TranslateModule.forRoot()],
    providers: [
      provideNoopAnimations(),
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      provideMomentDateAdapter(),
      // Layar "ubah draf" dibuka sebagai dialog; tanpa dua penyedia ini
      // pembuatannya gagal pada injeksi, bukan pada hal yang diuji.
      { provide: MAT_DIALOG_DATA, useValue: {} },
      { provide: MatDialogRef, useValue: { close: () => {} } },
    ],
  });
  return TestBed.createComponent(Komponen).componentInstance as any;
}

const FORMULIR: [string, any][] = [
  ['buat pembelian', PurchaseCreateComponent],
  ['ubah pembelian', PurchaseUpdateComponent],
  ['buat draf', PurchaseDraftCreateComponent],
  ['ubah draf jadi pembelian', PurchaseDraftConvertComponent],
];

describe('Pola jenis pembelian', () => {
  it('menerima SELURUH kode yang dikenal aplikasi', () => {
    for (const kode of Object.keys(PURCHASE_TYPE_LABELS)) {
      expect(POLA_TIPE_PEMBELIAN.test(kode))
        .withContext(`kode ${kode} ditolak`)
        .toBeTrue();
    }
  });

  it('6.4.2 (asuransi) diterima — inilah yang dulu ditolak', () => {
    expect(POLA_TIPE_PEMBELIAN.test('6.4.2')).toBeTrue();
  });

  it('MENOLAK yang bukan kode, termasuk yang dulu lolos', () => {
    // Tanpa tanda kurung, jangkarnya hanya mengikat cabang pertama dan
    // terakhir; semua ini dulu diterima.
    for (const bukan of ['ABC', 'xxBxx', '6.9.9', 'B ', '', '5.1', 'AA']) {
      expect(POLA_TIPE_PEMBELIAN.test(bukan))
        .withContext(`${JSON.stringify(bukan)} seharusnya ditolak`)
        .toBeFalse();
    }
  });

  for (const [nama, Komponen] of FORMULIR) {
    it(`${nama}: menerima 6.4.2`, () => {
      const c = buat(Komponen);
      const k = c.metaFormGroup.get('purchaseType');
      k.setValue('6.4.2');
      expect(k.valid).withContext('6.4.2 ditolak formulir ini').toBeTrue();
    });

    it(`${nama}: menolak kode karangan`, () => {
      const c = buat(Komponen);
      const k = c.metaFormGroup.get('purchaseType');
      k.setValue('ABC');
      expect(k.valid).toBeFalse();
    });
  }
});

describe('Total tidak boleh tertinggal basi', () => {
  for (const [nama, Komponen] of [
    ['buat pembelian', PurchaseCreateComponent],
    ['ubah draf jadi pembelian', PurchaseDraftConvertComponent],
  ] as [string, any][]) {
    it(`${nama}: mengubah nilai MENGOSONGKAN total yang lama`, () => {
      const c = buat(Komponen);
      /*
       * Layar "ubah draf" memasang langganan nilainya di `ngOnInit`, bukan
       * di konstruktor — tanpa memanggilnya, yang diuji hanyalah komponen
       * yang belum hidup.
       *
       * Dua pengambilan data di awal `ngOnInit` dimatikan: keduanya
       * menembak jaringan dan membaca parameter rute, dan bila salah satunya
       * melempar, langganan di bawahnya tidak pernah terpasang — ujinya
       * lalu gagal karena harness-nya, bukan karena yang sedang diuji.
       */
      c.fetchBankAccounts = () => {};
      c.fetchPurchaseDraft = () => {};
      c.ngOnInit?.();
      // Langganan nilainya dipasang di `ngAfterViewInit`, BUKAN `ngOnInit`
      // — beda dari layar pembelian, dan itu sebabnya memanggil `ngOnInit`
      // saja tidak cukup.
      c.ngAfterViewInit?.();
      c.valueFormGroup.patchValue({ dpp: 60000, ppn: 0, pbbkb: 0, otherValue: 0 });
      c.calculateTotal();
      expect(Number(c.valueFormGroup.get('total').value)).toBe(60000);
      expect(c.isFinal).toBeTrue();

      // Pemakai menambahkan "Nilai lain" — total lamanya harus hilang,
      // bukan tertinggal sebagai angka yang tampak sah.
      c.valueFormGroup.get('otherValue').setValue(10_500_000);
      expect(c.isFinal).withContext('masih dianggap final').toBeFalse();
      expect(c.valueFormGroup.get('total').value)
        .withContext('total lama masih terpampang')
        .toBe('');
    });

    it(`${nama}: menghitung ulang memasukkan Nilai lain`, () => {
      const c = buat(Komponen);
      c.valueFormGroup.patchValue({
        dpp: 60000,
        ppn: 0,
        pbbkb: 0,
        otherValue: 10_500_000,
      });
      c.calculateTotal();
      expect(Number(c.valueFormGroup.get('total').value)).toBe(10_560_000);
    });
  }
});

/*
 * ASURANSI TIDAK DIPOTONG PPh — dikonfirmasi Daniel ke konsultan pajaknya,
 * 25 September 2026.
 *
 * Tanpa bawaan ini, tiap faktur asuransi berhenti di gerbang PPh: tombol
 * "Hitung total" mati, dan yang mengisinya tidak punya petunjuk bahwa yang
 * kurang justru pernyataan "memang tidak dipotong". Itulah yang dilaporkan.
 */
describe('Jenis yang memang tidak dipotong PPh', () => {
  it('daftarnya memuat asuransi, dan tidak memuat jasa biasa', () => {
    expect(JENIS_TANPA_PPH.has('6.4.2')).toBeTrue();
    // Subkontraktor dan sewa alat JELAS dipotong; keduanya tidak boleh
    // ikut terbebas hanya karena daftarnya kebablasan.
    for (const dipotong of ['H1', 'H2', 'B', 'D', '6.4.1']) {
      expect(JENIS_TANPA_PPH.has(dipotong))
        .withContext(`${dipotong} seharusnya TETAP dipotong`)
        .toBeFalse();
    }
  });

  for (const [nama, Komponen] of [
    ['buat pembelian', PurchaseCreateComponent],
    ['ubah draf jadi pembelian', PurchaseDraftConvertComponent],
  ] as [string, any][]) {
    it(`${nama}: nomor SPK asuransi menyalakan "tanpa PPh"`, () => {
      const c = buat(Komponen);
      c.fetchBankAccounts = () => {};
      c.fetchPurchaseDraft = () => {};
      c.ngOnInit?.();
      c.ngAfterViewInit?.();

      c.metaFormGroup.get('purchaseOrderName').setValue('139-SPK-R501-6.4.2');
      expect(c.metaFormGroup.get('purchaseType').value).toBe('6.4.2');
      expect(c.valueFormGroup.get('tanpaPph').value)
        .withContext('gerbang PPh masih menahan faktur asuransi')
        .toBeTrue();
      // Gerbangnya harus benar-benar terbuka, bukan sekadar centangnya
      // berubah.
      expect(c.pphBelumDiputuskan).toBeFalse();
    });

    it(`${nama}: jenis lain TIDAK ikut dibebaskan`, () => {
      const c = buat(Komponen);
      c.fetchBankAccounts = () => {};
      c.fetchPurchaseDraft = () => {};
      c.ngOnInit?.();
      c.ngAfterViewInit?.();

      c.metaFormGroup.get('purchaseOrderName').setValue('139-SPK-R501-H1');
      expect(c.metaFormGroup.get('purchaseType').value).toBe('H1');
      expect(c.valueFormGroup.get('tanpaPph').value).toBeFalse();
      expect(c.pphBelumDiputuskan)
        .withContext('subkontraktor lolos tanpa kode PPh')
        .toBeTrue();
    });
  }
});
