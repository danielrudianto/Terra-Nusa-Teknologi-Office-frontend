/**
 * Nilai satu faktur penjualan — satu rumus, untuk seluruh layar.
 *
 * Ada TUJUH tempat di aplikasi ini yang menjawab "berapa yang harus dibayar
 * klien atas faktur ini", dan sampai sekarang mereka menjawab TIGA angka
 * berbeda:
 *
 *   DPP + PPN − PPh − BPJS   daftar faktur, layar detail, rekap piutang,
 *                            dan server (penentu lunas)
 *   DPP + PPN − PPh          dialog CATAT PEMBAYARAN, dialog faktur pajak
 *   DPP + PPN                kolom "tagihan" pada daftar
 *
 * Yang paling merugikan adalah yang kedua, karena letaknya di meja tempat
 * pembayaran dicatat. Pada faktur yang ada potongan BPJS-nya: klien
 * mentransfer jumlah yang benar, server menandainya LUNAS — sementara
 * dialognya masih menampilkan "Sisa" sebesar BPJS, tanpa satu pun baris yang
 * menerangkan dari mana angka itu. Yang mencatat lalu menagih lagi uang yang
 * tidak akan pernah datang.
 *
 * PPh dan BPJS adalah POTONGAN yang dilakukan klien sebelum mentransfer:
 * PPh disetorkan klien ke kas negara atas nama AKN, BPJS disetorkan ke BPJS.
 * Keduanya tidak pernah masuk ke rekening AKN — karena itu keduanya tidak
 * boleh dinanti sebagai pembayaran.
 */

export interface FakturNilai {
  dpp?: number | string | null;
  /** PERSEN, bukan rupiah. */
  ppn?: number | string | null;
  /** PERSEN, bukan rupiah. */
  pphPercentage?: number | string | null;
  /** RUPIAH, bukan persen. */
  bpjs?: number | string | null;
}

const angka = (v: unknown): number => Number(v) || 0;

/** Dasar pengenaan pajak. */
export function dppFaktur(f: FakturNilai): number {
  return angka(f?.dpp);
}

/** PPN dalam rupiah. */
export function ppnFaktur(f: FakturNilai): number {
  return (dppFaktur(f) * angka(f?.ppn)) / 100;
}

/** PPh yang dipotong klien, dalam rupiah. */
export function pphFaktur(f: FakturNilai): number {
  return (dppFaktur(f) * angka(f?.pphPercentage)) / 100;
}

/** BPJS yang dipotong klien, dalam rupiah. */
export function bpjsFaktur(f: FakturNilai): number {
  return angka(f?.bpjs);
}

/**
 * Nilai yang DITAGIHKAN — sebelum potongan.
 *
 * Dipakai pada dokumen tagihan dan pada kolom nilai faktur. Ini BUKAN yang
 * dinanti masuk ke rekening; untuk itu pakai `nilaiDibayarkan`.
 */
export function nilaiTagihan(f: FakturNilai): number {
  return dppFaktur(f) + ppnFaktur(f);
}

/**
 * Yang benar-benar akan MASUK KE REKENING, setelah klien memotong.
 *
 * Inilah yang harus dibandingkan dengan pembayaran yang tercatat — server
 * memakai rumus yang sama persis untuk menyimpulkan lunas.
 */
export function nilaiDibayarkan(f: FakturNilai): number {
  return nilaiTagihan(f) - pphFaktur(f) - bpjsFaktur(f);
}

/** Sisa yang belum diterima; tidak pernah negatif. */
export function sisaFaktur(f: FakturNilai, sudahDibayar: unknown): number {
  return nilaiDibayarkan(f) - angka(sudahDibayar);
}
