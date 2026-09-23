import { buildManpowerClauses } from './clause-templates';

/**
 * SPK upah (PO-D) HARUS menyebut pemotongan PPh pada dokumennya.
 *
 * Tarifnya tersimpan pada purchase order, dipakai CoP untuk memotong, dan
 * tidak pernah ikut tercetak: lembar yang ditandatangani pekerja tidak
 * menyebut bahwa upahnya akan dipotong, lalu potongannya muncul pertama
 * kali pada CoP berbulan kemudian.
 *
 * Diperiksa pada `019-SPK-R501-D` (Operator Excavator) — dokumen yang
 * keluhannya berasal.
 */
function seksi(ctx: Record<string, unknown>) {
  // Seksi PO-D dirakit fungsinya sendiri, bukan lewat `buildClauseSections`
  // — itulah yang dipakai layar cetak dan layar lihat.
  return buildManpowerClauses({
    workLocation: 'Tatar Jayaprakarsa Area R501, Kota Baru Parahyangan',
    contractStartText: '27 Juli 2026',
    contractUntilProjectDone: true,
    ...ctx,
  } as any);
}

function umum(ctx: Record<string, unknown>): string[] {
  const s = seksi(ctx) || [];
  return (s.find((x) => x.title === 'Informasi Umum')?.items ?? []) as string[];
}

describe('klausul PPh pada SPK upah (PO-D)', () => {
  it('tarif ada: pemotongannya disebut di Informasi Umum', () => {
    const baris = umum({
      pphPercentage: 2.5,
      pphTaxObject: 'Tidak final - Pegawai Tidak Tetap atau Tenaga Kerja Lepas',
      pphCode: '21-100-03',
    });
    const pph = baris.find((b) => b.includes('PPh'));
    expect(pph).toBeDefined();
    expect(pph).toContain('2,5%');
    expect(pph).toContain('Pegawai Tidak Tetap');
  });

  it('persen ditulis dengan koma, tanpa nol menggantung', () => {
    expect(umum({ pphPercentage: 2 }).find((b) => b.includes('PPh'))).toContain(
      '2%',
    );
    expect(
      umum({ pphPercentage: 1.75 }).find((b) => b.includes('PPh')),
    ).toContain('1,75%');
  });

  it('tarif nol: TIDAK disebut', () => {
    // Pekerja di bawah batas atau ber-SKB memang tidak dipotong; menuliskan
    // kalimatnya menyatakan sesuatu yang tidak terjadi.
    expect(umum({ pphPercentage: 0 }).some((b) => b.includes('PPh'))).toBeFalse();
    expect(umum({}).some((b) => b.includes('PPh'))).toBeFalse();
  });

  it('kalimatnya menerangkan siapa yang menyetorkan', () => {
    // Yang menandatangani perlu tahu potongannya bukan dipungut perusahaan
    // untuk dirinya sendiri.
    const pph = umum({ pphPercentage: 2.5 }).find((b) => b.includes('PPh'))!;
    expect(pph).toContain('kas negara');
  });

  it('lokasi dan jangka waktu tetap tercetak seperti sebelumnya', () => {
    const baris = umum({ pphPercentage: 2.5 });
    expect(baris.some((b) => b.includes('Tatar Jayaprakarsa'))).toBeTrue();
    expect(baris.some((b) => b.includes('27 Juli 2026'))).toBeTrue();
  });
});
