/**
 * Transfer antar rekening pada rekap kalender kas.
 *
 * Satu transfer tercatat DUA KALI — keluar di rekening asal, masuk di
 * rekening tujuan — dan itu memang benar bila dibaca per rekening. Pada
 * ringkasan gabungan keduanya saling meniadakan, sehingga tidak boleh
 * dihitung sebagai pemasukan atau pengeluaran: uangnya tidak keluar dari
 * perusahaan, hanya berpindah saku.
 *
 * Yang meniadakan itu hanya berlaku bila KEDUA sakunya ikut dihitung.
 *
 * Sejak rekening dapat dikecualikan dari kalender (deposit jaminan,
 * pembayaran di muka), transfer ke rekening yang dikecualikan hanya punya
 * satu kaki di dalam rekap: sisi keluarnya mengurangi saldo rekening asal,
 * sementara sisi masuknya tidak ada di mana pun. Diperlakukan sebagai
 * "sekadar berpindah", ringkasan hariannya tidak mencatat apa-apa —
 * sementara saldo rekeningnya tetap turun.
 *
 * Akibatnya lembar RINGKASAN HARIAN tidak lagi cocok dengan lampiran
 * kisi per rekening di berkas yang SAMA: saldo gabungan digerakkan
 * masuk−keluar, saldo tiap rekening digerakkan seluruh mutasinya. Selisihnya
 * persis sebesar transfer yang kakinya cuma satu, dan ia menumpuk sepanjang
 * bulan tanpa satu pun baris yang menjelaskannya.
 *
 * Karena itu penentunya bukan "apakah ini transfer", melainkan **apakah
 * lawannya ikut dihitung dalam kalender ini**:
 *
 *   kedua sisi di dalam   → berpindah saku; tidak masuk ringkasan gabungan
 *   lawannya di luar      → uangnya benar-benar keluar (atau masuk); dicatat
 *
 * Dipisahkan ke berkas sendiri supaya dapat diuji langsung. Aturan ini
 * menentukan apakah dua lembar dalam satu berkas menyebut angka yang sama,
 * dan itu bukan hal yang layak dipercayakan pada pembacaan mata.
 */

/** Baris mutasi seperti yang dipakai penyusun rekap kalender. */
export interface MutasiKalender {
  date: string;
  lawan: string;
  keterangan: string;
  proyek: string;
  /** Negatif untuk uang keluar, positif untuk uang masuk. */
  nilai: number;
  /**
   * Sekadar berpindah antar rekening yang KEDUANYA ikut dihitung.
   *
   * Baris bertanda ini tetap menggerakkan saldo rekeningnya, tetapi tidak
   * ikut ke pemasukan/pengeluaran pada ringkasan gabungan.
   */
  antar: boolean;
}

export interface BarisInterpayment {
  date: string | Date;
  amount: number | string | null;
  bankAccountIDOrigin?: number | null;
  bankAccountIDDestination?: number | null;
  originBankAccountName?: string | null;
  destinationBankAccountName?: string | null;
}

/** Ditambahkan pada keterangan transfer yang lawannya tidak ikut dihitung. */
export const DI_LUAR_KALENDER = 'di luar kalender';

function nama(v: string | null | undefined, cadangan: string): string {
  const t = String(v ?? '').trim();
  return t || cadangan;
}

/**
 * Satu transfer dilihat dari SATU rekening.
 *
 * Mengembalikan `null` bila transfer itu tidak menyangkut rekening tersebut.
 *
 * `dalamKalender` berisi id rekening yang ikut dihitung pada rekap ini —
 * yaitu yang tercentang di pemilih rekening, bukan seluruh rekening yang
 * ada. Rekening yang ditandai dikecualikan tidak tercentang, sehingga tidak
 * ada di sini, dan itulah yang membuat transfer kepadanya terbaca sebagai
 * uang yang benar-benar keluar.
 */
export function mutasiInterpayment(
  t: BarisInterpayment,
  bankID: number,
  dalamKalender: ReadonlySet<number>,
): MutasiKalender | null {
  const tanggal = String(t.date).slice(0, 10);
  const nilai = Math.abs(Number(t.amount || 0));

  const asal = Number(t.bankAccountIDOrigin);
  const tujuan = Number(t.bankAccountIDDestination);

  if (asal === Number(bankID)) {
    const lawanIkut = dalamKalender.has(tujuan);
    const lawan = nama(t.destinationBankAccountName, 'Transfer keluar');
    return {
      date: tanggal,
      lawan,
      keterangan: lawanIkut
        ? `Transfer ke ${nama(t.destinationBankAccountName, '')}`.trim()
        : `Transfer ke ${lawan} (${DI_LUAR_KALENDER})`,
      proyek: '',
      nilai: -nilai,
      antar: lawanIkut,
    };
  }

  if (tujuan === Number(bankID)) {
    const lawanIkut = dalamKalender.has(asal);
    const lawan = nama(t.originBankAccountName, 'Transfer masuk');
    return {
      date: tanggal,
      lawan,
      keterangan: lawanIkut
        ? `Transfer dari ${nama(t.originBankAccountName, '')}`.trim()
        : `Transfer dari ${lawan} (${DI_LUAR_KALENDER})`,
      proyek: '',
      nilai: nilai,
      antar: lawanIkut,
    };
  }

  return null;
}
