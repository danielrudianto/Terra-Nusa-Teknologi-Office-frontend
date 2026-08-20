/**
 * Premi asuransi harus TERCETAK pada dokumennya.
 *
 * Keluhan datang dari vendor: SPK penutupan pertanggungan hanya memuat
 * imbalan jasa broker, sementara nilai preminya tidak ada di halaman mana
 * pun. Yang membacanya tidak dapat mengetahui apakah yang dibayarkan
 * jasanya saja atau berikut preminya.
 *
 * Kekeliruannya lebih tajam daripada sekadar kurang lengkap: klausul pada
 * dokumen yang sama berbunyi "Nilai premi YANG TERCANTUM DALAM DOKUMEN INI
 * merupakan perkiraan" — merujuk angka yang tidak pernah dicetak.
 *
 * Dua hal yang harus benar sekaligus, dan keduanya mudah saling merusak:
 *
 *   1. preminya TERCETAK, berikut jumlahnya;
 *   2. preminya TIDAK masuk dasar pajak. Ia hanya dititipkan untuk
 *      diteruskan kepada penanggung; memasukkannya ke `items` akan menambah
 *      PPN atas uang yang cuma lewat.
 */

import { printPurchaseOrderB } from './purchase-order-b.helper';

/** Susun definisi dokumennya saja — tanpa membuat PDF. */
function dokumen(tambahan: Record<string, any> = {}): any {
  return printPurchaseOrderB(
    {
      purchaseOrderName: '001-SPK-MICZ-6.4.2',
      date: '2026-08-20',
      projectName: 'MICZ',
      supplierName: 'Broker Uji',
      supplierAddress: 'Jl. Uji 1',
      poType: '6.4.2',
      items: [
        { name: 'Jasa penutupan asuransi CAR', quantity: 1, unit: 'ls', price: 10_000_000 },
      ],
      includePpn: true,
      ...tambahan,
    } as any,
    'docdef',
  );
}

/** Seluruh teks dokumen sebagai satu untai, apa pun kedalaman sarangnya. */
function teks(simpul: any): string {
  if (simpul === null || simpul === undefined) return '';
  if (typeof simpul === 'string' || typeof simpul === 'number') return String(simpul);
  if (Array.isArray(simpul)) return simpul.map(teks).join(' ');
  if (typeof simpul === 'object') {
    return [simpul.text, simpul.table?.body, simpul.stack, simpul.columns, simpul.content]
      .map(teks)
      .join(' ');
  }
  return '';
}

describe('premi pada SPK penutupan pertanggungan', () => {
  const PREMI = [
    {
      task: 'Premi CAR',
      amount: 45_000_000,
      object: 'Proyek Tatar Surawisesa R35',
      sumInsured: 12_000_000_000,
      deductible: '10% dari klaim, min. Rp 25.000.000',
      coverageStart: '2026-03-06',
      coverageEnd: '2027-03-06',
    },
    { task: 'Premi TPL', amount: 5_000_000 },
  ];

  it('nilainya TERCETAK pada dokumen', () => {
    /*
     * Inilah keluhannya. Sebelumnya hanya penandanya yang diteruskan —
     * dokumen tahu preminya ada, tetapi tidak menyebutkan berapa.
     */
    const isi = teks(dokumen({ premiums: PREMI }));
    expect(isi).toContain('45.000.000');
    expect(isi).toContain('5.000.000');
    expect(isi).toContain('Premi CAR');
  });

  it('jumlah premi dan jumlah yang dibayarkan ikut tercetak', () => {
    // Angka yang sebenarnya berpindah tangan: jasa + PPN + premi.
    // 10.000.000 + 1.100.000 + 50.000.000 = 61.100.000
    const isi = teks(dokumen({ premiums: PREMI }));
    expect(isi).toContain('Jumlah premi');
    expect(isi).toContain('50.000.000');
    expect(isi).toContain('JUMLAH DIBAYARKAN');
    expect(isi).toContain('61.100.000');
  });

  it('premi TIDAK menambah dasar pajak', () => {
    /*
     * Penjaga terpenting. Premi hanya dititipkan; bila ia ikut ke `items`,
     * PPN-nya melonjak dari 1,1 juta menjadi 6,6 juta — dan dokumennya
     * tampak wajar, hanya angkanya yang salah.
     */
    const isi = teks(dokumen({ premiums: PREMI }));
    expect(isi).toContain('1.100.000');
    expect(isi).not.toContain('6.600.000');
  });

  it('disebut sebagai titipan, bukan sebagai pekerjaan', () => {
    const isi = teks(dokumen({ premiums: PREMI }));
    expect(isi.toLowerCase()).toContain('dititipkan');
    expect(isi.toLowerCase()).toContain('di luar dasar pajak');
  });

  it('tanpa premi, dokumennya persis seperti sebelumnya', () => {
    /*
     * Seluruh SPK jasa lain memakai helper yang sama. Baris tambahan yang
     * bocor ke sana akan muncul pada dokumen yang tidak ada hubungannya
     * dengan asuransi.
     */
    const isi = teks(dokumen());
    expect(isi).not.toContain('PREMI');
    expect(isi).not.toContain('JUMLAH DIBAYARKAN');
    expect(isi).toContain('Total');
  });

  it('larik premi kosong sama dengan tanpa premi', () => {
    const isi = teks(dokumen({ premiums: [] }));
    expect(isi).not.toContain('JUMLAH DIBAYARKAN');
  });

  it('baris premi bernilai nol tanpa nama tidak ikut tercetak', () => {
    // Baris yang tersisa dari penyuntingan tidak boleh menghasilkan
    // "Premi — Rp 0" pada dokumen yang ditandatangani.
    const isi = teks(dokumen({ premiums: [{ task: '', description: '', amount: 0 }] }));
    expect(isi).not.toContain('JUMLAH DIBAYARKAN');
  });

  it('"Total" berganti menjadi "Total jasa" ketika ada premi', () => {
    /*
     * Dengan dua kelompok uang pada satu tabel, kata "Total" sendirian
     * menjadi ambigu — dan justru keambiguan itulah yang dikeluhkan.
     */
    const isi = teks(dokumen({ premiums: PREMI }));
    expect(isi).toContain('Total jasa');
  });
});

