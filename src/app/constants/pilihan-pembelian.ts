/**
 * Pilihan berbentuk KARTU pada formulir pembelian.
 *
 * Dikumpulkan di sini, bukan ditulis di templat, karena tiap pilihan perlu
 * menyertakan keterangan singkat — dan keterangan itulah yang membedakannya
 * dari `mat-select` biasa.
 *
 * Alasan bentuk kartu: sebagian pilihan di layar ini MENGUBAH perilaku
 * dokumen, bukan sekadar melabelinya. "Menunggu dokumen" membuat pembelian
 * tersimpan sebagai draf yang belum dapat dibayar; "Pembelian internal"
 * mengeluarkannya dari perhitungan biaya proyek. Dari daftar tarik-turun,
 * kedua akibat itu tidak terlihat sama sekali.
 */

export interface KartuPilihan {
  value: string | boolean;
  /** Kunci i18n judul. */
  label: string;
  /** Kunci i18n keterangan; inilah yang membuat kartu berguna. */
  hint: string;
  icon: string;
}

/** Jenis dokumen pembelian. */
export const PILIHAN_JENIS_DOKUMEN: KartuPilihan[] = [
  {
    value: 'goods',
    label: 'purchaseCreate.goodsPurchase',
    hint: 'purchaseCreate.goodsPurchaseHint',
    icon: 'inventory_2',
  },
  {
    value: 'other',
    label: 'purchaseCreate.otherPurchase',
    hint: 'purchaseCreate.otherPurchaseHint',
    icon: 'receipt_long',
  },
];

/**
 * Kelengkapan dokumen.
 *
 * Bukan label: "Menunggu" menyimpannya sebagai draf yang belum dapat
 * dibayarkan, dan menuntut keterangan apa yang ditunggu.
 */
export const PILIHAN_KELENGKAPAN: KartuPilihan[] = [
  {
    value: 'ready',
    label: 'purchaseCreate.statusReady',
    hint: 'purchaseCreate.statusReadyHint',
    icon: 'task_alt',
  },
  {
    value: 'draft',
    label: 'purchaseCreate.statusWaiting',
    hint: 'purchaseCreate.statusWaitingHint',
    icon: 'hourglass_top',
  },
];

/**
 * Pembelian internal atau eksternal.
 *
 * Internal tidak masuk perhitungan biaya proyek mana pun — dan salah pilih
 * membuat biaya kantor terbebankan ke proyek, atau sebaliknya.
 *
 * Pasangannya disebut "eksternal", bukan "untuk proyek": lawan kata internal
 * adalah eksternal, dan penamaan yang tidak sejajar membuat kedua kartu
 * terbaca seperti jawaban atas dua pertanyaan yang berbeda.
 */
export const PILIHAN_LINGKUP: KartuPilihan[] = [
  {
    value: false,
    label: 'purchaseCreate.lingkupEksternal',
    hint: 'purchaseCreate.lingkupEksternalHint',
    icon: 'foundation',
  },
  {
    value: true,
    label: 'purchaseCreate.lingkupInternal',
    hint: 'purchaseCreate.lingkupInternalHint',
    icon: 'business',
  },
];

/** Tarif PPN. */
export const PILIHAN_PPN: KartuPilihan[] = [
  {
    value: '11',
    label: 'purchaseCreate.ppn11',
    hint: 'purchaseCreate.ppn11Hint',
    icon: 'percent',
  },
  {
    value: '1.1',
    label: 'purchaseCreate.ppn11Final',
    hint: 'purchaseCreate.ppn11FinalHint',
    icon: 'percent',
  },
  {
    value: '0',
    label: 'purchaseCreate.ppn0',
    hint: 'purchaseCreate.ppn0Hint',
    icon: 'money_off',
  },
];

/**
 * Ke mana dananya ditransfer.
 *
 * Bukan label melainkan alur yang berbeda: lewat perantara berarti dana masuk
 * ke rekening pribadi staf yang kemudian meneruskannya, dan menuntut surat
 * pengalihan pembayaran sebagai dasar tertulisnya. Sebagai sakelar bernama
 * "Pembayaran Proxy", tidak satu pun dari itu terbaca.
 */
export const PILIHAN_PROXY: KartuPilihan[] = [
  {
    value: false,
    label: 'purchaseCreate.proxyLangsung',
    hint: 'purchaseCreate.proxyLangsungHint',
    icon: 'trending_flat',
  },
  {
    value: true,
    label: 'purchaseCreate.proxyPerantara',
    hint: 'purchaseCreate.proxyPerantaraHint',
    icon: 'alt_route',
  },
];

/** Cara pembayaran. */
export const PILIHAN_CARA_BAYAR: KartuPilihan[] = [
  {
    value: 'bank',
    label: 'purchaseCreate.methodBank',
    hint: 'purchaseCreate.methodBankHint',
    icon: 'account_balance',
  },
  {
    value: 'va',
    label: 'purchaseCreate.methodVa',
    hint: 'purchaseCreate.methodVaHint',
    icon: 'pin',
  },
  {
    value: 'cek',
    label: 'purchaseCreate.methodCek',
    hint: 'purchaseCreate.methodCekHint',
    icon: 'note',
  },
  {
    value: 'giro',
    label: 'purchaseCreate.methodGiro',
    hint: 'purchaseCreate.methodGiroHint',
    icon: 'schedule_send',
  },
  {
    value: 'cash',
    label: 'purchaseCreate.methodCash',
    hint: 'purchaseCreate.methodCashHint',
    icon: 'payments',
  },
];

/**
 * Cara bayar yang MEMERLUKAN rekening tujuan.
 *
 * Tunai tidak: uangnya berpindah tangan langsung, dan tidak ada rekening yang
 * dituju. Cek dan giro memerlukannya — keduanya ditarik atas sebuah rekening,
 * dan itulah sebabnya keduanya masuk daftar ini bersama transfer.
 */
export const CARA_BAYAR_BERREKENING = ['bank', 'va', 'cek', 'giro'];
