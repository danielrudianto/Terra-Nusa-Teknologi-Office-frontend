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
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isActive: boolean;
  isCancelled: boolean;
  contractValue: number;
  contractCount: number;
}

/** Satu baris kontrak: SPK awal maupun adendum. */
export interface ProjectContract {
  id: number;
  projectID: number;
  documentNumber: string;
  documentType: 'spk' | 'adendum';
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
