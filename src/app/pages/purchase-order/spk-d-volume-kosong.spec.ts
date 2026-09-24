/*
 * SPK D YANG VOLUMENYA DIKOSONGKAN — tampilan dialog purchase order.
 *
 * SPK tenaga kerja boleh terbit tanpa plafon volume: yang disepakati harga
 * satuannya, dan berapa harinya baru diketahui saat pekerjaannya berjalan.
 * Formulirnya menyimpan `quantity` nol untuk menyatakan itu.
 *
 * Dibaca apa adanya, dialognya menampilkan "0 jam × 10.000,00 → Rp 0,00"
 * dengan subtotal Rp 0 — dokumen yang sah tampil seolah tidak bernilai,
 * tepat sebelum tombol "Terbitkan Purchase Order" ditekan.
 *
 * Yang dijaga berkas ini bukan angka yang benar melainkan BATAS
 * penggantiannya. Menampilkan volume nol sebagai satu adalah menulis angka
 * yang tidak ada di basis data; begitu ia bocor ke jenis dokumen lain, yang
 * disembunyikan bukan lagi kesepakatan yang memang terbuka melainkan DATA
 * YANG KELIRU — volume nol pada SPK material adalah kesalahan isi, dan
 * "1 sak × 75.000" membuatnya tampak wajar.
 */

import { PurchaseOrderViewComponent } from './purchase-order-view/purchase-order-view.component';

function tampilan(data: any): any {
  const c: any = Object.create(PurchaseOrderViewComponent.prototype);
  c.data = data;
  Object.defineProperty(c, 'items', { value: data.items ?? [] });
  return c;
}

/** SPK D seperti pada layar yang dikeluhkan: lembur + upah harian. */
function spkD(items: any[]): any {
  return { purchaseType: 'D', ppn: 0, pphPercentage: 0, items };
}

describe('SPK D — volume dikosongkan', () => {
  it('volume nol DITAMPILKAN sebagai satu, dan nilainya ikut', () => {
    const c = tampilan(
      spkD([
        { quantity: 0, unit: 'jam', price: 10_000 },
        { quantity: 0, unit: 'hari', price: 125_000 },
      ]),
    );
    expect(c.volumeTampil(c.items[0])).toBe(1);
    expect(c.lineTotal(c.items[0])).toBe(10_000);
    expect(c.lineTotal(c.items[1])).toBe(125_000);
    // Subtotalnya ikut — dokumennya tidak lagi terbaca Rp 0.
    expect(c.subTotal).toBe(135_000);
  });

  it('volume yang SUNGGUH diisi tidak disentuh', () => {
    const c = tampilan(spkD([{ quantity: 3, unit: 'hari', price: 125_000 }]));
    expect(c.tanpaPagu(c.items[0])).toBeFalse();
    expect(c.volumeTampil(c.items[0])).toBe(3);
    expect(c.lineTotal(c.items[0])).toBe(375_000);
  });

  it('baris lama bervolume null ikut terbaca sebagai dikosongkan', () => {
    const c = tampilan(spkD([{ quantity: null, unit: 'jam', price: 10_000 }]));
    expect(c.tanpaPagu(c.items[0])).toBeTrue();
    expect(c.volumeTampil(c.items[0])).toBe(1);
  });

  it('volume nol DAN harga nol tetap nol', () => {
    /*
     * Baris seperti ini tidak menyatakan tarif apa pun. "1 jam × 0" tidak
     * menerangkan apa-apa, dan menampilkannya hanya menyamarkan baris yang
     * memang belum diisi sebagai baris yang sudah.
     */
    const c = tampilan(spkD([{ quantity: 0, unit: 'jam', price: 0 }]));
    expect(c.tanpaPagu(c.items[0])).toBeFalse();
    expect(c.volumeTampil(c.items[0])).toBe(0);
    expect(c.lineTotal(c.items[0])).toBe(0);
  });

  it('JENIS LAIN tidak ikut — volume nol di sana adalah data keliru', () => {
    // Penjaga terpenting di berkas ini.
    for (const jenis of ['A', 'B', 'C', 'F', 'G', 'H', '511', '5112', '641']) {
      const c = tampilan({
        purchaseType: jenis,
        ppn: 0,
        pphPercentage: 0,
        items: [{ quantity: 0, unit: 'sak', price: 75_000 }],
      });
      expect(c.tanpaPagu(c.items[0])).withContext(jenis).toBeFalse();
      expect(c.volumeTampil(c.items[0])).withContext(jenis).toBe(0);
      expect(c.lineTotal(c.items[0])).withContext(jenis).toBe(0);
    }
  });

  it('dokumen borongan tetap memakai nilai borongannya', () => {
    /*
     * Hari ini borongan hanya ada pada PO-H sehingga keduanya tidak
     * berpapasan — tetapi bila suatu saat berpapasan, nilai yang TERTULIS
     * di dokumen harus menang atas tarif yang disimpulkan layar.
     */
    const c = tampilan({
      purchaseType: 'D',
      ppn: 0,
      pphPercentage: 0,
      customData: { rateType: 'lumpsum', lumpSumPrice: 512_500 },
      items: [{ quantity: 0, unit: 'ls', price: 10_000 }],
    });
    expect(c.lineTotal(c.items[0])).toBe(512_500);
    expect(c.subTotal).toBe(512_500);
  });
});
