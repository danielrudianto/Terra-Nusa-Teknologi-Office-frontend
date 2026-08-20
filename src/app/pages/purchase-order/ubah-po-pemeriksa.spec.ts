/**
 * Tombol "Ubah draf" muncul HANYA bagi yang benar-benar dapat memakainya.
 *
 * Keadaan yang mendorongnya: pemeriksa membuka dokumen, menemukan harga yang
 * keliru, lalu memberi tahu manajernya — dan manajer itu tidak dapat
 * membetulkannya sama sekali, sebab dokumennya bukan buatannya. Aturannya
 * kini melonggar: manajer boleh mengubah selama dokumennya BELUM diperiksa.
 *
 * Yang diuji di sini layarnya. Server tetap menjadi penjaganya
 * (`boleh_mengubah_purchase_order`), tetapi tombol yang muncul lalu ditolak
 * sesudah ditekan terbaca sebagai kerusakan — bukan sebagai aturan. Karena
 * itu keduanya harus berbunyi sama.
 */

import { PurchaseOrderViewComponent } from './purchase-order-view/purchase-order-view.component';

const SAYA = 7;
const ORANG_LAIN = 9;

/**
 * Dirakit dari prototipenya.
 *
 * Membuat komponennya utuh menuntut dialog, rute, dan API yang tidak satu pun
 * ikut menentukan aturan ini. `akun` dan `izin` disuntikkan lewat `inject()`
 * pada badan kelasnya, sehingga di sini ditaruh sendiri.
 */
function tampilan(
  level: number,
  dokumen: any,
  userId: number | null = SAYA,
): any {
  const c: any = Object.create(PurchaseOrderViewComponent.prototype);
  c.data = dokumen;
  c.akun = { userId };
  c.izin = { level: () => level };
  c.input = {};
  return c;
}

function po(tambahan: any = {}): any {
  return {
    id: 1,
    createdBy: ORANG_LAIN,
    isApproved: false,
    status: 'draft',
    isChecked: false,
    ...tambahan,
  };
}

describe('siapa yang melihat tombol ubah', () => {
  it('manajer melihatnya selama dokumennya belum diperiksa', () => {
    // Inilah yang sebelumnya tidak ada.
    expect(tampilan(3, po()).bolehUbah).toBeTrue();
  });

  it('manajer TIDAK melihatnya setelah dokumennya diperiksa', () => {
    /*
     * Menyunting dokumen yang sudah diperiksa mencabut pemeriksaan itu
     * diam-diam. Pencabutan yang tidak disadari membuat dokumen kembali ke
     * antrean tanpa ada yang tahu mengapa.
     */
    expect(tampilan(3, po({ isChecked: true })).bolehUbah).toBeFalse();
  });

  it('pembuatnya tetap melihatnya, diperiksa atau belum', () => {
    for (const diperiksa of [false, true]) {
      const c = tampilan(1, po({ createdBy: SAYA, isChecked: diperiksa }));
      expect(c.bolehUbah).withContext(String(diperiksa)).toBeTrue();
    }
  });

  it('level 4 ke atas melihatnya, diperiksa atau belum', () => {
    for (const level of [4, 5]) {
      for (const diperiksa of [false, true]) {
        const c = tampilan(level, po({ isChecked: diperiksa }));
        expect(c.bolehUbah).withContext(`${level}/${diperiksa}`).toBeTrue();
      }
    }
  });

  it('di bawah manajer tidak melihatnya sama sekali', () => {
    for (const level of [1, 2]) {
      expect(tampilan(level, po()).bolehUbah).withContext(String(level)).toBeFalse();
    }
  });

  it('dokumen yang SUDAH DISETUJUI tidak dapat diubah siapa pun', () => {
    // Lembar yang dipegang vendor tidak boleh berbeda dari yang tersimpan;
    // untuk itu jalurnya adendum.
    for (const level of [1, 3, 4, 5]) {
      const c = tampilan(level, po({ isApproved: true, status: 'approved' }));
      expect(c.bolehUbah).withContext(String(level)).toBeFalse();
    }
  });

  it('status "approved" tanpa isApproved tetap ditolak', () => {
    // Dokumen lama menyimpan salah satunya saja.
    expect(tampilan(5, po({ status: 'approved' })).bolehUbah).toBeFalse();
  });

  it('level yang belum terbaca tidak memberi apa pun', () => {
    /*
     * Layanan izin memuat datanya dari server; sebelum jawabannya tiba,
     * levelnya belum ada. Menganggapnya berwenang membuat tombolnya berkedip
     * muncul lalu hilang pada setiap pemuatan.
     */
    const c: any = Object.create(PurchaseOrderViewComponent.prototype);
    c.data = po();
    c.akun = { userId: SAYA };
    c.izin = { level: () => undefined };
    c.input = {};
    expect(c.bolehUbah).toBeFalse();
  });

  it('pratinjau tidak pernah menampilkannya', () => {
    // Dokumennya bahkan belum tersimpan; tidak ada yang dapat diubah.
    const c = tampilan(5, po());
    c.input = { data: po() };
    expect(c.bolehUbah).toBeFalse();
  });
});

describe('keterangan mengapa tombolnya hilang', () => {
  it('disebut ketika hilangnya karena sudah diperiksa', () => {
    /*
     * Tombol yang tadi ada lalu hilang tanpa keterangan terbaca sebagai
     * kerusakan — padahal keadaannya dapat ditindaklanjuti sendiri.
     */
    const c = tampilan(3, po({ isChecked: true }));
    expect(c.ubahTerhalangPemeriksaan).toBeTrue();
  });

  it('TIDAK disebut kepada yang memang tidak pernah berwenang', () => {
    // Bagi staf level 1, tombol itu tidak pernah ada. Menjelaskan
    // hilangnya hanya menambah keramaian tentang sesuatu yang bukan
    // pekerjaannya.
    expect(tampilan(1, po({ isChecked: true })).ubahTerhalangPemeriksaan).toBeFalse();
  });

  it('TIDAK disebut ketika tombolnya memang ada', () => {
    expect(tampilan(3, po()).ubahTerhalangPemeriksaan).toBeFalse();
    expect(tampilan(5, po({ isChecked: true })).ubahTerhalangPemeriksaan).toBeFalse();
  });

  it('TIDAK disebut pada dokumen yang sudah disetujui', () => {
    // Di sana sebabnya lain — dan jalan keluarnya adendum, bukan mencabut
    // pemeriksaan.
    const c = tampilan(3, po({ isApproved: true, status: 'approved', isChecked: true }));
    expect(c.ubahTerhalangPemeriksaan).toBeFalse();
  });
});
