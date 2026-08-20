/**
 * Banner "dokumen yang disunting".
 *
 * Layar sunting bentuknya sama persis dengan layar pembuatan, dan
 * satu-satunya penanda sebelumnya adalah pemasok yang tergembok. Yang
 * membukanya dari daftar tidak melihat dokumen mana yang sedang dipegangnya —
 * dan pada dokumen bernomor mirip, itu cukup untuk menyunting yang salah.
 */

import { AdendumService } from '../../services/adendum.service';

function layanan(dokumen: any): any {
  const s: any = Object.create(AdendumService.prototype);
  s.dokumenLama = dokumen;
  return s;
}

describe('keterangan dokumen lama', () => {
  it('nomor dan tanggalnya dibaca dari dokumennya', () => {
    const s = layanan({ name: '018-PO-R35CH-G', date: '2026-02-05' });
    expect(s.nomorLama).toBe('018-PO-R35CH-G');
    expect(s.tanggalLama).toBe('2026-02-05');
  });

  it('pembuatan biasa tidak punya keduanya', () => {
    /*
     * Bannernya bergantung pada `nomorLama` yang kosong untuk menghilang.
     * Nilai `undefined` yang lolos ke sana membuat kartu bergembok muncul di
     * layar pembuatan dokumen baru — bergembok tanpa ada yang dikunci.
     */
    const s = layanan(null);
    expect(s.nomorLama).toBe('');
    expect(s.tanggalLama).toBe('');
  });

  it('dokumen tanpa tanggal tidak menghasilkan "undefined"', () => {
    // Teksnya dirangkai di papan tampilan; nilai yang bukan untai akan
    // tercetak apa adanya pada kartu yang dibaca orang.
    const s = layanan({ name: '018-PO-R35CH-G' });
    expect(s.tanggalLama).toBe('');
  });
});
