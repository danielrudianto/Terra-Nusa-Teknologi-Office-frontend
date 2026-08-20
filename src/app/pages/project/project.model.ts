/**
 * Bentuk data proyek sebagaimana dikembalikan `GET /projects`.
 *
 * `contractValue` adalah jumlah seluruh baris kontrak yang belum dihapus;
 * nilainya dihitung di server, bukan di layar, karena daftarnya berpaginasi.
 */
export interface Project {
  id: number;
  code: string;
  name: string;
  clientID?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  isActive: boolean;
  isCancelled: boolean;
  isRetention?: boolean;
  /** Nominal dokumen (DPP + PPN), untuk ditampilkan. */
  contractValue: number;
  /** Dasar pengenaan pajak, untuk menghitung margin. */
  contractDpp: number;
  contractCount: number;
}

/** Satu baris kontrak: SPK awal maupun adendum. */
export interface ProjectContract {
  id: number;
  projectID: number;
  documentNumber: string;
  documentType: 'spk' | 'adendum';
  /** Dasar pengenaan pajak; inilah yang dipakai menghitung margin. */
  dpp: number;
  /** Persen. */
  ppn: number;
  pphCode?: string | null;
  pphTaxObject?: string | null;
  pphPercentage?: number | null;
  /** Nominal dokumen: DPP + PPN. Dihitung server. */
  value: number;
  date: string;
  description?: string | null;
}

/**
 * Empat keadaan proyek dinyatakan oleh tiga penanda. Diterjemahkan di satu
 * tempat ini supaya daftar, rincian, dan penyaring tidak pernah berbeda
 * cara membacanya.
 *
 * "Tunggu retensi" adalah masa antara BAST 1 dan BAST 2: pekerjaannya sudah
 * diserahkan, tetapi proyeknya BELUM selesai — masa pemeliharaan masih
 * berjalan, sebagian nilai kontrak masih ditahan, dan perbaikan yang timbul
 * masih dibebankan ke proyek ini. Karena itu ia tetap `isActive`.
 */
export type KeadaanProyek = 'berjalan' | 'retensi' | 'selesai' | 'batal';

export function keadaanProyek(p: {
  isActive: boolean;
  isCancelled: boolean;
  isRetention?: boolean;
}): KeadaanProyek {
  /*
   * Urutannya dari yang paling menentukan.
   *
   * `isCancelled` didahulukan: proyek batal tidak berubah artinya oleh
   * penanda apa pun di bawahnya. `isRetention` diperiksa sebelum `isActive`
   * karena keduanya menyala bersamaan — membaca `isActive` lebih dahulu
   * membuat proyek retensi terbaca "berjalan" dan penyaringnya tidak pernah
   * menemukan satu pun.
   */
  if (p.isCancelled) return 'batal';
  if (p.isRetention) return 'retensi';
  return p.isActive ? 'berjalan' : 'selesai';
}

/** Kunci i18n untuk sebuah keadaan. */
export function keadaanKey(k: KeadaanProyek): string {
  return `project.state.${k}`;
}