describe('rincian pertanggungan pada baris premi', () => {
  /*
   * Keluhan kedua vendor, dan yang lebih sukar terlihat daripada preminya
   * sendiri: isian yang diisi di formulir — nilai pertanggungan, risiko
   * sendiri, masa berlakunya, objek yang dijamin — tidak pernah sampai ke
   * kertas. Klausul pada dokumen yang sama menyebut "mengikuti rincian
   * sebagaimana tercantum dalam dokumen ini", merujuk rincian yang tidak ada.
   */
  const LENGKAP = [
    {
      task: 'Premi CAR',
      amount: 45_000_000,
      object: 'Proyek Tatar Surawisesa R35',
      sumInsured: 12_000_000_000,
      deductible: '10% dari klaim, min. Rp 25.000.000',
      coverageStart: '2026-03-06',
      coverageEnd: '2027-03-06',
    },
  ];

  it('nilai pertanggungan, risiko sendiri, masa, dan objeknya tercetak', () => {
    const isi = teks(dokumen({ premiums: LENGKAP }));
    expect(isi).toContain('Proyek Tatar Surawisesa R35');
    expect(isi).toContain('12.000.000.000');
    expect(isi).toContain('10% dari klaim');
    expect(isi).toContain('6 Maret 2026');
    expect(isi).toContain('6 Maret 2027');
  });

  it('setiap baris premi BERNOMOR', () => {
    /*
     * Dua polis pada satu dokumen tidak dapat dirujuk dalam percakapan
     * maupun endorsement selama barisnya tidak bernomor — tidak ada yang
     * bisa disebut "premi nomor dua".
     */
    const isi = teks(
      dokumen({ premiums: [...LENGKAP, { task: 'Premi TPL', amount: 5_000_000 }] }),
    );
    const blokPremi = isi.slice(isi.indexOf('PREMI —'));
    expect(blokPremi).toContain('1.');
    expect(blokPremi).toContain('2.');
  });

  it('dua polis membawa rinciannya masing-masing', () => {
    // Inilah sebabnya rinciannya pindah ke premi: selama ia menempel pada
    // baris imbalan jasa, polis kedua tidak punya tempat menuliskannya.
    const isi = teks(
      dokumen({
        premiums: [
          { task: 'Premi CAR', amount: 45_000_000, sumInsured: 12_000_000_000 },
          { task: 'Premi TPL', amount: 5_000_000, sumInsured: 3_000_000_000 },
        ],
      }),
    );
    expect(isi).toContain('12.000.000.000');
    expect(isi).toContain('3.000.000.000');
  });

  it('yang kosong DILEWATI, bukan dicetak sebagai "-"', () => {
    /*
     * Baris berlabel tanpa isi pada dokumen yang ditandatangani terbaca
     * sebagai ketentuan yang sengaja dikosongkan.
     */
    const isi = teks(dokumen({ premiums: [{ task: 'Premi TPL', amount: 5_000_000 }] }));
    expect(isi).not.toContain('Nilai pertanggungan');
    expect(isi).not.toContain('Risiko sendiri');
    expect(isi).not.toContain('Masa pertanggungan');
    expect(isi).not.toContain('Objek yang dijamin');
  });

  it('satu tanggal saja tidak menghasilkan rentang yang menggantung', () => {
    const isi = teks(
      dokumen({
        premiums: [{ task: 'Premi TPL', amount: 5_000_000, coverageStart: '2026-03-06' }],
      }),
    );
    expect(isi).toContain('Mulai pertanggungan: 6 Maret 2026');
    expect(isi).not.toContain('s.d.');
  });

  it('tanggal yang tidak terbaca dianggap tidak diisi', () => {
    // Bukan "-" dan bukan "Invalid Date": keduanya tercetak pada dokumen
    // yang ditandatangani.
    const isi = teks(
      dokumen({
        premiums: [{ task: 'Premi TPL', amount: 5_000_000, coverageStart: '', coverageEnd: null }],
      }),
    );
    expect(isi).not.toContain('pertanggungan:');
    expect(isi.toLowerCase()).not.toContain('invalid');
  });

  it('keterangan bebas dokumen lama TIDAK lagi tersambung ke judulnya', () => {
    /*
     * Bentuk lamanya menyambung keterangan ke nama polisnya dengan tanda
     * hubung, sehingga "Ls" terbaca seperti satuan dari nama polisnya —
     * itulah yang dikeluhkan.
     */
    const isi = teks(
      dokumen({ premiums: [{ task: 'Premi CAR', description: 'Ls', amount: 5_000_000 }] }),
    );
    expect(isi).not.toContain('— Ls');
    expect(isi).toContain('Premi CAR');
  });
});
