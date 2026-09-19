/*
 * STATUS "DIPERIKSA" — satu lencana, bukan draf plus lencana kedua.
 *
 * Dokumen yang sudah diperiksa dulu tampil sebagai "Draf" berwarna kuning,
 * dengan lencana "Diperiksa" di sebelahnya. Keduanya benar sendiri-sendiri,
 * tetapi dibaca bersama keduanya bertentangan — dan yang membuka daftar
 * harus memeriksa lencana kedua pada SETIAP baris untuk tahu mana yang
 * menunggu dirinya.
 *
 * Yang dijaga di sini: satu dokumen menghasilkan tepat SATU status, dan
 * status itu yang benar. Kekeliruan di sini tidak melempar apa pun — ia
 * hanya membuat kolom status menyebut tahap yang salah.
 */

import { PurchaseOrderListComponent } from './purchase-order-list/purchase-order-list.component';

/** `displayStatus` murni: dipanggil tanpa menyalakan komponennya. */
const status = (po: any): string =>
  (PurchaseOrderListComponent.prototype as any).displayStatus.call({}, po);

const kunci = (s: string): string =>
  (PurchaseOrderListComponent.prototype as any).statusKey.call({}, s);

describe('displayStatus', () => {
  it('belum diperiksa, belum disetujui -> draf', () => {
    expect(status({ isChecked: false, isApproved: false })).toBe('draft');
  });

  it('SUDAH diperiksa, belum disetujui -> diperiksa', () => {
    /*
     * Inilah perubahannya. Sebelumnya keadaan ini menghasilkan 'draft',
     * dan perbedaannya hanya terbaca dari lencana kedua.
     */
    expect(status({ isChecked: true, isApproved: false })).toBe('checked');
  });

  it('sudah disetujui -> disetujui, walau tanda periksanya ada', () => {
    /*
     * Persetujuan sudah mensyaratkan pemeriksaan, jadi menyebut "diperiksa"
     * pada dokumen yang sudah terbit tidak menambah keterangan apa pun —
     * dan ia akan menutupi keterangan yang benar-benar penting.
     */
    expect(status({ isChecked: true, isApproved: true })).toBe('approved');
  });

  it('dihapus mengalahkan semuanya', () => {
    expect(
      status({ isDelete: true, isChecked: true, isApproved: true }),
    ).toBe('deleted');
  });

  it('dokumen lama tanpa penanda apa pun tetap terbaca draf', () => {
    // Bukan `undefined`, dan bukan kosong: kolom status yang kosong pada
    // satu baris terbaca sebagai baris yang rusak.
    expect(status({})).toBe('draft');
  });
});

describe('statusKey', () => {
  it('"checked" punya kuncinya sendiri', () => {
    /*
     * Tanpa kunci tersendiri ia jatuh ke cabang bawaan dan tercetak
     * "Draf" — status barunya hilang tanpa satu pun galat, dan kolomnya
     * kembali seperti sebelum perubahan ini.
     */
    expect(kunci('checked')).toBe('purchaseOrder.statusDiperiksa');
  });

  it('status yang tidak dikenali jatuh ke draf, bukan kosong', () => {
    expect(kunci('entah')).toBe('status.draft');
  });
});
