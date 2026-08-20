/**
 * Nilai biaya satu dokumen — SATU rumus, dipakai seluruh layar.
 *
 * MENGAPA DPP SAJA
 *
 * PPN masukan yang dibayarkan pada pembelian dapat dikreditkan terhadap PPN
 * keluaran yang dipungut pada faktur penjualan. Uangnya memang keluar, tetapi
 * ia bukan biaya proyek — ia titipan negara yang kembali lewat pengkreditan.
 * Menghitungnya sebagai biaya membuat setiap proyek ber-PPN tampak sekitar
 * sebelas persen lebih mahal daripada keadaannya.
 *
 * PBBKB dan nilai lain ikut dikeluarkan dengan alasan berbeda: keduanya sudah
 * termasuk pada `dpp` dokumen yang bersangkutan pada jalur yang memakainya.
 * Menambahkannya lagi menghitungnya dua kali.
 *
 * MENGAPA HARUS SATU BERKAS
 *
 * Rumus ini pernah ada di DUA tempat dengan isi berbeda: ikhtisar margin
 * menjumlahkan `dpp` saja, sementara laporan proyek menjumlahkan
 * `dpp + PPN + PBBKB + nilai lain`. Keduanya menyebut hasilnya "margin",
 * keduanya tidak pernah menimbulkan galat, dan bedanya baru ketahuan ketika
 * satu proyek dibuka dari daftarnya dan angkanya berbeda ratusan juta.
 *
 * Pemeriksa `scripts/pemeriksa/nilaibiayacek.py` menjaga agar tidak ada layar
 * yang menghitungnya sendiri lagi.
 *
 * YANG TIDAK DIURUS DI SINI
 *
 * Apa yang dibandingkan dengan biaya ini — nilai kontrak, atau yang sudah
 * ditagihkan — adalah pertanyaan yang berbeda dan memang berbeda per layar.
 * Karena itu keduanya diberi nama terang-terangan: "Margin atas kontrak" di
 * laporan, "Margin atas tagihan" di daftar.
 */

interface DokumenBiaya {
  dpp?: unknown;
}

function angka(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

/** Biaya satu pembelian. */
export function biayaPembelian(p: DokumenBiaya): number {
  return angka(p?.dpp);
}

/**
 * Biaya satu draf pembelian.
 *
 * Draf IKUT dihitung: ia biaya yang sudah terjadi tetapi belum dicatat
 * sebagai pembelian. Mengabaikannya membuat margin tampak lebih besar
 * daripada keadaannya sampai drafnya diproses.
 */
export function biayaDraft(p: DokumenBiaya): number {
  return angka(p?.dpp);
}

/**
 * Biaya satu reimbursement.
 *
 * Nominalnya ada di BARISNYA (`reimbursement_items.amount`), bukan `dpp`;
 * pengajuan penggantian memang tidak mengenal DPP dan PPN.
 */
export function biayaReimbursement(r: { amount?: unknown }): number {
  return angka(r?.amount);
}

/**
 * Nilai satu faktur penjualan, untuk dibandingkan dengan biaya di atas.
 *
 * DPP saja, sepasang dengan biayanya: PPN keluaran dipungut untuk negara dan
 * bukan pendapatan. Membandingkan tagihan ber-PPN dengan biaya tanpa PPN
 * menghasilkan margin semu sebesar PPN-nya.
 */
export function nilaiTagihan(f: DokumenBiaya): number {
  return angka(f?.dpp);
}

/**
 * Nilai faktur BERIKUT PPN — uang yang benar-benar ditagihkan.
 *
 * Bukan pasangan biaya, dan tidak boleh dipakai menghitung margin: yang
 * dibandingkan dengan biaya adalah `nilaiTagihan()` di atas. Yang ini hanya
 * untuk ditampilkan sebagai nominal tagihan, berdampingan dengan DPP-nya,
 * karena itulah angka yang tertera pada fakturnya dan yang dicari orang
 * ketika mencocokkan dengan rekening koran.
 */
export function nilaiTagihanKotor(f: DokumenBiaya & { ppn?: unknown }): number {
  const dpp = angka(f?.dpp);
  return dpp + (dpp * angka(f?.ppn)) / 100;
}
