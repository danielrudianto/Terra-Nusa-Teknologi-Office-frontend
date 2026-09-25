/*
 * REKAP CoP — BERKASNYA, bukan hanya fungsi penyusunnya.
 *
 * Uji ini benar-benar membangun .xlsx-nya, membacanya kembali, dan memeriksa
 * isinya. Alasannya satu kejadian nyata: lembar Ikhtisar rekap purchase
 * order pernah terbit KOSONG selama entah berapa lama, karena selnya diisi
 * `{formula}` tanpa `result` — Excel yang membuka berkas dalam Protected
 * View tidak menghitung apa pun sampai penyuntingan diizinkan. Seluruh uji
 * unitnya hijau; yang salah baru ketahuan setelah berkasnya dibuka orang.
 *
 * Karena itu yang diperiksa di sini adalah hal-hal yang hanya terlihat dari
 * berkas jadinya: nama lembar, letak kepala kolom, nilai tersimpan pada sel
 * berumus, dan angka yang SENGAJA tidak dicetak sebagai angka.
 */

import ExcelJS from 'exceljs';

import {
  IRekapCop,
  IRekapSpk,
  unduhRekapCop,
} from 'src/app/helpers/certificate-of-payment-rekap-excel';

const T = { instant: (k: string, p?: any) => (p?.nama ? `${k}:${p.nama}` : k) };

function cop(p: Partial<IRekapCop> = {}): IRekapCop {
  return {
    id: 1,
    name: '001-967-R501-2026',
    number: 1,
    date: '2026-09-10',
    periodStart: '2026-09-01',
    periodEnd: '2026-09-15',
    projectName: 'R501',
    grossAmount: 1_000_000,
    deductionTotal: 100_000,
    additionTotal: 50_000,
    netAmount: 950_000,
    isBapApproved: 1,
    isCopCreated: 1,
    isApproved: 1,
    purchaseOrderID: 101,
    purchaseOrderName: '101-SPK-R501-B',
    purchaseType: 'B',
    supplierID: 967,
    supplierName: 'Mega Baja',
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
    supplierName: 'Mega Baja',
    supplierPrefix: 'CV',
    nilaiKontrak: 5_000_000,
    tanpaPagu: false,
    ...p,
  };
}

/** Bangun berkasnya dan baca kembali sebagai workbook. */
async function berkas(
  daftar: IRekapCop[],
  spkDaftar: IRekapSpk[],
): Promise<ExcelJS.Workbook> {
  const aslinyaBuat = URL.createObjectURL;
  const aslinyaLepas = URL.revokeObjectURL;
  let tertangkap: Blob | null = null;
  (URL as any).createObjectURL = (b: Blob) => {
    tertangkap = b;
    return 'blob:uji';
  };
  (URL as any).revokeObjectURL = () => {};
  // `a.click()` pada anchor yang tidak tertaut dokumen tidak membuka apa pun
  // di peramban uji; tidak perlu ditahan.
  try {
    await unduhRekapCop('R501', daftar, spkDaftar, T);
  } finally {
    (URL as any).createObjectURL = aslinyaBuat;
    (URL as any).revokeObjectURL = aslinyaLepas;
  }
  expect(tertangkap).withContext('berkas tidak terbentuk').toBeTruthy();
  const buf = await (tertangkap as unknown as Blob).arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  return wb;
}

