import type {
  PaymentType,
  TodayPaymentItem,
} from '../today-payment-dialog/today-payment-dialog.component';

/**
 * Rincian pembayaran hari ini untuk kartu dasbor: sudah disetujui vs masih
 * menunggu, per jenis, dan per rekening sumber.
 *
 * Seluruhnya dijumlahkan dari daftar yang SAMA dengan yang ditampilkan,
 * sehingga rinciannya selalu berjumlah sama dengan totalnya.
 */
export interface BagianPembayaran {
  kunci: string;
  label: string;
  warna?: string;
  nilai: number;
  jumlah: number;
  /** Porsi dari total, 0–100 (untuk bilah). */
  persen: number;
}

export interface RingkasanPembayaran {
  total: number;
  disetujui: number;
  menunggu: number;
  jumlahMenunggu: number;
  perJenis: BagianPembayaran[];
  perRekening: BagianPembayaran[];
}

/** Penjumlahan rupiah dibulatkan ke sen, supaya 0,1 + 0,2 tidak jadi 0,30000000000000004. */
const tambah = (a: number, b: number) => Math.round((a + b) * 100) / 100;

function kelompok(
  items: TodayPaymentItem[],
  kunci: (it: TodayPaymentItem) => string,
  label: (it: TodayPaymentItem) => string,
  warna: (it: TodayPaymentItem) => string | undefined,
  total: number,
): BagianPembayaran[] {
  const peta = new Map<string, BagianPembayaran>();
  for (const it of items) {
    const k = kunci(it);
    const b =
      peta.get(k) ??
      ({ kunci: k, label: label(it), warna: warna(it), nilai: 0, jumlah: 0, persen: 0 } as BagianPembayaran);
    b.nilai = tambah(b.nilai, Number(it.amount) || 0);
    b.jumlah += 1;
    peta.set(k, b);
  }
  return [...peta.values()]
    .map((b) => ({ ...b, persen: total > 0 ? (b.nilai / total) * 100 : 0 }))
    .sort((a, b) => b.nilai - a.nilai);
}

export function ringkasPembayaran(items: TodayPaymentItem[]): RingkasanPembayaran {
  let total = 0;
  let disetujui = 0;
  let menunggu = 0;
  let jumlahMenunggu = 0;
  for (const it of items) {
    const n = Number(it.amount) || 0;
    total = tambah(total, n);
    if (it.isApprove) {
      disetujui = tambah(disetujui, n);
    } else {
      menunggu = tambah(menunggu, n);
      jumlahMenunggu += 1;
    }
  }
  return {
    total,
    disetujui,
    menunggu,
    jumlahMenunggu,
    perJenis: kelompok(
      items,
      (it) => it.type as PaymentType,
      (it) => it.typeLabel,
      (it) => it.color,
      total,
    ),
    perRekening: kelompok(
      items,
      (it) => it.bankLabel,
      (it) => it.bankLabel,
      () => undefined,
      total,
    ),
  };
}
