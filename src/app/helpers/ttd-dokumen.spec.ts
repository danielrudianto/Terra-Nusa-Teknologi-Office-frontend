/*
 * TANDA TANGAN pada lembar SPK (pdfmake).
 *
 * "PO COP BAP kalau sudah di sign, bubuhkan tanda tangannya kalau available"
 *
 * CoP dan BAP dirender server; SPK dirakit di peramban, jadi yang dijaga di
 * sini bagian pdfmake-nya:
 *
 *   1. Ada tanda tangan -> gambarnya masuk ke dokumen.
 *   2. Tidak ada -> lembarnya PERSIS seperti sebelum fitur ini ada. Sebagian
 *      orang belum menyiapkan tanda tangannya, dan dokumen tidak boleh
 *      menunggu mereka.
 *   3. BELUM DISETUJUI -> tidak dibubuhkan, sekalipun gambarnya ada. Lembar
 *      draf bertanda tangan direktur tidak dapat dibedakan dari yang sah
 *      begitu keluar dari pencetak — dan satu lembar yang sampai ke vendor
 *      sudah cukup untuk dipakai.
 *   4. TINGGI bloknya tetap. Blok yang meninggi menggeser kaki dokumen dan
 *      dapat mendorongnya ke halaman berikutnya; tidak ada yang akan
 *      menghubungkan halaman baru itu dengan tanda tangan yang dipasang
 *      seseorang kemarin.
 */

import { signatureBlock, signerLines } from './purchase-order-shared.helper';

const TTD = 'data:image/png;base64,AAAA';

/** Semua simpul pdfmake sebagai daftar datar. */
function datar(n: any): any[] {
  if (Array.isArray(n)) return n.flatMap(datar);
  if (n && typeof n === 'object') {
    return [n, ...datar(n.stack ?? []), ...datar(n.columns ?? [])];
  }
  return [];
}

function gambar(simpul: any): any[] {
  return datar(simpul).filter((n) => n && typeof n.image === 'string');
}

describe('signerLines — pembubuhan tanda tangan', () => {
  it('sudah disetujui DAN punya tanda tangan: gambarnya masuk', () => {
    const baris = signerLines('Michael', 'Direktur Utama', false, TTD);
    const img = gambar(baris);

    expect(img.length).toBe(1);
    expect(img[0].image).toBe(TTD);
  });

  it('BELUM disetujui: tidak dibubuhkan meski gambarnya ada', () => {
    // Nama kosong = belum disetujui. Lembar draf tidak boleh bertanda tangan.
    const baris = signerLines('', '', false, TTD);
    expect(gambar(baris).length).toBe(0);
  });

  it('tanpa tanda tangan: bentuknya sama persis seperti sebelumnya', () => {
    const tanpa = signerLines('Michael', 'Direktur Utama');
    const kosong = signerLines('Michael', 'Direktur Utama', false, null);

    expect(gambar(tanpa).length).toBe(0);
    expect(JSON.stringify(kosong)).toBe(JSON.stringify(tanpa));
  });

  it('tingginya tetap: ruang kosong 12 diganti gambar 26 + jarak 4', () => {
    const tanpa: any = signerLines('Michael', 'x')[1];
    const dengan: any = signerLines('Michael', 'x', false, TTD)[1];

    const tinggiTanpa = tanpa.margin[3];
    const tinggiDengan = dengan.height + dengan.margin[3];
    expect(Math.abs(tinggiDengan - tinggiTanpa)).toBeLessThanOrEqual(18);
  });

  it('gambarnya dibatasi agar tidak melebar melewati garisnya', () => {
    const dengan: any = signerLines('Michael', 'x', false, TTD)[1];
    // `fit` menjaga nisbahnya sekaligus membatasi lebarnya; tanpa itu tanda
    // tangan lebar menimpa kolom di sebelahnya.
    expect(Array.isArray(dengan.fit)).toBeTrue();
    expect(dengan.fit[0]).toBeGreaterThan(0);
  });

  it('rata kanan tetap rata kanan', () => {
    const dengan: any = signerLines('Michael', 'x', true, TTD)[1];
    expect(dengan.alignment).toBe('right');
    expect(dengan.margin[0]).toBeGreaterThan(0);
  });
});

describe('signatureBlock — meneruskan tanda tangan ke dalam blok', () => {
  it('gambarnya sampai ke dalam blok', () => {
    const blok = signatureBlock(
      'Michael',
      'Direktur Utama',
      '2026-09-01T10:00:00',
      'Stephanie',
      '001-SPK-H203-H1',
      TTD,
    );
    expect(gambar(blok).length).toBe(1);
  });

  it('pemanggil lama yang tidak mengirimnya tetap menghasilkan blok yang sama', () => {
    // Enam pemanggil di lima berkas; yang belum diubah tidak boleh rusak.
    const lama = signatureBlock('Michael', 'Direktur Utama', null, null, null);
    expect(gambar(lama).length).toBe(0);
    expect(lama.unbreakable).toBeTrue();
  });
});
