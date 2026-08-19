/**
 * Pilihan berbentuk KARTU pada formulir reimbursement.
 *
 * Bentuk dan alasannya sama dengan `pilihan-pembelian.ts`: tiap pilihan perlu
 * menyertakan keterangan singkat, dan keterangan itulah yang membedakannya
 * dari daftar tarik-turun.
 *
 * Jenis bebannya sendiri hanya tiga, dan ketiganya menentukan ke pos mana
 * pengeluaran itu masuk. Dari daftar tarik-turun ketiganya tampak setara —
 * padahal "Penanganan Dokumen & Alat Tulis" bukan tempat menaruh ongkos ojek
 * yang kebeturutan dibayar bersamaan.
 */

import { KartuPilihan } from './pilihan-pembelian';

/**
 * Jenis beban yang dapat direimburse.
 *
 * Kodenya mengikuti kode biaya yang sudah dipakai purchase order — 'A', 'E',
 * dan '5.1.6' — bukan penamaan tersendiri, sehingga rekapnya dapat
 * digabungkan tanpa pemetaan di tengah.
 */
export const PILIHAN_JENIS_BEBAN: KartuPilihan[] = [
  {
    value: 'A',
    label: 'reimbursementType.transport',
    hint: 'reimbursementCreate.transportHint',
    icon: 'local_taxi',
  },
  {
    value: 'E',
    label: 'reimbursementType.consumption',
    hint: 'reimbursementCreate.consumptionHint',
    icon: 'restaurant',
  },
  {
    value: '5.1.6',
    label: 'reimbursementType.document',
    hint: 'reimbursementCreate.documentHint',
    icon: 'description',
  },
];
