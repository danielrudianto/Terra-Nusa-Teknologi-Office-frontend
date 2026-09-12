import {
  BarisInterpayment,
  DI_LUAR_KALENDER,
  MutasiKalender,
  mutasiInterpayment,
} from './kalender-mutasi.helper';

/*
 * Unduhan kalender harus KLOP dengan dirinya sendiri.
 *
 * Berkasnya memuat dua penghitungan atas bulan yang sama:
 *
 *   RINGKASAN HARIAN   saldo gabungan bergerak mengikuti masuk − keluar
 *   lampiran kisi      saldo tiap rekening bergerak mengikuti mutasinya
 *
 * Keduanya harus berakhir pada angka yang sama. Selama transfer antar
 * rekening selalu dianggap "sekadar berpindah", itu benar — tetapi hanya
 * selama kedua sakunya ikut dihitung.
 *
 * Sejak rekening dapat dikecualikan dari kalender, transfer kepadanya hanya
 * punya satu kaki di dalam rekap: saldo rekening asal turun, ringkasan
 * hariannya tidak mencatat apa pun. Selisihnya menumpuk sepanjang bulan,
 * tidak ada satu baris pun yang menjelaskannya, dan tidak ada galat.
 *
 * Uji terakhir di bawah menuliskan kecocokan itu sebagai pertidaksamaan yang
 * sebenarnya — bukan memeriksa penandanya, melainkan menjumlahkan kedua sisi
 * persis seperti kedua lembar itu menjumlahkannya.
 */

const A = 1; // ikut dihitung
const B = 2; // ikut dihitung
const LUAR = 9; // dikecualikan dari kalender

const DALAM: ReadonlySet<number> = new Set([A, B]);

function transfer(
  asal: number,
  tujuan: number,
  nilai: number,
): BarisInterpayment {
  return {
    date: '2026-09-04',
    amount: nilai,
    bankAccountIDOrigin: asal,
    bankAccountIDDestination: tujuan,
    originBankAccountName: `Rekening ${asal}`,
    destinationBankAccountName: `Rekening ${tujuan}`,
  };
}

describe('transfer antar rekening pada rekap kalender', () => {
  it('antar rekening yang sama-sama dihitung: berpindah saku, tidak dicatat', () => {
    const t = transfer(A, B, 1_000_000);

    const keluar = mutasiInterpayment(t, A, DALAM)!;
    const masuk = mutasiInterpayment(t, B, DALAM)!;

    expect(keluar.nilai).toBe(-1_000_000);
    expect(masuk.nilai).toBe(1_000_000);
    expect(keluar.antar)
      .withContext('kedua sisinya ikut dihitung; keduanya meniadakan')
      .toBeTrue();
    expect(masuk.antar).toBeTrue();
  });

  it('ke rekening yang dikecualikan: uangnya benar-benar keluar', () => {
    const m = mutasiInterpayment(transfer(A, LUAR, 3_000_000), A, DALAM)!;

    expect(m.nilai).toBe(-3_000_000);
    expect(m.antar)
      .withContext('sisi masuknya tidak ada di rekap; tidak ada yang meniadakan')
      .toBeFalse();
    expect(m.keterangan).toContain(DI_LUAR_KALENDER);
  });

  it('dari rekening yang dikecualikan: uangnya benar-benar masuk', () => {
    const m = mutasiInterpayment(transfer(LUAR, B, 500_000), B, DALAM)!;

    expect(m.nilai).toBe(500_000);
    expect(m.antar).toBeFalse();
    expect(m.keterangan).toContain(DI_LUAR_KALENDER);
  });

  it('transfer yang tidak menyangkut rekening itu dilewati', () => {
    expect(mutasiInterpayment(transfer(A, LUAR, 1), B, DALAM)).toBeNull();
  });

  it('nilai negatif pada data tetap dibaca menurut arah transfernya', () => {
    // Arah ditentukan asal/tujuan, bukan tanda angkanya; satu baris yang
    // terlanjur tersimpan negatif tidak boleh membalik arah transfernya.
    const t = { ...transfer(A, B, -750_000) };
    expect(mutasiInterpayment(t, A, DALAM)!.nilai).toBe(-750_000);
    expect(mutasiInterpayment(t, B, DALAM)!.nilai).toBe(750_000);
  });

  it('ringkasan harian dan saldo per rekening berakhir pada angka yang sama', () => {
    const SALDO_AWAL: Record<number, number> = { [A]: 10_000_000, [B]: 5_000_000 };

    const transfers = [
      transfer(A, B, 1_000_000), // berpindah saku
      transfer(A, LUAR, 3_000_000), // keluar dari rekap
      transfer(LUAR, B, 500_000), // masuk ke rekap
    ];

    const mutasi = (bankID: number): MutasiKalender[] =>
      transfers
        .map((t) => mutasiInterpayment(t, bankID, DALAM))
        .filter((x): x is MutasiKalender => x !== null);

    /*
     * Sisi pertama: lampiran kisi per rekening.
     *
     * Saldo tiap rekening bergerak mengikuti SELURUH mutasinya, bertanda
     * `antar` maupun tidak — uangnya memang berpindah.
     */
    const saldoAkhirGabunganDariRekening = [A, B].reduce(
      (jml, id) =>
        jml + SALDO_AWAL[id] + mutasi(id).reduce((s, m) => s + m.nilai, 0),
      0,
    );

    /*
     * Sisi kedua: RINGKASAN HARIAN.
     *
     * Saldo gabungan bergerak mengikuti masuk − keluar, dan baris bertanda
     * `antar` sengaja dilewati.
     */
    let saldoGabungan = SALDO_AWAL[A] + SALDO_AWAL[B];
    for (const id of [A, B]) {
      for (const m of mutasi(id)) {
        if (m.antar) continue;
        saldoGabungan += m.nilai;
      }
    }

    expect(saldoGabungan)
      .withContext(
        'dua lembar dalam satu berkas menyebut saldo akhir yang berbeda',
      )
      .toBe(saldoAkhirGabunganDariRekening);

    // Dan angkanya memang yang diharapkan: 15jt − 3jt keluar + 0,5jt masuk.
    expect(saldoGabungan).toBe(12_500_000);
  });
});
