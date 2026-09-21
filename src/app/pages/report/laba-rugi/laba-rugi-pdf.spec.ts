/*
 * PDF laba rugi di sisi layar.
 *
 * Yang dijaga: galat dari server tetap TERBACA walau jawabannya diminta
 * sebagai Blob. Tanpa penguraian ulang, "laporan ini hanya untuk pemilik
 * usaha" berubah menjadi "aksi gagal" — kalimat yang tidak memberi tahu
 * apa yang harus dilakukan, dan tidak ada galat apa pun yang menandainya.
 */

import { galatDariBlob, namaBerkasLabaRugi } from './laba-rugi-pdf';

describe('galat PDF laba rugi', () => {
  it('Blob berisi JSON diurai kembali menjadi objek', async () => {
    const isi = { detail: { code: 'FORBIDDEN', message: 'hanya pemilik' } };
    const e = {
      status: 403,
      error: new Blob([JSON.stringify(isi)], { type: 'application/json' }),
    };
    const hasil = await galatDariBlob(e);
    expect(hasil.error.detail.code).toBe('FORBIDDEN');
    expect(hasil.status).toBe(403);
  });

  it('Blob yang bukan JSON dikembalikan apa adanya, tidak melempar', async () => {
    const e = { status: 502, error: new Blob(['<html>Bad Gateway</html>']) };
    const hasil = await galatDariBlob(e);
    expect(hasil).toBe(e);
  });

  it('galat yang bukan Blob tidak disentuh', async () => {
    const e = { status: 0, error: { detail: 'jaringan' } };
    expect(await galatDariBlob(e)).toBe(e);
  });

  it('galat tanpa isi tidak melempar', async () => {
    expect(await galatDariBlob(undefined)).toBeUndefined();
  });
});

describe('nama berkas PDF laba rugi', () => {
  it('SAMA dengan nama yang dikirim server', () => {
    // routes/report_routes.py: f"Laba-Rugi-{year}-{month:02d}.pdf"
    expect(namaBerkasLabaRugi(9, 2026)).toBe('Laba-Rugi-2026-09.pdf');
  });

  it('bulan satu digit diberi nol di depan, supaya urut di folder unduhan', () => {
    expect(namaBerkasLabaRugi(1, 2026)).toBe('Laba-Rugi-2026-01.pdf');
    expect(namaBerkasLabaRugi(12, 2026)).toBe('Laba-Rugi-2026-12.pdf');
  });
});