describe('Rekap CoP — berkas .xlsx yang terbit', () => {
  it('berisi tiga lembar, dengan Ikhtisar PALING DEPAN', async () => {
    const wb = await berkas([cop()], [spk()]);
    // Ikhtisar dibaca lebih dulu, dan sering satu-satunya yang dibaca.
    expect(wb.worksheets.map((w) => w.name)).toEqual([
      'copRekap.lembarIkhtisar',
      'copRekap.lembarPerSpk',
      'copRekap.lembarPerCop',
    ]);
  });

  it('sel total Ikhtisar menyimpan HASILNYA, bukan rumus telanjang', async () => {
    const wb = await berkas([cop({ netAmount: 950_000 })], [spk()]);
    const sheet = wb.getWorksheet('copRekap.lembarIkhtisar')!;
    // Kolom 7 = nilai bersih; baris totalnya tepat di bawah satu baris data.
    const total: any = sheet.getCell(6, 7).value;
    expect(total.formula).withContext('harus tetap rumus').toContain('SUM(');
    /*
     * INI YANG PERNAH TERBIT KOSONG.
     *
     * Tanpa `result`, Excel dalam Protected View menampilkan sel kosong —
     * dan lembar ikhtisar yang melompong tidak terlihat seperti kesalahan
     * teknis, melainkan seperti data yang memang tidak ada.
     */
    expect(total.result).toBe(950_000);
  });

  it('lembar Per CoP memuat satu baris per dokumen beserta totalnya', async () => {
    const wb = await berkas(
      [cop({ id: 1, netAmount: 100 }), cop({ id: 2, netAmount: 200 })],
      [spk()],
    );
    const sheet = wb.getWorksheet('copRekap.lembarPerCop')!;
    expect(sheet.getCell(5, 1).value).toBe('001-967-R501-2026');
    const total: any = sheet.getCell(7, 11).value;
    expect(total.result).toBe(300);
  });

  it('tanggal dan periode kerja tercetak sebagai tanggal setempat', async () => {
    const wb = await berkas([cop()], [spk()]);
    const sheet = wb.getWorksheet('copRekap.lembarPerCop')!;
    // Lewat `toISOString()` tanggalnya mundur sehari bagi WIB (+7) — yang
    // terlihat hanya tanggal yang meleset, tanpa galat.
    expect(sheet.getCell(5, 2).value).toBe('10/09/2026');
    expect(sheet.getCell(5, 3).value).toBe('01/09/2026 – 15/09/2026');
  });

  it('SPK tanpa pagu: sisa pagu DIKOSONGKAN, bukan diisi angka', async () => {
    const wb = await berkas(
      [cop({ purchaseType: 'D' })],
      [spk({ purchaseType: 'D', tanpaPagu: true, nilaiKontrak: 0 })],
    );
    const sheet = wb.getWorksheet('copRekap.lembarPerSpk')!;
    // Baris 5 kepala kelompok pemasok, baris 6 barisnya.
    const sisa = sheet.getCell(6, 7).value;
    // Jenis D memang tidak berplafon; angka apa pun di sini menyebut batas
    // yang tidak ada — dan angka yang tercetak selalu dibaca sebagai
    // kesepakatan.
    expect(typeof sisa).toBe('string');
    expect(sisa).toBe('copRekap.tanpaPagu');
  });

  it('SPK berpagu: sisa pagu = nilai kontrak dikurangi yang disertifikasi', async () => {
    const wb = await berkas(
      [cop({ netAmount: 2_000_000 })],
      [spk({ nilaiKontrak: 5_000_000 })],
    );
    const sheet = wb.getWorksheet('copRekap.lembarPerSpk')!;
    expect(sheet.getCell(6, 6).value).toBe(2_000_000);
    expect(sheet.getCell(6, 7).value).toBe(3_000_000);
  });

  it('dua pemasok menghasilkan dua kepala kelompok yang terpisah', async () => {
    const wb = await berkas(
      [
        cop({ id: 1 }),
        cop({
          id: 2,
          supplierID: 968,
          supplierName: 'Baja Selatan',
          purchaseOrderID: 102,
          purchaseOrderName: '102-SPK-R501-B',
        }),
      ],
      [spk(), spk({ id: 102, supplierID: 968, supplierName: 'Baja Selatan' })],
    );
    const sheet = wb.getWorksheet('copRekap.lembarPerSpk')!;
    const teks: string[] = [];
    sheet.eachRow((row) => {
      const v = row.getCell(1).value;
      if (typeof v === 'string') teks.push(v);
    });
    expect(teks.some((x) => x.includes('Mega Baja'))).toBeTrue();
    expect(teks.some((x) => x.includes('Baja Selatan'))).toBeTrue();
  });

  it('daftar kosong tidak melempar dan tidak menerbitkan baris total palsu', async () => {
    const wb = await berkas([], []);
    const sheet = wb.getWorksheet('copRekap.lembarPerCop')!;
    // Baris 4 kepala kolom; tidak boleh ada baris TOTAL di bawahnya.
    expect(sheet.getCell(5, 1).value).toBeFalsy();
  });
});
