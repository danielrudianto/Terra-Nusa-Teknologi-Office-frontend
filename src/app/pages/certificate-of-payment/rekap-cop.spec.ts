/*
 * REKAP CoP — pengelompokan, sisa pagu, dan berkasnya.
 *
 * CoP selalu menyertifikasi SATU SPK, sehingga SISA PAGU hanya punya arti
 * per SPK: dijumlahkan lintas kontrak, angka itu menyebut batas yang tidak
 * pernah disepakati siapa pun. Sebaliknya "sudah berapa yang kita
 * sertifikasi ke vendor ini" adalah pertanyaan yang benar-benar ditanyakan.
 * Susunan bertingkat pemasok -> SPK menjawab keduanya; yang diuji di sini
 * adalah bahwa susunannya benar-benar bertingkat, dan bahwa angka yang
 * tidak punya arti tidak pernah dicetak sebagai angka.
 */

import {
  IRekapCop,
  IRekapSpk,
  kelompokkan,
  namaPemasokCop,
  tahapCop,
  totalBersih,
} from 'src/app/helpers/certificate-of-payment-rekap-excel';

function cop(p: Partial<IRekapCop> = {}): IRekapCop {
  return {
    id: 1,
    name: '001-967-R501-2026',
    number: 1,
    date: '2026-09-10',
    periodStart: null,
    periodEnd: null,
    projectName: 'R501',
    grossAmount: 1_000_000,
    deductionTotal: 0,
    additionTotal: 0,
    netAmount: 1_000_000,
    isBapApproved: 1,
    isCopCreated: 1,
    isApproved: 1,
    purchaseOrderID: 101,
    purchaseOrderName: '101-SPK-R501-B',
    purchaseType: 'B',
    supplierID: 967,
    supplierName: 'Mega Baja Harapan Indah, CV.',
    supplierPrefix: 'CV',
    tagihanNomor: null,
    tagihanLunas: null,
    ...p,
  };
}

function spk(p: Partial<IRekapSpk> = {}): IRekapSpk {
  return {
    id: 101,
    name: '101-SPK-R501-B',
    projectName: 'R501',
    purchaseType: 'B',
    supplierID: 967,
    supplierName: 'Mega Baja Harapan Indah, CV.',
    supplierPrefix: 'CV',
    nilaiKontrak: 5_000_000,
    tanpaPagu: false,
    ...p,
  };
}

