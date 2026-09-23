import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { provideMomentDateAdapter } from '@angular/material-moment-adapter';

import { PurchaseCreateComponent } from './purchase-create/purchase-create.component';

/*
 * GERBANG SEBENARNYA ADA DI PEMBELIAN, BUKAN DI SPK.
 *
 * Nilai PPh pada SPK hanya PREFILL — layar ini boleh menimpanya, dan
 * memang menimpanya. Datanya membuktikan dua arah sekaligus: ada SPK
 * bertarif 0% yang seluruh fakturnya dipotong 2,5%, dan ada SPK bertarif
 * 2,5% yang lima belas fakturnya tidak memotong sepeser pun.
 *
 * Karena itu membetulkan SPK saja tidak menutup apa pun. Uangnya bergerak
 * di layar ini, jadi di sinilah keputusannya diwajibkan.
 */
function buat() {
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
  return TestBed.createComponent(PurchaseCreateComponent).componentInstance as any;
}

describe('PPh wajib diputuskan pada pembelian', () => {
  it('tanpa kode dan tanpa pernyataan: langkah nilai TIDAK lolos', () => {
    const c = buat();
    c.valueFormGroup.patchValue({ dpp: 1_000_000, ppn: 0, pbbkb: 0 });
    expect(c.pphBelumDiputuskan).toBeTrue();
    expect(c.isNumberValid).toBeFalse();
  });

  it('kode terpilih: langkah nilai lolos', () => {
    const c = buat();
    c.valueFormGroup.patchValue({
      dpp: 1_000_000, ppn: 0, pbbkb: 0,
      pphCode: '21-100-09', pphTaxObject: 'Bukan pegawai', pphPercentage: 2.5,
    });
    expect(c.pphBelumDiputuskan).toBeFalse();
    expect(c.isNumberValid).toBeTrue();
    expect(c.pphNol).toBeFalse();
  });

  it('dinyatakan tanpa PPh: langkah nilai lolos', () => {
    // Pekerja di bawah batas memang tidak dipotong — fakturnya harus tetap
    // dapat terbit, asalkan ada yang menyatakannya.
    const c = buat();
    c.valueFormGroup.patchValue({ dpp: 1_000_000, ppn: 0, pbbkb: 0, tanpaPph: true });
    expect(c.pphBelumDiputuskan).toBeFalse();
    expect(c.isNumberValid).toBeTrue();
  });

  it('kode bertarif nol: ditandai, bukan didiamkan', () => {
    // `21-100-35` — kode yang dipakai 88 SPK dan tidak memotong apa pun.
    const c = buat();
    c.valueFormGroup.patchValue({
      dpp: 1_000_000, ppn: 0, pbbkb: 0,
      pphCode: '21-100-35', pphTaxObject: 'Upah bulanan', pphPercentage: 0,
    });
    expect(c.pphNol).toBeTrue();
    expect(c.isNumberValid).toBeTrue();
  });

  it('pembelian BARANG tidak pernah terkunci', () => {
    /*
     * Isian PPh-nya memang tidak ditampilkan pada jenis barang, jadi
     * tidak ada centang yang dapat dijangkau orangnya. Kalau pernyataannya
     * tidak dipasang sendiri oleh jenisnya, gerbang ini mengunci SETIAP
     * pembelian barang tanpa jalan keluar sama sekali.
     */
    const c = buat();
    c.ngOnInit();
    c.metaFormGroup.controls['documentType'].setValue('goods');
    c.valueFormGroup.patchValue({ dpp: 1_000_000, ppn: 11, pbbkb: 0 });
    expect(c.valueFormGroup.get('tanpaPph').value).toBeTrue();
    expect(c.pphBelumDiputuskan).toBeFalse();
    expect(c.isNumberValid).toBeTrue();
  });

  it('barang lalu JASA: pernyataannya dicabut kembali', () => {
    // Kalau tertinggal menyala, faktur jasa lolos tanpa kode — persis
    // kebocoran yang gerbang ini dipasang untuk menutupnya.
    const c = buat();
    c.ngOnInit();
    c.metaFormGroup.controls['documentType'].setValue('goods');
    expect(c.valueFormGroup.get('tanpaPph').value).toBeTrue();
    c.metaFormGroup.controls['documentType'].setValue('other');
    c.valueFormGroup.patchValue({ dpp: 1_000_000, ppn: 0, pbbkb: 0 });
    expect(c.valueFormGroup.get('tanpaPph').value).toBeFalse();
    expect(c.pphBelumDiputuskan).toBeTrue();
    expect(c.isNumberValid).toBeFalse();
  });

  it('angka tetap dijaga seperti sebelumnya', () => {
    // Penjagaan PPh DITAMBAHKAN, bukan menggantikan — dpp negatif tetap
    // menjatuhkan langkah nilai.
    const c = buat();
    c.valueFormGroup.patchValue({ dpp: -1, ppn: 0, pbbkb: 0, tanpaPph: true });
    expect(c.isNumberValid).toBeFalse();
  });
});
