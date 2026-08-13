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
 * Tiga keadaan proyek dinyatakan oleh dua penanda. Diterjemahkan di satu
 * tempat ini supaya daftar, rincian, dan penyaring tidak pernah berbeda
 * cara membacanya.
 */
export type KeadaanProyek = 'berjalan' | 'selesai' | 'batal';

export function keadaanProyek(p: {
  isActive: boolean;
  isCancelled: boolean;
}): KeadaanProyek {
  if (p.isCancelled) return 'batal';
  return p.isActive ? 'berjalan' : 'selesai';
}

/** Kunci i18n untuk sebuah keadaan. */
export function keadaanKey(k: KeadaanProyek): string {
  return `project.state.${k}`;
}
