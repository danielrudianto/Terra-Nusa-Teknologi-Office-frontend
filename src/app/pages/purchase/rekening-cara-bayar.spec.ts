/**
 * Isian rekening mengikuti CARA BAYARNYA.
 *
 * Cacat yang mendorongnya: formulir menanyakan nama bank dan nama rekening
 * LEBIH DAHULU, cara bayarnya di tengah, lalu nomor rekening di bawahnya.
 * Yang mengisinya diminta menyebutkan rekening tujuan sebelum menyatakan
 * bahwa uangnya memang dikirim ke rekening — dan bila jawabannya tunai,
 * ketiga isian itu tidak berarti apa-apa.
 *
 * Yang lebih buruk: ketiganya WAJIB, tanpa memandang cara bayarnya. Pembelian
 * tunai karena itu tidak dapat disimpan sama sekali tanpa mengarang nama bank
 * dan nomor rekening yang tidak pernah ada — dan karangan itu tersimpan
 * sebagai data.
 */

import { FormControl, FormGroup, Validators } from '@angular/forms';

import { PurchaseCreateComponent } from './purchase-create/purchase-create.component';
import {
  CARA_BAYAR_BERREKENING,
  PILIHAN_CARA_BAYAR,
} from '../../constants/pilihan-pembelian';

function komponen(cara: string): any {
  const c: any = Object.create(PurchaseCreateComponent.prototype);
  c.paymentFormGroup = new FormGroup({
    bankName: new FormControl('', Validators.required),
    bankAccountName: new FormControl('', Validators.required),
    bankAccountNumber: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[0-9]+$/),
    ]),
    paymentMethod: new FormControl(cara),
  });
  return c;
}

describe('cara bayar yang tersedia', () => {
  it('tunai TETAP ada', () => {
    /*
     * Menggantinya dengan cek/giro akan menghapus kemampuan mencatat
     * pembelian yang memang dibayar tunai — dan pembelian kecil di lapangan
     * memang begitu. Yang salah bukan pilihannya, melainkan isian rekening
     * yang tetap diminta.
     */
    const nilai = PILIHAN_CARA_BAYAR.map((o) => o.value);
    expect(nilai).toContain('cash');
  });

  it('cek dan giro DITAMBAHKAN, bukan menggantikan', () => {
    const nilai = PILIHAN_CARA_BAYAR.map((o) => o.value);
    expect(nilai).toContain('cek');
    expect(nilai).toContain('giro');
  });

  it('setiap pilihan punya keterangannya sendiri', () => {
    for (const o of PILIHAN_CARA_BAYAR) {
      expect(o.hint).withContext(String(o.value)).toBeTruthy();
      expect(o.hint).not.toBe(o.label);
    }
  });

  it('cek dan giro MEMERLUKAN rekening; tunai tidak', () => {
    // Keduanya ditarik ATAS sebuah rekening — itu sebabnya keduanya
    // sekelompok dengan transfer, bukan dengan tunai.
    expect(CARA_BAYAR_BERREKENING).toContain('cek');
    expect(CARA_BAYAR_BERREKENING).toContain('giro');
    expect(CARA_BAYAR_BERREKENING).not.toContain('cash');
  });
});

describe('isian rekening', () => {
  it('diminta pada transfer, VA, cek, dan giro', () => {
    for (const cara of CARA_BAYAR_BERREKENING) {
      expect(komponen(cara).perluRekening).withContext(cara).toBeTrue();
    }
  });

  it('TIDAK diminta pada tunai', () => {
    expect(komponen('cash').perluRekening).toBeFalse();
  });

  it('tetap ditampilkan sebelum cara bayarnya dipilih', () => {
    /*
     * Menyembunyikannya lebih dahulu membuat bagian pembayaran tampak kosong
     * saat formulir baru dibuka — dan yang membukanya menyangka isiannya
     * belum termuat.
     */
    expect(komponen('').perluRekening).toBeTrue();
  });
});

describe('syarat wajib mengikuti cara bayarnya', () => {
  it('tunai melepas ketiga syaratnya', () => {
    const c = komponen('cash');
    c['selaraskanRekening']();
    expect(c.paymentFormGroup.valid)
      .withContext('pembelian tunai harus dapat disimpan tanpa rekening')
      .toBeTrue();
  });

  it('tunai MENGOSONGKAN isian yang terlanjur terisi', () => {
    /*
     * Nilai yang tertinggal akan ikut tersimpan — dokumen tunai yang
     * menyebutkan rekening tujuan, tanpa ada yang pernah memilihnya.
     */
    const c = komponen('bank');
    c.paymentFormGroup.patchValue({
      bankName: 'BCA',
      bankAccountName: 'PT Uji',
      bankAccountNumber: '123',
    });
    c.paymentFormGroup.get('paymentMethod')!.setValue('cash');
    c['selaraskanRekening']();
    expect(c.paymentFormGroup.get('bankName')!.value).toBe('');
    expect(c.paymentFormGroup.get('bankAccountNumber')!.value).toBe('');
  });

  it('transfer tetap mewajibkan ketiganya', () => {
    const c = komponen('bank');
    c['selaraskanRekening']();
    expect(c.paymentFormGroup.valid).toBeFalse();

    c.paymentFormGroup.patchValue({
      bankName: 'BCA',
      bankAccountName: 'PT Uji',
      bankAccountNumber: '1234567890',
    });
    expect(c.paymentFormGroup.valid).toBeTrue();
  });

  it('nomor rekening tetap harus ANGKA pada cek dan giro', () => {
    // Syaratnya dipasang ulang, bukan sekadar dinyalakan — pola angkanya
    // ikut hilang bila yang dikembalikan hanya `required`.
    for (const cara of ['cek', 'giro']) {
      const c = komponen(cara);
      c['selaraskanRekening']();
      c.paymentFormGroup.patchValue({
        bankName: 'BCA',
        bankAccountName: 'PT Uji',
        bankAccountNumber: 'BUKAN-ANGKA',
      });
      expect(c.paymentFormGroup.valid).withContext(cara).toBeFalse();
    }
  });

  it('kembali ke transfer sesudah tunai mengembalikan syaratnya', () => {
    const c = komponen('cash');
    c['selaraskanRekening']();
    expect(c.paymentFormGroup.valid).toBeTrue();

    c.paymentFormGroup.get('paymentMethod')!.setValue('bank');
    c['selaraskanRekening']();
    expect(c.paymentFormGroup.valid)
      .withContext('rekeningnya sudah dikosongkan, jadi harus diisi lagi')
      .toBeFalse();
  });
});
