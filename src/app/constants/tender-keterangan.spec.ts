import {
  KATEGORI_KETERANGAN,
  NILAI_KATEGORI,
  kategoriTerpakai,
  keteranganPada,
  labelKategori,
} from './tender-keterangan.constant';

/*
 * Keterangan pemasok yang dapat DIBANDINGKAN.
 *
 * Sebelum kategori ada, seluruh keterangan menumpuk di satu kotak teks bebas,
 * dan pada tabel perbandingan ia menjadi satu sel sepanjang paragraf per
 * pemasok. Yang membandingkan "uang muka 70% sebelum unit berangkat" dengan
 * "pelunasan setelah 200 jam" harus membaca dua paragraf utuh lebih dulu
 * untuk menemukan kalimat yang sebanding.
 *
 * Yang dijaga di sini dua hal, dan keduanya menentukan apakah tabelnya
 * berguna:
 *
 *   * baris hanya muncul untuk kategori yang BENAR-BENAR diisi — tabel penuh
 *     sel "—" membuat yang membacanya berhenti memperhatikan sel yang memang
 *     berisi;
 *
 *   * urutan barisnya TETAP, tidak mengikuti urutan pengisian — kalau tidak,
 *     dua tender yang sama isinya menampilkan barisnya dalam urutan berbeda,
 *     dan yang terbiasa membaca baris ketiga membaca hal yang salah.
 */

const PENAWARAN_A = {
  noteList: [
    { category: 'pembayaran' as const, content: 'Uang muka 70%' },
    { category: 'teknis' as const, content: 'Sumitomo 2016, 50 ton' },
  ],
};

const PENAWARAN_B = {
  noteList: [
    { category: 'teknis' as const, content: 'Sany SCC600, 60 ton, 2024' },
    { category: 'pembayaran' as const, content: 'Pelunasan setelah 200 jam' },
    { category: 'pembayaran' as const, content: 'Tanpa uang muka' },
  ],
};

const PENAWARAN_KOSONG = { noteList: [] };

describe('kategori keterangan penawaran', () => {
  it('hanya kategori yang benar-benar diisi yang muncul', () => {
    const dipakai = kategoriTerpakai([PENAWARAN_A, PENAWARAN_B]);
    expect(dipakai).toEqual(['pembayaran', 'teknis']);
    expect(dipakai).not.toContain('nonteknis');
    expect(dipakai).not.toContain('lainnya');
  });

  it('urutannya tetap, bukan mengikuti urutan pengisian', () => {
    // Penawaran B mengisi `teknis` lebih dulu; barisnya tetap pembayaran
    // dulu, sama seperti pada tender mana pun.
    expect(kategoriTerpakai([PENAWARAN_B])).toEqual(['pembayaran', 'teknis']);
  });

  it('keterangan yang isinya hanya spasi tidak menumbuhkan baris', () => {
    const q = { noteList: [{ category: 'lainnya' as const, content: '   ' }] };
    expect(kategoriTerpakai([q])).toEqual([]);
    expect(keteranganPada(q, 'lainnya')).toEqual([]);
  });

  it('satu kategori boleh berisi lebih dari satu keterangan', () => {
    expect(keteranganPada(PENAWARAN_B, 'pembayaran')).toEqual([
      'Pelunasan setelah 200 jam',
      'Tanpa uang muka',
    ]);
  });

  it('pemasok tanpa keterangan menjawab daftar kosong, bukan galat', () => {
    expect(keteranganPada(PENAWARAN_KOSONG, 'pembayaran')).toEqual([]);
    expect(keteranganPada(null, 'pembayaran')).toEqual([]);
    expect(keteranganPada(undefined, 'teknis')).toEqual([]);
    expect(kategoriTerpakai([])).toEqual([]);
  });

  it('setiap kategori punya kunci terjemahan, dan yang asing jatuh ke lain-lain', () => {
    for (const k of KATEGORI_KETERANGAN) {
      expect(k.label).toMatch(/^tender\./);
      expect(k.contoh).toMatch(/^tender\./);
      expect(labelKategori(k.value)).toBe(k.label);
    }
    // Kategori yang tidak dikenal tidak boleh membuat layar menampilkan
    // nama kuncinya sendiri kepada pemakai.
    expect(labelKategori('bbm')).toBe('tender.katLainnya');
  });

  it('daftar nilainya sama dengan yang diterima server', () => {
    // Server menolak kategori di luar daftarnya; salinan yang berselisih
    // membuat penyimpanan gagal dengan galat yang tidak menyebut sebabnya.
    expect([...NILAI_KATEGORI]).toEqual([
      'pembayaran',
      'teknis',
      'nonteknis',
      'lainnya',
    ]);
  });
});
