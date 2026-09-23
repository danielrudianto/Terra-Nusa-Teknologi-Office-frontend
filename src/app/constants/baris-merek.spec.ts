import { barisTampil } from './baris-tampil-po';
import { namaBarangCetak } from '../helpers/purchase-order-shared.helper';

/*
 * LAYAR HARUS MENYEBUT MEREK YANG SAMA DENGAN CETAKANNYA.
 *
 * `namaBarangCetak()` sudah lama menyusun `[SKU] - Deskripsi Ex. Merek`
 * untuk dokumen yang dicetak. Layar pemeriksaan tidak — sehingga yang
 * memeriksa melihat "Kabel NYM 2 x 2.5mm" saja, dan mereknya baru muncul
 * setelah dokumennya terbit, ketika membetulkannya sudah mahal.
 */
describe('Merek pada baris barang', () => {
  const barang = {
    item_id: 12,
    sku: 'NYM22_EXT',
    item_description: 'Kabel NYM 2 x 2.5mm',
    brand: 'Supreme',
    quantity: 50,
    price: 21500,
  };

  it('judulnya memuat merek; SKU tetap di rinciannya', () => {
    const t = barisTampil('G', barang);
    expect(t.judul).toBe('Kabel NYM 2 x 2.5mm Ex. Supreme');
    expect(t.rincian).toContain('NYM22_EXT');
  });

  it('merek yang tampil SAMA dengan yang dicetak', () => {
    // Cetakannya mengawali dengan [SKU]; yang diperiksa di sini bagian
    // yang menyatakan barangnya — deskripsi dan mereknya.
    const cetak = namaBarangCetak(
      { ...barang, description: barang.item_description },
      barang.item_description,
    );
    const ekor = Array.isArray(cetak) ? String(cetak[1]) : String(cetak);
    expect(ekor).toContain('Ex. Supreme');
    expect(barisTampil('G', barang).judul).toContain('Ex. Supreme');
  });

  it('tanpa merek: tidak ada "Ex." yang menggantung', () => {
    const t = barisTampil('G', { ...barang, brand: '' });
    expect(t.judul).toBe('Kabel NYM 2 x 2.5mm');
  });

  it('baris NON-KATALOG tidak diberi merek', () => {
    // Baris jasa/alat tidak punya `item_id`; merek yang menempel padanya
    // tidak berarti apa-apa. Aturannya sama dengan `namaBarangCetak()`.
    const t = barisTampil('G', {
      ...barang,
      item_id: null,
      task: 'Ongkos potong',
      brand: 'Supreme',
    });
    expect(t.judul).not.toContain('Ex.');
  });

  it('berlaku pada semua jenis dokumen barang', () => {
    for (const jenis of ['C', 'F', 'G', '511', '5112', '512', '516', '63']) {
      expect(barisTampil(jenis, barang).judul)
        .withContext(jenis)
        .toBe('Kabel NYM 2 x 2.5mm Ex. Supreme');
    }
  });
});
