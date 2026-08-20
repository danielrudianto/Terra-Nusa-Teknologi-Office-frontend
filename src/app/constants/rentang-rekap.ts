/**
 * Rentang tanggal rekap purchase order.
 *
 * Rekap semula selalu memuat SELURUH riwayat sebuah proyek. Yang paling
 * sering diminta justru sepotong: "pembelian kita minggu ini apa saja".
 * Menjawabnya dengan berkas seluruh proyek berarti penerimanya yang
 * menyaring sendiri — dan yang menyaring sendiri bisa keliru.
 *
 * Proyeknya tetap wajib. Rentang tanggal MENYEMPITKAN rekap sebuah proyek,
 * bukan menggantikan proyeknya sebagai penyaring.
 */

import { tanggalLokal } from '../utils/tanggal';

export type PeriodeRekap = 'semua' | 'minggu' | 'bulan' | 'manual';

export interface PilihanPeriode {
  nilai: PeriodeRekap;
  /** Kunci terjemahan, bukan teksnya — dialog ini ada dalam tiga bahasa. */
  label: string;
  ikon: string;
}

export const PILIHAN_PERIODE: PilihanPeriode[] = [
  { nilai: 'semua', label: 'poRekap.periodeSemua', ikon: 'all_inclusive' },
  { nilai: 'minggu', label: 'poRekap.periodeMinggu', ikon: 'date_range' },
  { nilai: 'bulan', label: 'poRekap.periodeBulan', ikon: 'calendar_month' },
  { nilai: 'manual', label: 'poRekap.periodeManual', ikon: 'edit_calendar' },
];

export interface RentangRekap {
  dari: string | null;
  sampai: string | null;
}

/*
 * Tanggalnya disusun `tanggalLokal` dari `utils/tanggal`, bukan
 * `toISOString()` dan bukan pula penyusun baru di berkas ini.
 *
 * `toISOString()` memberi waktu UTC, sedangkan Jakarta berada di UTC+7:
 * tanggal yang lahir dari pemilih tanggal berjam 00:00 setempat berubah
 * menjadi tanggal SEBELUMNYA begitu diubah ke UTC. "1 Agustus" terkirim
 * sebagai "31 Juli", dan dokumen tanggal 1 hilang dari rekap Agustus tanpa
 * satu pun galat.
 *
 * Menuliskannya ulang di sini pun keliru: penyusun kedua yang menyimpang
 * sedikit saja dari yang pertama menghasilkan dua tanggal berbeda untuk
 * hari yang sama, dan tidak ada yang membandingkan keduanya.
 */
export { tanggalLokal };

/** Awal hari, agar perbandingan tidak terpengaruh jamnya. */
function pagi(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Rentang sebuah periode, dihitung dari tanggal acuan.
 *
 * Acuannya diminta sebagai argumen, bukan diambil dari `new Date()` di dalam,
 * supaya perilakunya dapat diuji pada tanggal mana pun.
 */
export function rentangPeriode(
  periode: PeriodeRekap,
  acuan: Date = new Date(),
): RentangRekap {
  const hari = pagi(acuan);

  if (periode === 'minggu') {
    /*
     * Pekan dimulai SENIN.
     *
     * `getDay()` menghitung Minggu sebagai 0. Memakainya apa adanya membuat
     * pekan dimulai Minggu — dan "pembelian minggu ini" yang ditanyakan pada
     * hari Senin akan menjawab dengan satu hari saja.
     */
    const nomor = (hari.getDay() + 6) % 7;
    const senin = new Date(hari);
    senin.setDate(hari.getDate() - nomor);
    const minggu = new Date(senin);
    minggu.setDate(senin.getDate() + 6);
    return { dari: tanggalLokal(senin), sampai: tanggalLokal(minggu) };
  }

  if (periode === 'bulan') {
    const awal = new Date(hari.getFullYear(), hari.getMonth(), 1);
    // Hari ke-0 bulan berikutnya = hari terakhir bulan ini; tidak perlu tahu
    // panjang bulannya, dan Februari kabisat ikut benar dengan sendirinya.
    const akhir = new Date(hari.getFullYear(), hari.getMonth() + 1, 0);
    return { dari: tanggalLokal(awal), sampai: tanggalLokal(akhir) };
  }

  // 'semua' dan 'manual' tidak punya rentang bawaan: yang pertama memang
  // tanpa batas, yang kedua diisi sendiri.
  return { dari: null, sampai: null };
}

function tanggalIndo(iso: string): string {
  const [t, b, h] = iso.split('-').map(Number);
  const d = new Date(t, (b || 1) - 1, h || 1);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Keterangan rentang untuk dicetak pada berkasnya.
 *
 * Rekap sepotong yang tampak seperti rekap seluruh proyek adalah kekeliruan
 * yang paling mahal di sini: penerimanya menyimpulkan proyek itu hanya punya
 * sekian pembelian. Karena itu rentangnya disebut PADA dokumennya, bukan
 * hanya pada layar yang menerbitkannya.
 */
export function labelRentang(rentang: RentangRekap): string {
  const { dari, sampai } = rentang;
  if (!dari && !sampai) return 'Seluruh periode';
  if (dari && sampai) {
    if (dari === sampai) return tanggalIndo(dari);
    return `${tanggalIndo(dari)} – ${tanggalIndo(sampai)}`;
  }
  if (dari) return `Sejak ${tanggalIndo(dari)}`;
  return `Sampai ${tanggalIndo(sampai as string)}`;
}

/** Potongan nama berkas yang menyebut rentangnya; aman sebagai nama berkas. */
export function potonganBerkas(rentang: RentangRekap): string {
  const { dari, sampai } = rentang;
  if (!dari && !sampai) return String(new Date().getFullYear());
  if (dari && sampai) return dari === sampai ? dari : `${dari}_${sampai}`;
  return dari ? `sejak_${dari}` : `sampai_${sampai}`;
}

/**
 * Rentangnya masuk akal: tidak terbalik.
 *
 * Rentang terbalik tidak menghasilkan galat dari server — kondisi SQL-nya
 * hanya tidak pernah terpenuhi, dan berkasnya kosong tanpa sebab yang
 * terbaca.
 */
export function rentangSah(rentang: RentangRekap): boolean {
  const { dari, sampai } = rentang;
  if (!dari || !sampai) return true;
  return dari <= sampai;
}
