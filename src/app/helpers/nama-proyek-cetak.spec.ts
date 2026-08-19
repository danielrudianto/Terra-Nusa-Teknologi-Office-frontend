/**
 * Nama proyek pada dokumen cetak.
 *
 * Dokumen menyimpan KODE proyek — empat sampai lima aksara seperti `BPBP` —
 * dan kode itu sudah tercetak di dalam nomor dokumennya sendiri
 * (`035-SPK-BPBP-D`). Mencetaknya lagi pada baris "Proyek:" membuat yang
 * menerima lembar ini membaca empat huruf yang sama dua kali.
 *
 * Yang dijaga di sini bukan tampilannya, melainkan sikapnya ketika petanya
 * TIDAK memuat kodenya. Itu keadaan yang wajar dan sering: dokumen lama
 * memuat proyek yang sudah dihapus, dan daftarnya boleh saja belum selesai
 * dimuat saat dokumen dicetak. Pada keadaan itu dokumen harus tetap
 * menyebutkan sesuatu.
 */

import {
  daftarkanNamaProyek,
  namaProyekCetak,
} from './purchase-order-shared.helper';

describe('namaProyekCetak', () => {
  afterEach(() => {
    // Petanya milik modul, bukan milik satu pengujian; dikosongkan lagi agar
    // urutan pengujian tidak menentukan hasilnya.
    daftarkanNamaProyek(new Map());
  });

  it('mengganti kode dengan nama panjangnya', () => {
    daftarkanNamaProyek(
      new Map([['BPBP', 'Bumi Parahyangan Bandung Padalarang']]),
    );
    expect(namaProyekCetak('BPBP')).toBe(
      'Bumi Parahyangan Bandung Padalarang',
    );
  });

  it('tidak peka besar-kecil huruf maupun spasi', () => {
    daftarkanNamaProyek(new Map([['BPBP', 'Bumi Parahyangan']]));
    expect(namaProyekCetak(' bpbp ')).toBe('Bumi Parahyangan');
  });

  it('kembali ke KODE bila proyeknya tidak dikenal', () => {
    // Dokumen lama memuat kode proyek yang sudah dihapus. Mencetak kodenya
    // masih terbaca; mencetak kosong menghilangkan keterangannya sama sekali.
    daftarkanNamaProyek(new Map([['BPBP', 'Bumi Parahyangan']]));
    expect(namaProyekCetak('LAMA')).toBe('LAMA');
  });

  it('kembali ke kode bila petanya belum terisi', () => {
    // Daftarnya gagal dimuat, atau dokumen dicetak sebelum pemuatan selesai.
    // Hasilnya harus sama persis dengan perilaku sebelum ada fitur ini.
    expect(namaProyekCetak('BPBP')).toBe('BPBP');
  });

  it('kode kosong tetap kosong, bukan menjadi tanda hubung', () => {
    // Pemanggilnya sendiri yang memutuskan lambang untuk isian kosong;
    // sebagian mencetak '—', sebagian menghilangkan barisnya.
    expect(namaProyekCetak('')).toBe('');
    expect(namaProyekCetak(null)).toBe('');
    expect(namaProyekCetak(undefined)).toBe('');
  });

  it('pendaftaran menggantikan isi sebelumnya, bukan menambah', () => {
    // Daftar yang disegarkan setelah proyek dihapus harus benar-benar
    // kehilangan entrinya — kalau tidak, proyek yang sudah tidak ada tetap
    // tercetak dengan nama panjangnya.
    daftarkanNamaProyek(new Map([['LAMA', 'Proyek Lama']]));
    daftarkanNamaProyek(new Map([['BARU', 'Proyek Baru']]));
    expect(namaProyekCetak('LAMA')).toBe('LAMA');
    expect(namaProyekCetak('BARU')).toBe('Proyek Baru');
  });
});

/**
 * Pemakaiannya pada dokumen yang sesungguhnya.
 *
 * Pengujian di atas menguji fungsinya; yang ini memastikan pembuat dokumen
 * BENAR-BENAR memanggilnya. Keduanya perlu: fungsi yang benar tetapi tidak
 * dipanggil menghasilkan dokumen yang persis sama seperti sebelumnya, dan
 * tidak ada satu pun pengujian yang gagal karenanya.
 */

import { buildPurchaseOrderDContent } from './purchase-order-d.helper';

/** Telusuri seluruh teks pada isi dokumen, sedalam apa pun bersarangnya. */
function semuaTeks(simpul: any, keluar: string[] = []): string[] {
  if (simpul === null || simpul === undefined) return keluar;
  if (typeof simpul === 'string') {
    keluar.push(simpul);
    return keluar;
  }
  if (Array.isArray(simpul)) {
    simpul.forEach((x) => semuaTeks(x, keluar));
    return keluar;
  }
  if (typeof simpul === 'object') {
    Object.values(simpul).forEach((x) => semuaTeks(x, keluar));
  }
  return keluar;
}

describe('baris proyek pada dokumen SPK', () => {
  afterEach(() => daftarkanNamaProyek(new Map()));

  const dokumen = () =>
    buildPurchaseOrderDContent({
      purchaseOrderName: '035-SPK-BPBP-D',
      projectName: 'BPBP',
      date: '2026-04-01',
      workerName: 'Budi',
      items: [],
      clauseContext: {},
    } as any);

  it('mencetak nama panjangnya, bukan kodenya', () => {
    daftarkanNamaProyek(
      new Map([['BPBP', 'Bumi Parahyangan Bandung Padalarang']]),
    );

    const teks = semuaTeks(dokumen());
    expect(
      teks.some((t) => t === 'Proyek: Bumi Parahyangan Bandung Padalarang'),
    ).toBeTrue();
    expect(teks.some((t) => t === 'Proyek: BPBP')).toBeFalse();
  });

  it('kodenya tetap tercetak di dalam nomor dokumen', () => {
    // Justru inilah sebabnya baris "Proyek:" tidak perlu mengulang kodenya.
    daftarkanNamaProyek(new Map([['BPBP', 'Bumi Parahyangan']]));
    const teks = semuaTeks(dokumen());
    expect(teks.some((t) => t.includes('035-SPK-BPBP-D'))).toBeTrue();
  });

  it('dokumen tetap menyebut proyeknya saat daftar belum dimuat', () => {
    const teks = semuaTeks(dokumen());
    expect(teks.some((t) => t === 'Proyek: BPBP')).toBeTrue();
  });
});
