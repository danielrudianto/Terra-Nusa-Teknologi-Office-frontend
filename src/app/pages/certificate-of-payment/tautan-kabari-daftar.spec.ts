/*
 * MENAUTKAN PEMBELIAN HARUS MENGABARI DAFTAR DI BELAKANGNYA.
 *
 * Dialog lihat CoP menutup dengan `adaPerubahan`, dan daftar di belakangnya
 * memuat ulang HANYA bila nilai itu benar. Penandanya sudah dipasang pada
 * menyetujui BAP, membuat CoP, dan menyetujui CoP — tetapi penautan
 * pembelian datang belakangan dan tidak ikut memasangnya.
 *
 * Selama lencana daftar cuma mengenal "Disetujui", kelalaian itu tidak
 * terlihat: menautkan pembelian memang tidak mengubah apa pun di sana.
 * Begitu lencananya membedakan "Siap ditagih" dari "Sudah ditagih",
 * barisnya berhenti di "Siap ditagih" sesudah ditautkan — dan yang
 * menautkannya menyimpulkan tautannya gagal, lalu menautkannya lagi.
 *
 * `muat()` di dalam dialog TIDAK cukup dan tidak dapat menggantikannya: ia
 * memuat ulang isi dialog, bukan baris di daftar.
 */

import { of } from 'rxjs';

import { CertificateOfPaymentViewComponent } from './certificate-of-payment-view/certificate-of-payment-view.component';

/** Dirakit dari prototipenya — sepuluh layanan di konstruktornya tidak satu
 *  pun menentukan perilaku yang diuji di sini. */
function tampilan(over: any = {}): any {
  const c: any = Object.create(CertificateOfPaymentViewComponent.prototype);
  /*
   * `adaPerubahan` disetel TANGAN di sini.
   *
   * `Object.create` memasang prototipenya saja; penginisialisasi bidang
   * (`private adaPerubahan = false`) hanya berjalan lewat konstruktor. Tanpa
   * baris ini nilainya `undefined` — yang masih falsy, sehingga ujinya
   * tetap lulus, tetapi menguji keadaan yang tidak pernah ada di aplikasi.
   */
  c.adaPerubahan = false;
  c.dimuatUlang = 0;
  c.muat = () => {
    c.dimuatUlang++;
    return Promise.resolve();
  };
  c.cop = () => ({ id: 9, name: '001-911-R501-2026', netAmount: 935000 });
  c.tagihan = () => ({ pembelian: { id: 77, invoiceName: 'INV-9' } });
  c.pesan = () => {};
  c.ditutupDengan = undefined;
  c.dialogRef = { close: (v: any) => (c.ditutupDengan = v) };
  Object.assign(c, over);
  return c;
}

describe('Dialog CoP — penautan mengabari daftar', () => {
  it('menautkan pembelian menutup dialog dengan TRUE', () => {
    const c = tampilan({
      // Dialog pemilih pembelian menutup dengan `true` bila tautannya jadi.
      dialog: { open: () => ({ afterClosed: () => of(true) }) },
    });
    c.bukaTautan();

    expect(c.dimuatUlang).toBe(1); // isi dialognya sendiri ikut segar
    c.tutupDialog();
    expect(c.ditutupDengan).toBeTrue(); // <- inilah yang memuat ulang daftar
  });

  it('membatalkan pemilihan TIDAK mengabarkan apa-apa', () => {
    /*
     * Penjaga arah sebaliknya: menyetel penandanya tanpa syarat membuat
     * daftar memuat ulang setiap kali orang sekadar membuka lalu menutup
     * dialog pemilih — daftar berkedip tanpa ada yang berubah.
     */
    const c = tampilan({
      dialog: { open: () => ({ afterClosed: () => of(false) }) },
    });
    c.bukaTautan();

    expect(c.dimuatUlang).toBe(0);
    c.tutupDialog();
    expect(c.ditutupDengan).toBeFalse();
  });

  it('melepas tautan juga menutup dialog dengan TRUE', () => {
    const c = tampilan({
      tautanService: { lepas: () => of({}) },
    });
    c.lepasTautan();

    expect(c.dimuatUlang).toBe(1);
    c.tutupDialog();
    expect(c.ditutupDengan).toBeTrue();
  });

  it('melepas tautan yang GAGAL tidak mengabarkan perubahan', () => {
    const galat = { subscribe: (o: any) => o.error(new Error('gagal')) };
    const c = tampilan({ tautanService: { lepas: () => galat } });
    c.lepasTautan();

    expect(c.dimuatUlang).toBe(0);
    c.tutupDialog();
    expect(c.ditutupDengan).toBeFalse();
  });
});