describe('Rekap CoP — pengelompokan bertingkat', () => {
  it('pemasok memuat SPK-nya, dan SPK memuat CoP-nya', () => {
    const k = kelompokkan(
      [
        cop({ id: 1, purchaseOrderID: 101 }),
        cop({ id: 2, purchaseOrderID: 101 }),
        cop({ id: 3, purchaseOrderID: 102, purchaseOrderName: '102-SPK-R501-B' }),
      ],
      [spk({ id: 101 }), spk({ id: 102, name: '102-SPK-R501-B' })],
    );
    expect(k.length).toBe(1);
    expect(k[0].spk.length).toBe(2);
    expect(k[0].spk[0].cop.length).toBe(2);
    expect(k[0].spk[1].cop.length).toBe(1);
    expect(k[0].jumlahCop).toBe(3);
  });

  it('dua pemasok tidak tercampur walau proyeknya sama', () => {
    const k = kelompokkan(
      [
        cop({ id: 1, supplierID: 967 }),
        cop({ id: 2, supplierID: 968, supplierName: 'Baja Selatan', purchaseOrderID: 102 }),
      ],
      [spk({ id: 101 }), spk({ id: 102, supplierID: 968 })],
    );
    expect(k.length).toBe(2);
    expect(k.map((p) => p.supplierID)).toEqual([967, 968]);
  });

  it('subtotal pemasok = jumlah nilai bersih seluruh CoP-nya', () => {
    const k = kelompokkan(
      [
        cop({ id: 1, netAmount: 1_500_000 }),
        cop({ id: 2, netAmount: 2_500_000, purchaseOrderID: 102 }),
      ],
      [spk({ id: 101 }), spk({ id: 102 })],
    );
    expect(k[0].disertifikasi).toBe(4_000_000);
    expect(k[0].spk[0].disertifikasi).toBe(1_500_000);
    expect(k[0].spk[1].disertifikasi).toBe(2_500_000);
  });

  it('urutan datang dari server DIPERTAHANKAN, tidak diurutkan ulang', () => {
    // Dua unduhan atas data yang sama tidak boleh berbeda susunan.
    const k = kelompokkan(
      [
        cop({ id: 1, purchaseOrderID: 102, purchaseOrderName: 'Z' }),
        cop({ id: 2, purchaseOrderID: 101, purchaseOrderName: 'A' }),
      ],
      [spk({ id: 101, name: 'A' }), spk({ id: 102, name: 'Z' })],
    );
    expect(k[0].spk.map((s) => s.spk.name)).toEqual(['Z', 'A']);
  });

  it('SPK yang tidak ikut terkirim tetap mendapat barisnya, ditandai tanpa pagu', () => {
    // CoP yang menghilang dari rekap tanpa sebab jauh lebih buruk daripada
    // satu baris SPK yang nilai kontraknya tidak diketahui.
    const k = kelompokkan([cop({ purchaseOrderID: 999 })], []);
    expect(k[0].spk.length).toBe(1);
    expect(k[0].spk[0].spk.tanpaPagu).toBeTrue();
    expect(Number(k[0].spk[0].spk.nilaiKontrak)).toBe(0);
  });

  it('nilai teks dari server (DECIMAL) tetap dijumlah sebagai angka', () => {
    // `databases` mengembalikan DECIMAL sebagai teks pada sebagian driver;
    // dijumlah apa adanya, "1000" + "2000" menjadi "10002000".
    const k = kelompokkan(
      [cop({ id: 1, netAmount: '1000' as any }), cop({ id: 2, netAmount: '2000' as any })],
      [spk()],
    );
    expect(k[0].disertifikasi).toBe(3000);
  });
});

describe('Rekap CoP — tahap dokumen', () => {
  it('yang sudah ditagihkan menang atas "disetujui"', () => {
    // Diperiksa dari belakang: penanda `isApproved` tetap menyala pada
    // dokumen yang sudah ditagihkan.
    expect(tahapCop(cop({ tagihanNomor: 'INV-1', isApproved: 1 }))).toBe('ditagih');
  });

  it('tahap dibaca dari penandanya, bukan dari satu kolom status', () => {
    expect(tahapCop(cop({ isBapApproved: 0, isCopCreated: 0, isApproved: 0 }))).toBe('draft');
    expect(tahapCop(cop({ isBapApproved: 1, isCopCreated: 0, isApproved: 0 }))).toBe('bap');
    expect(tahapCop(cop({ isBapApproved: 1, isCopCreated: 1, isApproved: 0 }))).toBe('dibuat');
    expect(tahapCop(cop({ isApproved: 1 }))).toBe('disetujui');
  });
});

describe('Rekap CoP — nama pemasok', () => {
  it('badan usaha tidak tertulis dua kali', () => {
    // Sebagian baris pemasok menyimpan ", CV." DI DALAM namanya SEKALIGUS
    // pada kolom `prefix`; menempelkannya begitu saja menghasilkan
    // "CV. Mega Baja Harapan Indah, CV." pada hampir semua barisnya.
    const nama = namaPemasokCop('Mega Baja Harapan Indah, CV.', 'CV');
    expect(nama.match(/CV/g)?.length).toBe(1);
  });

  it('nama tanpa prefiks dikembalikan apa adanya', () => {
    expect(namaPemasokCop('Reynaldi Pradita', '')).toContain('Reynaldi');
  });
});

describe('Rekap CoP — total', () => {
  it('menjumlahkan nilai bersih, bukan kotor', () => {
    expect(
      totalBersih([
        cop({ grossAmount: 5_000_000, netAmount: 4_000_000 }),
        cop({ grossAmount: 1_000_000, netAmount: 900_000 }),
      ]),
    ).toBe(4_900_000);
  });

  it('daftar kosong menghasilkan nol, bukan NaN', () => {
    expect(totalBersih([])).toBe(0);
  });
});
