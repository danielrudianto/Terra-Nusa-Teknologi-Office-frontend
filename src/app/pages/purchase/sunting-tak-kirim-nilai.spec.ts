import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { provideMomentDateAdapter } from '@angular/material-moment-adapter';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';

import { PurchaseUpdateComponent } from './purchase-update/purchase-update.component';

/*
 * LAYAR SUNTING TIDAK MEMANTULKAN NILAI KEUANGAN KEMBALI KE SERVER.
 *
 * Seluruh kolom nilainya `readonly` di templat — layar ini memang tidak
 * menyuntingnya. Yang dikirimkan dulu hanyalah nilai yang baru saja dimuat,
 * dikembalikan apa adanya, dan itu membawa dua bahaya:
 *
 *   1. `pphCode == '' ? null : ...` — bila pemuatannya gagal atau kolomnya
 *      belum sempat terisi, memperbaiki NOMOR FAKTUR ikut menulis
 *      `pphCode = NULL` dan `pphPercentage = 0`.
 *   2. `update_purchase` membandingkan nilai kiriman dengan nilai tersimpan
 *      sebagai TEKS untuk menentukan perlu-tidaknya izin level 4 saat
 *      pembayarannya sudah ada. "2.5" lawan "2.50" sudah cukup untuk
 *      menolak penyuntingan nomor faktur dengan 409.
 *
 * Repository hanya menulis kolom yang ada di muatan, jadi tidak dikirim
 * berarti tidak diubah.
 */
const NILAI_TERLARANG = [
  'dpp', 'ppn', 'pbbkb', 'otherValue',
  'pphCode', 'pphTaxObject', 'pphPercentage',
];

describe('sunting pembelian: nilai keuangan tidak dikirim', () => {
  function buat() {
    const dikirim: any[] = [];
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        provideNoopAnimations(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideMomentDateAdapter(),
        { provide: MAT_DIALOG_DATA, useValue: { id: 1 } },
        { provide: MatDialogRef, useValue: { close: () => {} } },
      ],
    });
    const c = TestBed.createComponent(PurchaseUpdateComponent)
      .componentInstance as any;
    c.apiService = {
      put: (_u: string, body: any) => { dikirim.push(body); return of({}); },
      get: () => of({ data: [] }),
    };
    return { c, dikirim };
  }

  function isiSah(c: any) {
    // Spinner muat-awal masih menyala pada komponen yang baru dibuat, dan
    // `onSubmit()` memang menolak mengirim selama itu.
    c.memuat = false;
    c.metaFormGroup.patchValue({
      id: 1,
      invoiceName: 'INV-001',
      receiptName: '',
      taxInvoiceName: '',
      purchaseOrderName: '144-PO-R501-G',
      projectName: 'R501',
      purchaseType: 'G',
      supplierID: 3,
      supplierName: 'Sarana Teknik',
      supplierAddress: 'Padalarang',
      date: new Date('2026-09-23'),
      dueDate: new Date('2026-10-23'),
      lastStatus: 'ready',
      lastStatusDescription: '',
    });
    c.attachmentFormGroup.patchValue({
      isInvoiceAttached: true,
      isCopyPurchaseOrderAttached: true,
    });
    c.valueFormGroup.patchValue({
      dpp: 1_227_000, ppn: 0, pbbkb: 0,
      pphCode: '21-100-09', pphTaxObject: 'Bukan pegawai', pphPercentage: 2.5,
      otherValue: 0, otherValueNote: '',
    });
  }

  it('muatannya tidak memuat satu pun kolom nilai', () => {
    const { c, dikirim } = buat();
    isiSah(c);
    c.onSubmit();

    expect(dikirim.length).toBe(1);
    for (const k of NILAI_TERLARANG) {
      expect(Object.prototype.hasOwnProperty.call(dikirim[0], k))
        .withContext(k)
        .toBeFalse();
    }
  });

  it('yang benar-benar disunting TETAP dikirim', () => {
    // Penjagaan ini tidak boleh berubah menjadi "tidak mengirim apa pun".
    const { c, dikirim } = buat();
    isiSah(c);
    c.onSubmit();

    expect(dikirim[0].invoiceName).toBe('INV-001');
    expect(dikirim[0].purchaseOrderName).toBe('144-PO-R501-G');
    expect(Object.prototype.hasOwnProperty.call(dikirim[0], 'otherValueNote'))
      .toBeTrue();
  });

  it('kode PPh kosong pun tidak menulis NULL ke server', () => {
    // Inilah bentuk kebocorannya: pemuatan yang gagal meninggalkan kolomnya
    // kosong, lalu penyimpanan nomor faktur menghapus potongan pajaknya.
    const { c, dikirim } = buat();
    isiSah(c);
    c.valueFormGroup.patchValue({ pphCode: '', pphTaxObject: '', pphPercentage: 0 });
    c.onSubmit();

    expect(Object.prototype.hasOwnProperty.call(dikirim[0], 'pphCode')).toBeFalse();
    expect(Object.prototype.hasOwnProperty.call(dikirim[0], 'pphPercentage')).toBeFalse();
  });
});
