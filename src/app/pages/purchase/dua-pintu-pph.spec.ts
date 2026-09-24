import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { provideMomentDateAdapter } from '@angular/material-moment-adapter';

import { PurchaseCreateComponent } from './purchase-create/purchase-create.component';
import { PurchaseDraftConvertComponent } from '../purchase-draft/purchase-draft-convert/purchase-draft-convert.component';

/*
 * PEMBELIAN PUNYA DUA PINTU, DAN KEDUANYA HARUS DIJAGA SAMA.
 *
 * Layar pembelian bukan satu-satunya cara faktur masuk: konversi draf
 * membuat pembelian juga. Selama pintu kedua tidak dijaga, gerbang di pintu
 * pertama hanya memindahkan jalannya — draf yang dikonversi tetap terbit
 * dengan PPh yang belum diputuskan.
 *
 * Uji ini menjalankan pertanyaan yang SAMA pada kedua komponen, sehingga
 * pintu yang tertinggal tidak dapat lolos diam-diam.
 */
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
    ],
  });
  return TestBed.createComponent(Komponen).componentInstance as any;
}

const PINTU: [string, any][] = [
  ['layar pembelian', PurchaseCreateComponent],
  ['konversi draf', PurchaseDraftConvertComponent],
];

for (const [nama, Komponen] of PINTU) {
  describe(`gerbang PPh — ${nama}`, () => {
    it('tanpa kode dan tanpa pernyataan: langkah nilai TIDAK lolos', () => {
      const c = buat(Komponen);
      c.valueFormGroup.patchValue({ dpp: 1_000_000, ppn: 0, pbbkb: 0 });
      expect(c.pphBelumDiputuskan).toBeTrue();
      expect(c.isNumberValid).toBeFalse();
    });

    it('kode terpilih: lolos, dan tarif bukan nol tidak ditandai', () => {
      const c = buat(Komponen);
      c.valueFormGroup.patchValue({
        dpp: 1_000_000, ppn: 0, pbbkb: 0,
        pphCode: '21-100-09', pphTaxObject: 'Bukan pegawai', pphPercentage: 2.5,
      });
      expect(c.isNumberValid).toBeTrue();
      expect(c.pphNol).toBeFalse();
    });

    it('dinyatakan tanpa PPh: lolos', () => {
      const c = buat(Komponen);
      c.valueFormGroup.patchValue({ dpp: 1_000_000, ppn: 0, pbbkb: 0, tanpaPph: true });
      expect(c.isNumberValid).toBeTrue();
    });

    it('kode bertarif nol: ditandai, bukan didiamkan', () => {
      const c = buat(Komponen);
      c.valueFormGroup.patchValue({
        dpp: 1_000_000, ppn: 0, pbbkb: 0,
        pphCode: '21-100-35', pphTaxObject: 'Upah bulanan', pphPercentage: 0,
      });
      expect(c.pphNol).toBeTrue();
      expect(c.isNumberValid).toBeTrue();
    });

    it('BARANG tidak pernah terkunci, dan berganti ke jasa mencabutnya', () => {
      const c = buat(Komponen);
      c.ngOnInit();
      c.metaFormGroup.controls['documentType'].setValue('goods');
      c.valueFormGroup.patchValue({ dpp: 1_000_000, ppn: 11, pbbkb: 0 });
      expect(c.valueFormGroup.get('tanpaPph').value).toBeTrue();
      expect(c.isNumberValid).toBeTrue();

      c.metaFormGroup.controls['documentType'].setValue('other');
      expect(c.valueFormGroup.get('tanpaPph').value).toBeFalse();
      expect(c.pphBelumDiputuskan).toBeTrue();
    });

    it('penjagaan angka yang lama tetap berjalan', () => {
      const c = buat(Komponen);
      c.valueFormGroup.patchValue({ dpp: -1, ppn: 0, pbbkb: 0, tanpaPph: true });
      expect(c.isNumberValid).toBeFalse();
    });
  });
}
