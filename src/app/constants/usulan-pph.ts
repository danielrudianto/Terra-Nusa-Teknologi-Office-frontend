/**
 * Usulan kode objek PPh menurut jenis purchase order.
 *
 * Daftar kode lengkapnya lebih dari seratus, dan yang memilihnya di lapangan
 * bukan orang perpajakan. Salah pilih tidak menghasilkan galat apa pun:
 * dokumennya terbit, potongannya dihitung dengan tarif yang keliru, dan baru
 * ketahuan saat pelaporan — ketika pembayarannya sudah berjalan.
 *
 * BUKAN pembatasan. Seluruh kode tetap dapat dipilih; yang berbeda hanya
 * urutannya — yang biasa dipakai untuk jenis itu muncul lebih dulu, dengan
 * keterangan mengapa ia diusulkan.
 *
 * Menutup pilihan justru berbahaya: transaksi di luar kebiasaan pasti ada,
 * dan yang tidak menemukan kodenya akan memilih yang paling mirip dari daftar
 * pendek — dan itu lebih sulit ketahuan daripada memilih dari daftar panjang.
 *
 * Tarif dan penamaan mengikuti `utils/pph.ts`; bila daftar itu berubah, kode
 * di sini harus ikut diperiksa. `pphusulcek.py` menjaga agar setiap kode yang
 * disebut di sini benar-benar ada di sana.
 */

export interface UsulanPPh {
  /** Kode objek pajak, harus ada di `availablePPh`. */
  code: string;
  /** Mengapa kode ini diusulkan; ditampilkan di bawah namanya. */
  alasan: string;
}

/**
 * Kunci berupa kode jenis PO sebagaimana dipakai `purchaseType`.
 *
 * Yang tidak disebut di sini tidak mendapat usulan — daftarnya tampil seperti
 * biasa. Lebih baik tanpa usulan daripada usulan yang salah: yang tidak
 * yakin akan mencari, sedangkan yang diusulkan keliru akan diterima begitu
 * saja.
 */
export const USULAN_PPH: Record<string, UsulanPPh[]> = {
  /*
   * PO-A — transportasi.
   *
   * Dua bentuk yang beda perlakuan pajaknya: menyewa kendaraannya (harta),
   * atau membeli jasa antarnya. Keduanya 2%, tetapi objeknya berbeda dan
   * salah pilih membuat bukti potong tidak cocok dengan kontraknya.
   */
  A: [
    {
      code: '24-104-56',
      alasan: 'Vendor mengantarkan barang — jasa pengangkutan',
    },
    {
      code: '24-100-02',
      alasan: 'Kendaraan disewa, pengemudinya dari AKN',
    },
  ],

  /*
   * PO-B — sewa alat kerja.
   *
   * Alat berat termasuk "harta selain tanah dan bangunan". Bila yang disewa
   * beserta operatornya dan pekerjaannya diborongkan, itu justru pekerjaan
   * konstruksi — karena itu kode konstruksi ikut diusulkan.
   */
  B: [
    {
      code: '24-100-02',
      alasan: 'Sewa alat tanpa borongan pekerjaan',
    },
    {
      code: '28-409-22',
      alasan: 'Bila alat beserta operator dan pekerjaannya diborongkan',
    },
  ],

  /*
   * PO-D — tenaga kerja harian.
   *
   * Bukan PPh 23: yang dibayar orang perseorangan, bukan badan. Dua kode
   * berbeda menurut kesinambungannya.
   */
  D: [
    {
      code: '21-100-09',
      alasan: 'Pekerja lepas, tidak berkesinambungan',
    },
    {
      code: '21-100-03',
      alasan: 'Pekerja tidak tetap yang menerima upah berkala',
    },
  ],

  /*
   * PO-H — subkontraktor.
   *
   * Tarifnya bergantung KUALIFIKASI penyedia jasanya, bukan besar
   * pekerjaannya. Yang berkualifikasi 1,75%, yang tidak 4% — selisihnya
   * lebih dari dua kali lipat, dan salah pilih terbawa sampai pelaporan.
   */
  H: [
    {
      code: '28-409-22',
      alasan: 'Subkontraktor berkualifikasi usaha',
    },
    {
      code: '28-409-23',
      alasan: 'Subkontraktor tanpa kualifikasi usaha',
    },
    {
      code: '21-100-09',
      alasan: 'Mandor perseorangan, bukan badan usaha',
    },
  ],

  /*
   * PO-F — pengujian material.
   *
   * Jasa uji laboratorium termasuk jasa lain PPh 23. Pembelian materialnya
   * sendiri tidak dipotong PPh.
   */
  F: [
    {
      code: '24-104-29',
      alasan: 'Jasa pengujian laboratorium',
    },
  ],

  /* PO-6.3 — jasa perbaikan dan pemeliharaan. */
  '63': [
    {
      code: '24-104-29',
      alasan: 'Perawatan atau perbaikan mesin dan peralatan',
    },
    {
      code: '24-104-30',
      alasan: 'Perawatan kendaraan atau alat transportasi',
    },
  ],

  /* PO-5.1.2 — perawatan aset. */
  '512': [
    {
      code: '24-104-29',
      alasan: 'Perawatan atau perbaikan mesin dan peralatan',
    },
  ],

  /* PO-6.5.1 — rekrutmen. */
  '651': [
    {
      code: '24-104-18',
      alasan: 'Jasa perantara atau keagenan',
    },
    {
      code: '24-104-17',
      alasan: 'Penyediaan tenaga kerja (outsourcing)',
    },
  ],

  /*
   * FAKTUR PENJUALAN — yang dipotong PELANGGAN dari tagihan AKN.
   *
   * Arahnya terbalik dari purchase order: di sini AKN yang dipotong, dan
   * salah kode membuat bukti potong dari pelanggan tidak cocok dengan yang
   * dilaporkan AKN — selisihnya baru ketahuan saat rekonsiliasi tahunan.
   *
   * AKN penyedia jasa konstruksi, sehingga hampir selalu PPh 4(2). Tarifnya
   * bergantung KUALIFIKASI AKN sendiri, bukan besar pekerjaannya.
   */
  SALES: [
    {
      code: '28-409-22',
      alasan: 'Pekerjaan konstruksi — AKN berkualifikasi usaha',
    },
    {
      code: '28-409-24',
      alasan: 'Konstruksi terintegrasi — AKN berkualifikasi usaha',
    },
    {
      code: '24-100-02',
      alasan: 'Bila yang ditagihkan sewa alat, bukan pekerjaan',
    },
  ],

  /* PO-5.1.12 — perangkat lunak. */
  '5112': [
    {
      code: '24-104-24',
      alasan: 'Jasa terkait perangkat lunak atau sistem komputer',
    },
  ],
};

/** Usulan untuk satu jenis PO; kosong bila jenisnya belum dipetakan. */
export function usulanPPhUntuk(purchaseType: string | null | undefined) {
  const kode = String(purchaseType ?? '').toUpperCase();
  return USULAN_PPH[kode] ?? USULAN_PPH[String(purchaseType ?? '')] ?? [];
}
