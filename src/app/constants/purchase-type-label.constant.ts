export const PURCHASE_TYPE_LABELS: { [key: string]: string } = {
  // Office Expenses
  '5.1.1': 'Asset purchase',
  '5.1.2': 'Asset maintenance',
  '5.1.3': 'Prepaid rent expense',
  '5.1.4': 'Employee expense',
  '5.1.5': 'Logistic expense',
  '5.1.6': 'Document handling & Stationaries',
  '5.1.7': 'Utilities',
  '5.1.12': 'Software',

  // Tax
  '5.1.8.1': 'PPN',
  '5.1.8.2': 'PPh pasal 23 dan 4 ayat 2',
  '5.1.8.3': 'PPh pasal 21',
  '5.1.8.4': 'SPT Tahunan',
  '5.1.8.5': 'Annual tax report service',
  '5.1.8.6': 'Penalty',
  '5.1.8.7': 'Tax on interest',

  // Other Office
  '5.1.9': 'Administration fees',
  '5.1.14': 'Social and Community Expense',
  '5.1.10': 'Interests',
  '5.1.13': 'Penalty fees',
  '5.1.11': 'Rounding up',

  // Marketing
  '6.3.1': 'Advertising Expense',
  '6.3.2': 'Promotional Merchandise',

  // Legal
  '6.4.1': 'Legal Document (Akta, SBU)',
  '6.4.2': 'Insurances (Marine, CAR TPL, Surety Bond, etc.)',

  // Human Resources
  '6.5.1': 'Recruitment Expense',
  '6.5.2': 'Training Expense',

  // Project Expenses
  A: 'Transportation',
  B: 'Equipment rental',
  C: 'Fuel',
  D: 'Manpower',
  E: 'Coordination; Consumption; and Accomodation',
  F: 'Material',
  G: 'Project supporting equipment and supplies',

  // Subcontractor
  //
  // Dipisah menurut bentuk penyedianya karena perlakuan pajaknya berbeda:
  // badan usaha dipotong PPh pasal 23, perorangan pasal 21. Menyatukannya
  // membuat rekap pajak harus dipilah ulang secara manual.
  H1: 'Subcontractor (company)',
  H2: 'Subcontractor (individual)',
};

/**
 * Pola yang menerima SELURUH kode jenis pembelian yang dikenal aplikasi.
 *
 * DISUSUN DARI `PURCHASE_TYPE_LABELS`, bukan ditulis tangan.
 *
 * Sebelumnya polanya disalin ke empat formulir — buat pembelian, ubah
 * pembelian, buat draf, dan ubah draf jadi pembelian — dan keempatnya sudah
 * berselisih:
 *
 *   buat pembelian    : … 6.4.1, 6.4.2, 6.5.1
 *   ubah pembelian    : … 6.4.1
 *   buat draf         : … 6.4.1, 6.4.2
 *   ubah draf         : … 6.4.1
 *
 * Akibatnya pembelian asuransi (6.4.2) BISA dibuat, tetapi tidak bisa
 * disunting dan tidak bisa dijadikan pembelian dari draf. Tidak ada galat
 * yang menyebut sebabnya — isiannya sekadar merah, dan tombol berikutnya
 * mati.
 *
 * KEEMPATNYA JUGA TIDAK BENAR-BENAR MENYARING. Bentuk lamanya:
 *
 *   /^\A|B|C|D|…|6\.4\.1$/
 *
 * Tanpa tanda kurung, jangkarnya hanya mengikat cabang PERTAMA dan
 * TERAKHIR. Cabang di tengah bebas cocok di mana saja, sehingga "ABC",
 * "xxBxx", bahkan "6.9.9B" semuanya lolos. Yang dijaga selama ini praktis
 * tidak ada.
 *
 * Bentuk di bawah membungkusnya dalam satu grup, sehingga jangkarnya
 * berlaku untuk seluruh cabang — dan daftarnya tidak mungkin tertinggal
 * lagi, sebab ia dibaca dari satu-satunya tempat yang menyimpan kodenya.
 */
export const POLA_TIPE_PEMBELIAN = new RegExp(
  '^(' +
    Object.keys(PURCHASE_TYPE_LABELS)
      .map((k) => k.replace(/[.]/g, '\\.'))
      .join('|') +
    ')$',
);

/**
 * Jenis pembelian yang MEMANG TIDAK DIPOTONG PPh.
 *
 * Dipakai sebagai BAWAAN pada formulir, bukan sebagai kunci: kotak "Faktur
 * ini memang tidak dipotong PPh" tetap dapat dibuka kembali. Yang dihemat
 * satu langkah yang jawabannya sudah pasti; yang tidak diambil alih adalah
 * keputusannya.
 *
 *   6.4.2 — Asuransi. Jasa asuransi tidak termasuk objek pemotongan PPh
 *           pasal 23. Dikonfirmasi Daniel ke konsultan pajaknya,
 *           25 September 2026.
 *
 * Tanpa bawaan ini, tiap faktur asuransi berhenti di gerbang PPh: tombol
 * "Hitung total" mati, dan yang mengisinya tidak punya petunjuk bahwa yang
 * kurang justru pernyataan "tidak dipotong".
 *
 * Menambah kode ke sini berarti menyatakan sebuah aturan pajak. Sebutkan
 * sumbernya di komentar, seperti di atas.
 */
export const JENIS_TANPA_PPH: ReadonlySet<string> = new Set(['6.4.2']);

export const MASTER_ITEM_PURCHASE_TYPES: string[] = [
  'F',
  'G',
  'C',
  'B',
  'E',
  '5.1.1',
  '5.1.2',
  '5.1.6',
  '5.1.12',
  '6.3.1',
  '6.3.2',
  '6.5.1',
  '6.5.2',
];

/**
 * Kunci terjemahan untuk satu kode jenis PO.
 *
 * Titik pada kode (mis. "5.1.1") tidak bisa dipakai langsung sebagai kunci
 * i18n karena dianggap pemisah tingkat, sehingga diganti garis bawah.
 */
/**
 * Nama jenis PO menurut bahasa aplikasi.
 *
 * Ini yang seharusnya dipakai di layar. `PURCHASE_TYPE_LABELS` berisi teks
 * INGGRIS dan hanya cocok untuk tempat yang memang berbahasa Inggris —
 * memakainya di layar membuat aplikasi berbahasa Indonesia menampilkan
 * "Project supporting equipment and supplies".
 *
 * Konstanta tetap dipakai sebagai cadangan: bila suatu kode jenis belum
 * punya terjemahan, yang muncul teks Inggrisnya, bukan kunci mentah
 * seperti "poType.tG".
 *
 * @param t  TranslateService milik pemanggilnya
 */
export function purchaseTypeLabel(t: { instant(k: string): string }, code: string): string {
  if (!code) return '—';
  const kunci = purchaseTypeKey(code);
  const teks = t.instant(kunci);
  // `instant` mengembalikan kuncinya sendiri bila tidak ditemukan.
  if (teks && teks !== kunci) return teks;
  return PURCHASE_TYPE_LABELS[code] || code;
}

export function purchaseTypeKey(code: string): string {
  return `poType.t${String(code || '').replace(/\./g, '_')}`;
}

/** Kunci terjemahan untuk keterangan jenis PO. */
export function purchaseTypeDescKey(code: string): string {
  return `${purchaseTypeKey(code)}Desc`;
}
