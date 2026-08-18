import { Injectable, inject } from '@angular/core';

import { ApiService } from './api.service';

/** Jenis tender; menentukan bentuk barisnya. */
export type JenisTender = 'barang' | 'jasa';

/** Keadaan tender. */
export type StatusTender = 'draft' | 'berjalan' | 'selesai' | 'batal';

export interface BarisTender {
  id?: number;
  itemID?: number | null;
  name: string;
  specification?: string | null;
  quantity?: number | null;
  unit?: string | null;
  sortOrder?: number;
}

export interface BarisPenawaran {
  tenderItemID: number;
  /**
   * Harga satuan; KOSONG berarti pemasok tidak menawar baris itu.
   *
   * Berbeda dari nol, yang berarti digratiskan. Yang tidak menawar tidak
   * boleh terhitung sebagai penawaran termurah.
   */
  price?: number | null;
  notes?: string | null;
}

export interface Penawaran {
  id?: number;
  supplierID: number;
  supplierName?: string;
  supplierPrefix?: string;
  paymentTerm?: string | null;
  creditTerm?: number | null;
  notes?: string | null;
  quotedAt?: string | null;
  items: BarisPenawaran[];
}

export interface Tender {
  id?: number;
  number?: number;
  name: string;
  date: string;
  tenderType: JenisTender;
  projectName: string;
  description?: string | null;
  paymentTerm?: string | null;
  creditTerm?: number | null;
  requirements?: string | null;
  dueDate?: string | null;
  status?: StatusTender;
  winnerQuoteID?: number | null;
  winnerReason?: string | null;
  items: BarisTender[];
  quotes?: Penawaran[];
  quoteCount?: number;
}

/**
 * Penawaran paling sedikit sebelum pemenang dapat ditetapkan.
 *
 * Disamakan dengan `MINIMAL_PENAWARAN` di backend. Layar memakainya untuk
 * memberi tahu lebih awal, bukan sebagai penjagaan — servernya yang menolak.
 */
export const MINIMAL_PENAWARAN = 3;

@Injectable({ providedIn: 'root' })
export class TenderService {
  private readonly api = inject(ApiService);

  daftar(params: any) {
    return this.api.get('tenders', params);
  }

  ambil(id: number) {
    return this.api.get(`tenders/${id}`, {});
  }

  buat(body: Tender) {
    return this.api.post('tenders', body);
  }

  ubah(id: number, body: Partial<Tender>) {
    return this.api.put(`tenders/${id}`, body);
  }

  sebarkan(id: number) {
    return this.api.post(`tenders/${id}/sebarkan`, {});
  }

  batalkan(id: number) {
    return this.api.post(`tenders/${id}/batalkan`, {});
  }

  hapus(id: number) {
    return this.api.delete(`tenders/${id}`);
  }

  tambahPenawaran(tenderId: number, body: Penawaran) {
    return this.api.post(`tenders/${tenderId}/penawaran`, body);
  }

  ubahPenawaran(tenderId: number, quoteId: number, body: Partial<Penawaran>) {
    return this.api.put(`tenders/${tenderId}/penawaran/${quoteId}`, body);
  }

  hapusPenawaran(tenderId: number, quoteId: number) {
    return this.api.delete(`tenders/${tenderId}/penawaran/${quoteId}`);
  }

  tetapkanPemenang(tenderId: number, quoteId: number, alasan: string) {
    return this.api.post(`tenders/${tenderId}/pemenang`, {
      winnerQuoteID: quoteId,
      winnerReason: alasan,
    });
  }
}
