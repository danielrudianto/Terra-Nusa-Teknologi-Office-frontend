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
/*
 * Kode konstruksi PPh 4(2) yang biasa dipakai AKN.
 *
 * AKN penyedia jasa konstruksi, sehingga hampir semua tagihannya dipotong
 * PPh final pasal 4(2). Keempat kode inilah yang dipakai sehari-hari; tarifnya
 * bergantung KUALIFIKASI AKN dan apakah pekerjaannya terintegrasi, bukan besar
 * nilainya.
 *
 * Dipakai DUA layar dengan arah potongan yang sama — faktur penjualan
 * (pelanggan memotong AKN) dan kontrak proyek (nilai yang sama, ditetapkan di
 * muka). Menawarkan pasangan kode berbeda di dua layar membuat bukti potong
 * tidak cocok dengan dokumennya, dan selisihnya baru ketahuan saat
 * rekonsiliasi tahunan.
 *
 * Urutannya mengikuti yang paling sering dipakai lebih dulu.
 */
const USULAN_KONSTRUKSI_AKN: UsulanPPh[] = [
  {
    code: '28-409-25',
    alasan: 'Konstruksi terintegrasi — AKN bersertifikat badan usaha',
  },
  {
    code: '28-409-24',
    alasan: 'Konstruksi — AKN bersertifikat kualifikasi menengah atau besar',
  },
  {
    code: '28-409-23',
    alasan: 'Konstruksi — AKN tanpa sertifikat badan usaha',
  },
  {
    code: '28-409-22',
    alasan: 'Konstruksi — AKN berkualifikasi usaha kecil',
  },
];

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
   * Bukan PPh 23: yang dibayar orang perseorangan, bukan badan.
   *
   * Kedua kode di bawah SAMA dengan yang ditawarkan layar faktur
   * (`INVOICE_PPH_CODES`). Itu disengaja: faktur atas SPK tenaga kerja
   * menagihkan pekerjaan yang sama, dan menawarkan pasangan kode yang
   * berbeda di dua layar membuat bukti potong tidak cocok dengan
   * dokumennya — selisihnya baru ketahuan saat pelaporan.
   *
   * Sebelumnya di sini `21-100-09` dan `21-100-03`; keduanya masuk akal
   * secara peraturan, tetapi bukan yang dipakai di lapangan, dan bukan yang
   * dipakai layar faktur.
   */
  D: [
    {
      code: '21-100-35',
      alasan: 'Upah pegawai tidak tetap yang dibayarkan bulanan',
    },
    {
      code: '21-100-20',
      alasan: 'Imbalan kepada pemberi jasa, bukan pegawai',
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
   * FAKTUR PENJUALAN dan KONTRAK PROYEK — yang dipotong PELANGGAN dari
   * tagihan AKN.
   *
   * Arahnya terbalik dari purchase order: di sini AKN yang dipotong, dan
   * salah kode membuat bukti potong dari pelanggan tidak cocok dengan yang
   * dilaporkan AKN — selisihnya baru ketahuan saat rekonsiliasi tahunan.
   *
   * Keduanya memakai daftar yang SAMA (`USULAN_KONSTRUKSI_AKN`): faktur
   * menagihkan pekerjaan yang nilainya sudah ditetapkan di kontraknya, jadi
   * dua layar tidak boleh mengusulkan pasangan kode yang berbeda.
   */
  SALES: USULAN_KONSTRUKSI_AKN,
  CONTRACT: USULAN_KONSTRUKSI_AKN,

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
