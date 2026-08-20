/**
 * Bentuk nomor purchase order — SATU pola, dipakai seluruh layar.
 *
 * MENGAPA HARUS SATU
 *
 * Pola ini sempat ditulis ulang di SEMBILAN tempat pada enam layar, dan
 * kesembilannya tidak sama:
 *
 *   - sebagian menerima awalan `PKS`, sebagian hanya `PO` dan `SPK`;
 *   - panjang kode proyeknya `{1,5}` di satu tempat, `{4,5}` di tempat lain,
 *     dan satu di antaranya `[A-Z]` saja — menolak kode proyek berangka;
 *   - daftar jenisnya berbeda-beda: ada yang tidak memuat `6.4.2`, ada yang
 *     tidak memuat `6.5.1`, ada yang tidak memuat keduanya.
 *
 * Akibatnya nomor yang SAH pada layar pembuatan ditolak layar berikutnya.
 * Yang paling merugikan ada di layar kelengkapan dokumen: tombol simpannya
 * dikunci oleh kesahihan formulir, sehingga pembelian ber-nomor `PKS` — dan
 * pembelian asuransi `6.4.2` — tidak pernah dapat dilengkapi berkasnya.
 * Tombolnya mati, tidak ada isian yang memerah, dan tidak ada satu pun
 * keterangan mengapa.
 *
 * Nilainya diambil dari pola TERLONGGAR yang sudah dipakai — milik layar
 * pembuatan pembelian, satu-satunya layar yang benar-benar menciptakan nomor
 * itu. Menyeragamkan ke yang lebih ketat akan menolak dokumen yang sudah
 * terlanjur ada dan sah.
 *
 * Dijaga `nomorpocek.py`.
 */

/** Awalan yang dikenali: purchase order, surat perintah kerja, perjanjian. */
export const AWALAN_NOMOR_PO = ['PO', 'SPK', 'PKS'] as const;

/**
 * Kode jenis yang boleh menjadi akhiran nomor.
 *
 * Bukan seluruh isi `PURCHASE_TYPE_LABELS`: daftar itu memuat pula kode pajak
 * dan biaya kantor yang tidak pernah berdokumen purchase order.
 */
export const JENIS_NOMOR_PO = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H1',
  'H2',
  '5.1.1',
  '5.1.2',
  '5.1.6',
  '5.1.7',
  '5.1.12',
  '6.3.1',
  '6.3.2',
  '6.4.1',
  '6.4.2',
  '6.5.1',
] as const;

/**
 * Pola nomor purchase order.
 *
 * Bentuknya: `062-PO-R35CH-G` — nomor urut, awalan, kode proyek, kode jenis.
 *
 * Dibangun dari kedua daftar di atas, bukan ditulis sebagai untai panjang:
 * menambah satu jenis dokumen baru cukup menambahnya pada `JENIS_NOMOR_PO`,
 * dan seluruh layar ikut mengenalinya pada saat yang sama.
 */
export const POLA_NOMOR_PO = new RegExp(
  `^\\d{3,4}-(${AWALAN_NOMOR_PO.join('|')})-[A-Z0-9]{1,5}-(${JENIS_NOMOR_PO.map(
    (j) => j.replace(/\./g, '\\.'),
  ).join('|')})$`,
);
