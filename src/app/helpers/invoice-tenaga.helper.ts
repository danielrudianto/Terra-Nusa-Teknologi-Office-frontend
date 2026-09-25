/**
 * Invoice & kuitansi TENAGA KERJA, diterbitkan dari Certificate of Payment.
 *
 * Dulu dokumen ini dibuat di "Generator Invoice" yang berdiri sendiri: baris
 * upahnya diketik tangan (Upah Harian, Lembur, Bonus, Insentif Bor) dan SPK
 * dirujuk lewat NOMOR SEBAGAI TEKS. Akibatnya SPK D yang sama dapat ditagih
 * lewat CoP dan lewat invoice sekaligus, dan pagunya tidak pernah tahu.
 *
 * Sekarang satu-satunya sumber barisnya adalah CoP yang sudah disetujui:
 *   baris CoP        -> volume × harga SPK (upah, lembur, insentif bor)
 *   tambahan CoP     -> baris sendiri (mis. bonus: "biaya di luar kontrak")
 *   potongan CoP     -> baris bernilai negatif
 * sehingga total invoice = nilai bersih CoP = DPP pembelian yang dibuat
 * darinya. Tiga angka yang sama, dari satu sumber.
 */
import { konteksKlausulTenagaKerja } from './klausul-tenaga-kerja.helper';
import type { IInvoiceItem } from './invoice.helper';
import { jumlahBaris } from './nilai-baris.helper';

/** Angka bulan -> angka Romawi, dipakai pada penomoran dokumen. */
export const ROMAN = [
  'I', 'II', 'III', 'IV', 'V', 'VI',
  'VII', 'VIII', 'IX', 'X', 'XI', 'XII',
];

const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

