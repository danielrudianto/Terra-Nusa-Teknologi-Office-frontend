/**
 * Kategori keterangan pemasok pada penawaran tender.
 *
 * Sebelumnya keterangan pemasok satu kotak teks bebas, dan seluruhnya
 * menumpuk di dalamnya: syarat pembayaran, spesifikasi pengganti, ketentuan
 * mob-demob, masa berlaku penawaran. Pada tabel perbandingan ia menjadi satu
 * sel sepanjang paragraf per pemasok — dan justru di situlah perbandingan
 * yang paling menentukan seharusnya terjadi.
 *
 * Yang membandingkan "uang muka 70% sebelum unit berangkat" milik satu
 * pemasok dengan "pelunasan setelah 200 jam" milik pemasok lain harus membaca
 * dua paragraf utuh lebih dulu untuk menemukan kalimat yang sebanding.
 * Dengan kategori, keduanya berada pada BARIS YANG SAMA.
 *
 * Daftarnya TETAP, dan itu disengaja. Kategori yang boleh diketik sendiri
 * menghasilkan "Pembayaran" dan "pembayaran" sebagai dua baris terpisah pada
 * tabel yang seluruh gunanya justru menyejajarkan hal yang sama.
 *
 * Nilainya harus sama persis dengan `KATEGORI_KETERANGAN` di
 * `models/tender_model.py`; server menolak kategori di luar daftarnya.
 */

export type KategoriKeterangan =
  | 'pembayaran'
  | 'teknis'
  | 'nonteknis'
  | 'lainnya';

export interface PilihanKategori {
  value: KategoriKeterangan;
  /** Kunci terjemahan untuk nama kategorinya. */
  label: string;
  /** Kunci terjemahan untuk contoh isinya; dipakai sebagai placeholder. */
  contoh: string;
}

/**
 * Urutannya menentukan urutan baris pada tabel perbandingan.
 *
 * Pembayaran lebih dulu karena itu yang paling sering menentukan pilihan —
 * "lebih murah tetapi tunai" versus "beda tipis tetapi tempo 30 hari" adalah
 * perbandingan yang tidak dapat dijawab oleh harga saja.
 */
export const KATEGORI_KETERANGAN: readonly PilihanKategori[] = [
  {
    value: 'pembayaran',
    label: 'tender.katPembayaran',
    contoh: 'tender.katPembayaranContoh',
  },
  {
    value: 'teknis',
    label: 'tender.katTeknis',
    contoh: 'tender.katTeknisContoh',
  },
  {
    value: 'nonteknis',
    label: 'tender.katNonteknis',
    contoh: 'tender.katNonteknisContoh',
  },
  {
    value: 'lainnya',
    label: 'tender.katLainnya',
    contoh: 'tender.katLainnyaContoh',
  },
];

/** Nilai yang diterima server; dipakai menyaring muatan yang datang. */
export const NILAI_KATEGORI: readonly KategoriKeterangan[] =
  KATEGORI_KETERANGAN.map((k) => k.value);

export function labelKategori(nilai: string): string {
  return (
    KATEGORI_KETERANGAN.find((k) => k.value === nilai)?.label ??
    'tender.katLainnya'
  );
}

export interface KeteranganPenawaran {
  category: KategoriKeterangan;
  content: string;
  sortOrder?: number;
  /**
   * Berasal dari kolom teks bebas yang lama, belum dipilah ke kategori.
   *
   * Ditandai server. Layar memakainya untuk menyebutkan bahwa keterangan itu
   * belum berkategori — bukan untuk menyembunyikannya.
   */
  warisan?: boolean;
}

/**
 * Kategori yang BENAR-BENAR dipakai pada satu tender.
 *
 * Tabel perbandingan hanya menampilkan baris untuk kategori yang setidaknya
 * satu pemasok mengisinya. Menampilkan keempatnya selalu menambah tiga baris
 * kosong pada tender yang keterangannya cuma soal pembayaran — dan tabel yang
 * penuh sel "—" membuat yang membacanya berhenti memperhatikan sel yang
 * memang berisi.
 */
export function kategoriTerpakai(
  penawaran: ReadonlyArray<{ noteList?: KeteranganPenawaran[] | null }>,
): KategoriKeterangan[] {
  const ada = new Set<string>();
  for (const q of penawaran ?? []) {
    for (const k of q?.noteList ?? []) {
      if (String(k?.content ?? '').trim()) ada.add(k.category);
    }
  }
  return NILAI_KATEGORI.filter((v) => ada.has(v));
}

/** Seluruh keterangan satu pemasok pada satu kategori, sudah dirapikan. */
export function keteranganPada(
  penawaran: { noteList?: KeteranganPenawaran[] | null } | null | undefined,
  kategori: string,
): string[] {
  return (penawaran?.noteList ?? [])
    .filter((k) => k?.category === kategori)
    .map((k) => String(k.content ?? '').trim())
    .filter(Boolean);
}
