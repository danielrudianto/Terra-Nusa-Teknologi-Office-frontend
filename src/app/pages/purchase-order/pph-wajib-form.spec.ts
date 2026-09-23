import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { provideMomentDateAdapter } from '@angular/material-moment-adapter';

import { PurchaseOrderCreateDComponent } from './purchase-order-create/purchase-order-create-d/purchase-order-create-d.component';
import { PurchaseOrderCreateAComponent } from './purchase-order-create/purchase-order-create-a/purchase-order-create-a.component';
import { PurchaseOrderCreateBComponent } from './purchase-order-create/purchase-order-create-b/purchase-order-create-b.component';

/*
 * PPh WAJIB DIPUTUSKAN pada SPK jasa.
 *
 * Seluruh SPK upah operator terbit tanpa PPh sama sekali — bukan sesekali,
 * melainkan semuanya — dan baru ketahuan saat CoP-nya dicetak dan tidak
 * memotong apa pun. Penyebabnya satu: isiannya boleh dilewati.
 *
 * Diuji pada formulirnya, bukan hanya pada validatornya: yang rusak di
 * produksi bukan fungsinya, melainkan fungsinya tidak dipasang.
 */
function siapkan() {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [TranslateModule.forRoot()],
    providers: [
      provideNoopAnimations(),
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      provideMomentDateAdapter(),
    ],
  });
}

const JENIS: Array<[string, any]> = [
  ['PO-D (upah)', PurchaseOrderCreateDComponent],
  ['PO-A (transportasi)', PurchaseOrderCreateAComponent],
  ['PO-B (sewa alat)', PurchaseOrderCreateBComponent],
];

describe('PPh wajib diputuskan pada formulir SPK', () => {
  for (const [nama, Komponen] of JENIS) {
    describe(nama, () => {
      it('tanpa kode dan tanpa pernyataan: formulir tidak sah', () => {
        siapkan();
        const f = TestBed.createComponent(Komponen);
        const c: any = f.componentInstance;
        expect(c.formGroup.errors?.['pphBelumDiputuskan']).toBeTrue();
        expect(c.pphBelumDiputuskan).toBeTrue();
      });

      it('kode terpilih: penjagaannya lepas', () => {
        siapkan();
        const f = TestBed.createComponent(Komponen);
        const c: any = f.componentInstance;
        c.formGroup.patchValue({
          pphCode: '21-100-03',
          pphTaxObject: 'Tenaga Kerja Lepas',
          pphPercentage: 2.5,
        });
        expect(c.pphBelumDiputuskan).toBeFalse();
        expect(c.pphNol).toBeFalse();
      });

      it('dinyatakan tanpa PPh: penjagaannya lepas', () => {
        siapkan();
        const f = TestBed.createComponent(Komponen);
        const c: any = f.componentInstance;
        c.formGroup.patchValue({ tanpaPph: true });
        expect(c.pphBelumDiputuskan).toBeFalse();
      });

      it('kode bertarif nol: ditandai, bukan didiamkan', () => {
        siapkan();
        const f = TestBed.createComponent(Komponen);
        const c: any = f.componentInstance;
        c.formGroup.patchValue({
          pphCode: '21-100-35',
          pphTaxObject: 'Upah Pegawai Tidak Tetap yang Dibayarkan secara Bulanan',
          pphPercentage: 0,
        });
        expect(c.pphNol).toBeTrue();
      });
    });
  }
});
