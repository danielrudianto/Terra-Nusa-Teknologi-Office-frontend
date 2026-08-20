/**
 * Pilihan berbentuk KARTU pada formulir faktur penjualan.
 *
 * Bentuknya sama dengan formulir Pembelian (`pilihan-pembelian.ts`), dan
 * alasannya juga sama: pilihan yang MENGUBAH bentuk dokumen — bukan sekadar
 * melabelinya — perlu menyebutkan akibatnya di tempat pilihannya berada.
 *
 * "Cetak terpisah?" dengan jawaban "Ya" dan "Tidak" pada daftar tarik-turun
 * tidak menyatakan apa pun tentang apa yang terpisah dari apa. Yang mengisinya
 * menebak, dan tebakan yang salah baru ketahuan setelah dokumennya terbit di
 * tangan klien.
 */

import { KartuPilihan } from './pilihan-pembelian';

/**
 * Faktur pajak dicetak menyatu atau terpisah dari invoice.
 *
 * "Tidak" didahulukan karena itulah bawaannya — kartu pertama adalah keadaan
 * yang berlaku bila tidak ada yang menyentuhnya.
 */
export const PILIHAN_CETAK_TERPISAH: KartuPilihan[] = [
  {
    value: false,
    label: 'salesInvoiceCreate.cetakMenyatu',
    hint: 'salesInvoiceCreate.cetakMenyatuHint',
    icon: 'description',
  },
  {
    value: true,
    label: 'salesInvoiceCreate.cetakTerpisah',
    hint: 'salesInvoiceCreate.cetakTerpisahHint',
    icon: 'content_copy',
  },
];
