import { Injectable, inject } from '@angular/core';

import { ApiService } from './api.service';

/** Pengelompokan pengeluaran; dipakai ringkasan bulanan. */
export type KategoriRencana =
  | 'material'
  | 'subkon'
  | 'gaji'
  | 'operasional'
  | 'pajak'
  | 'lain';

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

/**
 * Kategori beserta ikonnya.
 *
 * Dikumpulkan di sini, bukan disalin ke setiap layar: kategori baru kelak
 * ditambahkan sekali, dan yang menampilkannya ikut sendiri.
 */
export const KATEGORI_RENCANA: Array<{
  value: KategoriRencana;
  label: string;
  ikon: string;
}> = [
  { value: 'material', label: 'rencana.katMaterial', ikon: 'inventory_2' },
  { value: 'subkon', label: 'rencana.katSubkon', ikon: 'engineering' },
  { value: 'gaji', label: 'rencana.katGaji', ikon: 'payments' },
  { value: 'operasional', label: 'rencana.katOperasional', ikon: 'store' },
  { value: 'pajak', label: 'rencana.katPajak', ikon: 'receipt_long' },
  { value: 'lain', label: 'rencana.katLain', ikon: 'more_horiz' },
];

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
