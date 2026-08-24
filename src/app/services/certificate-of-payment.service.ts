import { Injectable, inject } from '@angular/core';

import { ApiService } from './api.service';

/**
 * Certificate of Payment — berita acara progres atas sebuah SPK.
 *
 * CATATAN PENTING TENTANG HARGA
 *
 * `price` dan `amount` bersifat OPSIONAL pada seluruh antarmuka di bawah,
 * dan itu disengaja: server TIDAK MENGIRIMKANNYA kepada level 1. Orang
 * lapangan mengisi volume, dan harga satuan pekerjaan tidak pernah sampai
 * ke perambannya sama sekali.
 *
 * Karena itu layar tidak boleh menganggap keduanya selalu ada — dan tidak
 * boleh pula "menyembunyikan kolomnya" sebagai pengganti: yang menyembunyikan
 * di layar tetap mengirimkan angkanya, dan yang sampai di peramban dapat
 * dibaca siapa pun yang membuka perkakas pengembang.
 */

/** Satu baris pekerjaan SPK beserta keadaan pagunya. */
export interface BarisPagu {
  purchaseOrderItemID: number;
  purchaseOrderID: number;
  task: string | null;
  unit: string | null;
  itemID: number | null;
  equipmentID: number | null;
  keterangan: string | null;
  /** Volume kontrak baris ini. */
  pagu: number;
  /** Sudah disertifikasi CoP lain. */
  terpakai: number;
  /** Yang masih boleh diisi. */
  sisa: number;
  /** Hanya untuk level 2 ke atas. */
  price?: number;
}

/** SPK yang dapat dijadikan dasar CoP. */
export interface SpkKandidat {
  id: number;
  name: string;
  projectName: string;
  purchaseType: string;
  supplierName: string | null;
  date: string | null;
  /** Hanya untuk level 2 ke atas. */
  dpp?: number;
}

/** Satu baris yang dikirimkan saat menyimpan. */
export interface BarisCoPInput {
  purchaseOrderItemID: number;
  quantity: number;
  remarks?: string | null;
}

export interface BarisCoP extends BarisCoPInput {
  id?: number;
  task?: string | null;
  unit?: string | null;
  paguBaris?: number;
  price?: number;
  amount?: number;
}

/** Kategori potongan yang dikenali server. */
export const KATEGORI_POTONGAN = [
  'uang_muka',
  'retensi',
  'denda',
  'pph',
  'lain_lain',
] as const;

/** Kategori tambahan yang dikenali server. */
export const KATEGORI_TAMBAHAN = ['biaya_luar_kontrak', 'lain_lain'] as const;

/**
 * Satu baris potongan atau tambahan.
 *
 * `amount` SELALU positif — arahnya ditentukan `kind`. Server menolak nilai
 * nol atau negatif, jadi layar tidak perlu (dan tidak boleh) memakai tanda
 * minus untuk menyatakan potongan.
 */
export interface PenyesuaianCoP {
  id?: number;
  kind: 'deduction' | 'addition';
  category: string;
  label?: string | null;
  amount: number;
  note?: string | null;
}

export interface RingkasanNilai {
  grossAmount: number;
  deductionTotal: number;
  additionTotal: number;
  netAmount: number;
}

export interface CertificateOfPayment {
  id: number;
  name: string;
  number: number;
  purchaseOrderID: number;
  purchaseOrderName?: string;
  projectName: string;
  date: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  note?: string | null;
  status: 'draft' | 'approved' | 'cancelled';
  createdBy: number;
  createdByName?: string;
  isChecked: boolean | number;
  checkedBy?: number | null;
  checkedByName?: string | null;
  isApproved: boolean | number;
  approvedBy?: number | null;
  approvedByName?: string | null;
  items?: BarisCoP[];
  /** Hanya untuk level 2 ke atas — server tidak mengirimkannya ke level 1. */
  adjustments?: PenyesuaianCoP[];
  grossAmount?: number;
  deductionTotal?: number;
  additionTotal?: number;
  netAmount?: number;
}

@Injectable({ providedIn: 'root' })
export class CertificateOfPaymentService {
  private readonly api = inject(ApiService);

  private static readonly JALUR = 'certificate-of-payments';

  /**
   * SPK yang boleh dijadikan dasar CoP.
   *
   * Daftar ini SUDAH disaring server — purchase order pembelian barang tidak
   * pernah muncul di sini. Layar tidak menyaringnya lagi: aturan yang sama
   * ditulis dua kali akan berselisih pada jenis dokumen berikutnya yang
   * ditambahkan, dan yang tertinggal tidak menimbulkan galat apa pun.
   */
  daftarSpk(projectName?: string, keyword?: string) {
    const params: Record<string, string> = {};
    if (projectName) params['projectName'] = projectName;
    if (keyword) params['keyword'] = keyword;
    return this.api.get(`${CertificateOfPaymentService.JALUR}/spk`, params);
  }

  /** Baris pekerjaan SPK beserta sisa pagunya. */
  pagu(purchaseOrderId: number) {
    return this.api.get(
      `${CertificateOfPaymentService.JALUR}/pagu/${purchaseOrderId}`,
      {},
    );
  }

  daftar(params: Record<string, any> = {}) {
    const bersih: Record<string, string> = {};
    Object.entries(params).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') bersih[k] = String(v);
    });
    return this.api.get(`${CertificateOfPaymentService.JALUR}/`, bersih);
  }

  detail(id: number) {
    return this.api.get(`${CertificateOfPaymentService.JALUR}/${id}`, {});
  }

  /**
   * Simpan CoP baru.
   *
   * Muatannya TIDAK memuat harga — lihat catatan di kepala berkas.
   */
  buat(body: {
    purchaseOrderID: number;
    date: string;
    periodStart?: string | null;
    periodEnd?: string | null;
    projectName?: string | null;
    note?: string | null;
    items: BarisCoPInput[];
  }) {
    return this.api.post(`${CertificateOfPaymentService.JALUR}/`, body);
  }

  ubah(
    id: number,
    body: {
      date?: string;
      periodStart?: string | null;
      periodEnd?: string | null;
      note?: string | null;
      items?: BarisCoPInput[];
    },
  ) {
    return this.api.put(`${CertificateOfPaymentService.JALUR}/${id}`, body);
  }

  /**
   * Ganti SELURUH potongan & tambahan.
   *
   * Dikirim utuh, bukan per baris: server menggantinya seluruhnya, sehingga
   * layar cukup mengirimkan susunan yang dikehendaki.
   */
  simpanPenyesuaian(id: number, adjustments: PenyesuaianCoP[]) {
    return this.api.put(
      `${CertificateOfPaymentService.JALUR}/${id}/adjustments`,
      { adjustments },
    );
  }

  periksa(id: number, checked: boolean) {
    return this.api.patch(
      `${CertificateOfPaymentService.JALUR}/${id}/checked?checked=${checked}`,
      {},
    );
  }

  setujui(id: number) {
    return this.api.patch(
      `${CertificateOfPaymentService.JALUR}/${id}/approve`,
      {},
    );
  }

  hapus(id: number) {
    return this.api.delete(`${CertificateOfPaymentService.JALUR}/${id}`);
  }
}