/** `YYYY-MM-DD` atau Date -> Date setempat (tanpa geser zona). */
export function keTanggal(v: Date | string | null | undefined): Date | null {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

/** Baris insentif pengeboran — menentukan akhiran nomor dan uraian kuitansi. */
export function adaInsentifBor(baris: IInvoiceItem[]): boolean {
  return baris.some((b) => /\bbor\b/i.test(b.name) && Number(b.quantity) > 0);
}

/**
 * Nomor invoice — format yang SAMA dengan Generator Invoice lama, supaya
 * nomor di pembukuan tetap berurut dengan yang sudah terbit:
 *
 *   {tgl cut-off}-{id pemasok 3 digit}-INV-{kode proyek}-{bulan romawi}-{tahun}
 *   + " (B)" bila ada insentif bor.
 */
export function nomorInvoiceTenaga(a: {
  potong: Date | string | null | undefined;
  tanggal: Date | string | null | undefined;
  supplierID: number | null | undefined;
  kodeProyek: string | null | undefined;
  bor?: boolean;
}): string {
  const cut = keTanggal(a.potong);
  const inv = keTanggal(a.tanggal);
  const kode = String(a.kodeProyek ?? '').trim().toUpperCase();
  if (!cut || !inv || !a.supplierID || !kode) return '';
  const dd = String(cut.getDate()).padStart(2, '0');
  const id = String(a.supplierID).padStart(3, '0');
  const nomor = `${dd}-${id}-INV-${kode}-${ROMAN[inv.getMonth()]}-${inv.getFullYear()}`;
  return a.bor ? `${nomor} (B)` : nomor;
}

/**
 * Nomor invoice UNTUK SEBUAH CoP — satu jalan, dipakai layar cetak maupun
 * formulir pembelian.
 *
 * Sebelumnya hanya layar cetak yang menyusunnya, dan formulir pembelian
 * menerima hasilnya lewat `?invoice=`. Akibatnya nomornya terisi hanya bila
 * pembeliannya dibuat LEWAT tombol "Cetak invoice" — memilih CoP dari dalam
 * formulir meninggalkan kotaknya kosong, dan itu terbaca sebagai "kadang ada
 * kadang tidak".
 *
 * Disatukan di sini, bukan disalin ke formulirnya: nomor di pembukuan dan
 * nomor di kertas yang dipegang pemasok HARUS sama, dan dua penyusun yang
 * terpisah akan berselisih pada perubahan berikutnya tanpa menimbulkan galat
 * apa pun.
 *
 * `poItems` diperlukan BUKAN sebagai hiasan: akhiran " (B)" ditentukan oleh
 * ada-tidaknya baris insentif pengeboran, dan label barisnya hanya ada di
 * baris SPK (`remarks_3`). Tanpa baris SPK, nomor yang tersusun dapat
 * kehilangan akhirannya — yaitu persis jenis selisih yang paling mahal.
 */
export function nomorInvoiceCop(a: {
  cop: {
    date?: string | null;
    periodEnd?: string | null;
    projectName?: string | null;
    items?: Array<{
      purchaseOrderItemID: number;
      task?: string | null;
      unit?: string | null;
      quantity: number;
      price?: number;
    }>;
    adjustments?: Array<{
      kind: 'deduction' | 'addition';
      category: string;
      label?: string | null;
      amount: number;
    }>;
  };
  poItems?: Array<{ id: number; remarks_3?: string | null; task?: string | null; unit?: string | null }>;
  supplierID: number | null | undefined;
  /** Tanggal invoice — menentukan bulan Romawi dan tahunnya. */
  tanggal: Date | string | null | undefined;
  labelKategori?: (kategori: string) => string;
}): string {
  const baris = barisInvoiceDariCop(a.cop, a.poItems ?? [], a.labelKategori);
  return nomorInvoiceTenaga({
    // Cut-off = akhir periode CoP; CoP tanpa periode memakai tanggalnya.
    potong: a.cop.periodEnd || a.cop.date || null,
    tanggal: a.tanggal,
    supplierID: a.supplierID,
    kodeProyek: a.cop.projectName,
    bor: adaInsentifBor(baris),
  });
}

/** Periode pada kuitansi: "s.d. 20 September 2026". */
export function periodeInvoice(potong: Date | string | null | undefined): string {
  const cut = keTanggal(potong);
  if (!cut) return '';
  return `s.d. ${cut.getDate()} ${BULAN[cut.getMonth()]} ${cut.getFullYear()}`;
}

/** Uraian pada kuitansi, mengikuti jenis upahnya. */
export function keteranganKuitansi(baris: IInvoiceItem[]): string {
  return adaInsentifBor(baris) ? 'Upah jasa operator pengeboran' : 'Upah pekerjaan';
}

/**
 * Baris invoice dari sebuah CoP.
 *
 * `poItems` = baris SPK-nya. Label baris diambil dari SPK (`remarks_3`, lalu
 * `task`), bukan dari CoP: baris LEMBUR memakai `task` yang sama dengan baris
 * upahnya, dan hanya `remarks_3` yang membedakan keduanya.
 *
 * `labelKategori` menerjemahkan kategori penyesuaian (`kat_*`) untuk baris
 * yang tidak berlabel sendiri.
 */
export function barisInvoiceDariCop(
  cop: {
    items?: Array<{
      purchaseOrderItemID: number;
      task?: string | null;
      unit?: string | null;
      quantity: number;
      price?: number;
    }>;
    adjustments?: Array<{
      kind: 'deduction' | 'addition';
      category: string;
      label?: string | null;
      amount: number;
    }>;
  },
  poItems: Array<{ id: number; remarks_3?: string | null; task?: string | null; unit?: string | null }> = [],
  labelKategori: (kategori: string) => string = (k) => k,
): IInvoiceItem[] {
  const perId = new Map(poItems.map((p) => [Number(p.id), p]));
  const baris: IInvoiceItem[] = [];

  for (const it of cop.items ?? []) {
    const qty = Number(it.quantity) || 0;
    if (qty <= 0) continue;
    const sumber = perId.get(Number(it.purchaseOrderItemID));
    baris.push({
      name: String(sumber?.remarks_3 || sumber?.task || it.task || '-').trim(),
      quantity: qty,
      unit: String(it.unit || sumber?.unit || ''),
      price: Number(it.price) || 0,
    });
  }

  const nama = (a: { category: string; label?: string | null }) =>
    String(a.label || labelKategori(a.category) || a.category).trim();

  // Tambahan lebih dulu (mis. bonus), baru potongan — urutan yang dibaca
  // pemasok: apa saja yang ia terima, lalu apa yang dikurangkan.
  for (const a of cop.adjustments ?? []) {
    const n = Math.abs(Number(a.amount) || 0);
    if (a.kind === 'addition' && n) baris.push({ name: nama(a), quantity: 1, unit: 'ls', price: n });
  }
  for (const a of cop.adjustments ?? []) {
    const n = Math.abs(Number(a.amount) || 0);
    if (a.kind === 'deduction' && n) baris.push({ name: nama(a), quantity: 1, unit: 'ls', price: -n });
  }
  return baris;
}

/** Jumlah baris invoice (dua desimal, seperti seluruh nilai uang). */
export function totalBarisInvoice(baris: IInvoiceItem[]): number {
  // Aturan yang sama dengan dokumen PDF-nya (`nilaiBaris` di invoice.helper),
  // supaya angka di layar dan di kertas tidak pernah berbeda.
  return Math.round(jumlahBaris(baris as any) * 100) / 100;
}

/**
 * Data SPK D untuk dilampirkan di belakang invoice — bentuk yang dipahami
 * `buildPurchaseOrderDContent`. Dipindah dari Generator Invoice lama tanpa
 * perubahan isi; alasan tiap bidangnya ada di riwayat berkas itu:
 *   - penyetuju ikut, supaya blok tanda tangan tidak tercetak "Sign Here";
 *   - label baris `remarks_3` lebih dulu, sama dengan cetak dari daftar PO;
 *   - konteks klausul DIRAKIT (`konteksKlausulTenagaKerja`), bukan diteruskan
 *     mentah — objek jadwal upah yang sampai ke pembangun klausul melempar
 *     "replace is not a function" dan seluruh pencetakan berhenti.
 */
/**
 * Penanda mesin baris lembur pada SPK D (`remarks_2`).
 *
 * Satu definisi, dipakai formulirnya maupun pencetaknya. Penanda yang
 * disalin ke dua tempat berhenti cocok pada perubahan berikutnya, dan
 * akibatnya bukan galat — hanya baris lembur yang diam-diam ikut tercetak
 * lagi di tabel upah.
 */
export const PENANDA_LEMBUR = 'LEMBUR';

/** Baris lembur? */
export function barisLemburSpk(it: any): boolean {
  return String(it?.remarks_2 ?? '').trim().toUpperCase() === PENANDA_LEMBUR;
}

/**
 * Baris untuk TABEL KOMPONEN UPAH pada SPK D tercetak.
 *
 * LEMBUR DIKELUARKAN dari tabel ini. Tarif lembur sudah disebutkan pada
 * Ketentuan Kerja, dengan satuan dan syaratnya; mencetaknya sekali lagi
 * sebagai baris "Upah" menjadikan satu kesepakatan terbaca seperti dua, dan
 * pembaca dokumen harus menebak apakah keduanya berlaku bersamaan.
 *
 * Ia TETAP menjadi baris di basis data — itu yang memberinya tempat pada
 * daftar volume berita acara, dan itulah alasan ia dibuat. Yang berubah di
 * sini hanya apa yang dicetak.
 *
 * Tabelnya tidak punya kolom jumlah (hanya nominal per satuan), sehingga
 * mengeluarkan satu baris tidak membuat angka mana pun tidak cocok.
 */
export function barisCetakSpkD(
  items: any[] | null | undefined,
): Array<{ label: string; amount: number; unit: string }> {
  return (items ?? [])
    .filter((it) => !barisLemburSpk(it))
    .map((it) => ({
      label: it?.remarks_3 || it?.task || '',
      amount: Number(it?.price) || 0,
      unit: it?.unit ?? '',
    }));
}

export function dataCetakSpkD(po: any) {
  const custom = po?.customData ?? {};
  return {
    approvedByName: po?.approvedByName ?? null,
    approvedByPosition: po?.approvedByPosition ?? null,
    isAdendum: !!po?.parentPurchaseOrderID,
    purchaseOrderName: po?.name ?? '',
    date: po?.date,
    projectName: po?.projectName ?? '',
    workerName: po?.supplierName ?? '',
    workerPrefix: po?.supplierPrefix ?? '',
    workerAddress: po?.supplierAddress ?? '',
    workerCity: po?.supplierCity ?? '',
    workerNpwp: po?.supplierNpwp ?? '',
    items: barisCetakSpkD(po?.items),
    clauseContext: konteksKlausulTenagaKerja(custom, po ?? {}),
    templateVersion: po?.templateVersion ?? '1.0',
    additionalClauses: custom.additionalClauses ?? [],
  };
}

/** SPK tenaga kerja (jenis D, termasuk variannya)? Dari nomornya: `…-D`. */
export function spkTenagaKerja(nomor: string | null | undefined): boolean {
  return /-D\d*$/i.test(String(nomor ?? '').trim());
}
