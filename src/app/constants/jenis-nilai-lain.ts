/**
 * Jenis "nilai lain" pada pembelian.
 *
 * `otherValue` adalah nilai yang ikut dibayarkan tetapi BUKAN dasar PPN dan
 * BUKAN dasar PPh — rumusnya `PPN×DPP + DPP + PBBKB + otherValue − PPh×DPP`.
 * Karena itu ia dipakai untuk hal-hal yang dititipkan atau dipungut terpisah.
 *
 * Dikumpulkan di sini setelah ditemukan bahwa EMPAT layar memakai daftar yang
 * berbeda-beda: `administrative` hanya ada di satu, dan PPh 22 tersimpan
 * dengan nilai `packing` — sehingga pajak yang dipungut tercatat sebagai
 * biaya pengepakan pada setiap laporan yang mengelompokkannya.
 */

export interface JenisNilaiLain {
  /** Nilai yang tersimpan; jangan diubah tanpa memindahkan data lama. */
  value: string;
  /** Kunci i18n label. */
  label: string;
  /** Keterangan singkat; ditampilkan sebagai hint bila terpilih. */
  hint: string;
}

export const JENIS_NILAI_LAIN: JenisNilaiLain[] = [
  {
    value: 'delivery',
    label: 'nilaiLain.delivery',
    hint: 'nilaiLain.deliveryHint',
  },
  {
    value: 'packing',
    label: 'nilaiLain.packing',
    hint: 'nilaiLain.packingHint',
  },
  {
    /*
     * PPh 22 sebelumnya tersimpan dengan nilai `packing`.
     *
     * Akibatnya bukan sekadar label yang keliru: setiap laporan yang
     * mengelompokkan nilai lain menghitung pajak yang dipungut sebagai biaya
     * pengepakan, dan selisihnya tidak akan pernah ketahuan dari layar mana
     * pun.
     */
    value: 'pph22',
    label: 'nilaiLain.pph22',
    hint: 'nilaiLain.pph22Hint',
  },
  {
    value: 'administrative',
    label: 'nilaiLain.administrative',
    hint: 'nilaiLain.administrativeHint',
  },
  {
    /*
     * Premi asuransi — dasar mengapa jenis ini diperlukan.
     *
     * Pembelian asuransi lewat broker dikenai PPN HANYA atas jasa
     * brokernya; preminya sendiri bukan objek PPN. Memasukkan preminya ke
     * DPP berarti mengkreditkan pajak yang tidak pernah dipungut.
     *
     * Preminya dicatat di sini, dan DPP hanya memuat jasa brokernya.
     */
    value: 'insurance',
    label: 'nilaiLain.insurance',
    hint: 'nilaiLain.insuranceHint',
  },
  {
    value: 'retribusi',
    label: 'nilaiLain.retribusi',
    hint: 'nilaiLain.retribusiHint',
  },
  {
    value: 'lain',
    label: 'nilaiLain.lain',
    hint: 'nilaiLain.lainHint',
  },
];

/** Cari satu jenis; dipakai layar yang hanya menampilkan. */
export function cariJenisNilaiLain(
  value: string,
): JenisNilaiLain | undefined {
  return JENIS_NILAI_LAIN.find((x) => x.value === value);
}
