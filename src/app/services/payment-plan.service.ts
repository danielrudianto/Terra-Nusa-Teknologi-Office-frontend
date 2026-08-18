import { Injectable, inject } from '@angular/core';

import { ApiService } from './api.service';

/** Pengelompokan pengeluaran. */
export type KategoriKeluar =
  | 'material'
  | 'subkon'
  | 'gaji'
  | 'operasional'
  | 'pajak'
  | 'utang'
  | 'lain';

/** Pengelompokan pemasukan. */
export type KategoriMasuk =
  | 'tagihan'
  | 'uangmuka'
  | 'retensi'
  | 'pinjaman'
  | 'lain';

export type KategoriRencana = KategoriKeluar | KategoriMasuk;

export type StatusRencana = 'rencana' | 'terpakai' | 'batal';

export interface RencanaPengeluaran {
  id?: number;
  date: string;
  amount: number;
  description: string;
  category?: KategoriRencana | null;
  projectName?: string | null;
  bankAccountID?: number | null;
  bankName?: string;
  notes?: string | null;
  status?: StatusRencana;
}

interface PilihanKategori {
  value: KategoriRencana;
  label: string;
  ikon: string;
}

/**
 * Kategori PENGELUARAN.
 *
 * Dikumpulkan di sini, bukan disalin ke setiap layar: kategori baru kelak
 * ditambahkan sekali, dan yang menampilkannya ikut sendiri.
 */
export const KATEGORI_KELUAR: PilihanKategori[] = [
  { value: 'material', label: 'rencana.katMaterial', ikon: 'inventory_2' },
  { value: 'subkon', label: 'rencana.katSubkon', ikon: 'engineering' },
  { value: 'gaji', label: 'rencana.katGaji', ikon: 'payments' },
  { value: 'operasional', label: 'rencana.katOperasional', ikon: 'store' },
  { value: 'pajak', label: 'rencana.katPajak', ikon: 'receipt_long' },
  /*
   * Tandingan dari `pinjaman` di sisi pemasukan.
   *
   * Uang yang masuk sebagai pencairan keluar lagi sebagai angsuran; tanpa
   * kategorinya sendiri ia tertimbun di "lain-lain" — padahal justru itu
   * yang perlu terlihat saat menilai apakah kasnya cukup.
   */
  { value: 'utang', label: 'rencana.katUtang', ikon: 'credit_score' },
  { value: 'lain', label: 'rencana.katLain', ikon: 'more_horiz' },
];

/**
 * Kategori PEMASUKAN — daftar yang berbeda sama sekali.
 *
 * Uang masuk tidak dibelanjakan untuk material atau gaji; ia DATANG dari
 * tagihan proyek, uang muka, atau retensi yang dicairkan. Memakai satu daftar
 * untuk keduanya membuat layar menawarkan "gaji" sebagai sumber pemasukan.
 */
export const KATEGORI_MASUK: PilihanKategori[] = [
  { value: 'tagihan', label: 'rencana.katTagihan', ikon: 'request_quote' },
  { value: 'uangmuka', label: 'rencana.katUangMuka', ikon: 'savings' },
  { value: 'retensi', label: 'rencana.katRetensi', ikon: 'lock_open' },
  { value: 'pinjaman', label: 'rencana.katPinjaman', ikon: 'account_balance' },
  { value: 'lain', label: 'rencana.katLain', ikon: 'more_horiz' },
];

/** Daftar yang berlaku bagi satu arah kas. */
export function kategoriUntuk(arah: string): PilihanKategori[] {
  return arah === 'masuk' ? KATEGORI_MASUK : KATEGORI_KELUAR;
}

/**
 * Cari satu kategori tanpa perlu tahu arahnya.
 *
 * Dipakai layar yang hanya MENAMPILKAN — daftar harian tidak menyimpan arah
 * pada tiap barisnya saat mencari ikonnya.
 */
export function cariKategori(
  value: string,
  arah?: string,
): PilihanKategori | undefined {
  const daftar = arah ? kategoriUntuk(arah) : [...KATEGORI_KELUAR, ...KATEGORI_MASUK];
  return daftar.find((k) => k.value === value);
}

@Injectable({ providedIn: 'root' })
export class PaymentPlanService {
  private readonly api = inject(ApiService);

  /**
   * Rencana dalam satu rentang tanggal.
   *
   * Rentangnya WAJIB — servernya menolak tanpa itu. Tanpa batas, kalender
   * yang membuka bulan mana pun menarik seluruh riwayat perencanaan.
   */
  rentang(awal: string, akhir: string, projectName = '') {
    return this.api.get('payment-plans', {
      awal,
      akhir,
      ...(projectName ? { projectName } : {}),
    });
  }

  ringkasan(awal: string, akhir: string) {
    return this.api.get('payment-plans/ringkasan', { awal, akhir });
  }

  buat(body: RencanaPengeluaran) {
    return this.api.post('payment-plans', body);
  }

  ubah(id: number, body: Partial<RencanaPengeluaran>) {
    return this.api.put(`payment-plans/${id}`, body);
  }

  hapus(id: number) {
    return this.api.delete(`payment-plans/${id}`);
  }

  /** Tandai sudah benar-benar dibayarkan. */
  tandaiTerpakai(id: number) {
    return this.api.put(`payment-plans/${id}`, { status: 'terpakai' });
  }

  batalkan(id: number) {
    return this.api.put(`payment-plans/${id}`, { status: 'batal' });
  }
}
