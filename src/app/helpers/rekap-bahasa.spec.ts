/**
 * Rekap purchase order memakai BAHASA APLIKASI, bukan bahasa Inggris.
 *
 * Kolom "Jenis" sempat mengambil namanya dari `PURCHASE_TYPE_LABELS` — peta
 * tetap berbahasa Inggris. Akibatnya seluruh judul, kolom, dan keterangan
 * rekap berbahasa Indonesia, sementara satu kolom berbunyi "Project
 * supporting equipment and supplies" pada setiap baris.
 *
 * Berkasnya terbit dengan wajar dan tidak ada galat apa pun; yang membacanya
 * hanya kebingungan.
 */

import { purchaseTypeLabel } from '../constants/purchase-type-label.constant';

/** Penerjemah tiruan: mengembalikan terjemahan bila ada, kuncinya bila tidak. */
function penerjemah(peta: Record<string, string>) {
  return { instant: (k: string) => peta[k] ?? k };
}

const INDONESIA = {
  'poType.tB': 'Sewa alat',
  'poType.tG': 'Alat bantu dan perlengkapan proyek',
  'poType.tH1': 'Subkontraktor (badan usaha)',
};

describe('bahasa nama jenis pada rekap', () => {
  it('memakai terjemahan bila tersedia', () => {
    const t = penerjemah(INDONESIA);
    expect(purchaseTypeLabel(t, 'B')).toBe('Sewa alat');
    expect(purchaseTypeLabel(t, 'G')).toBe('Alat bantu dan perlengkapan proyek');
    expect(purchaseTypeLabel(t, 'H1')).toBe('Subkontraktor (badan usaha)');
  });

  it('TIDAK memakai teks Inggris ketika terjemahannya ada', () => {
    // Inilah keadaan yang sempat terjadi pada berkas rekap.
    const t = penerjemah(INDONESIA);
    expect(purchaseTypeLabel(t, 'G')).not.toBe(
      'Project supporting equipment and supplies',
    );
  });

  it('jatuh ke teks Inggris bila terjemahannya belum ada', () => {
    /*
     * Cadangannya sengaja dipertahankan. Tanpanya yang muncul kunci mentah
     * "poType.tG" — yang tidak berarti apa pun bagi siapa pun, dan lebih
     * buruk daripada nama berbahasa Inggris.
     */
    const t = penerjemah({});
    expect(purchaseTypeLabel(t, 'G')).toBe(
      'Project supporting equipment and supplies',
    );
  });

  it('kode yang tidak dikenal dikembalikan apa adanya', () => {
    // Bukan tanda hubung: kode yang tidak dikenal perlu terlihat supaya
    // dapat ditelusuri, bukan disembunyikan.
    expect(purchaseTypeLabel(penerjemah({}), 'ZZZ')).toBe('ZZZ');
  });

  it('kode kosong menjadi tanda hubung, bukan teks kosong', () => {
    expect(purchaseTypeLabel(penerjemah({}), '')).toBe('—');
  });

  it('kode bertitik tetap menemukan kuncinya', () => {
    /*
     * Titik pada kode ("5.1.6") adalah pemisah tingkat bagi ngx-translate,
     * sehingga harus diganti garis bawah. Tanpa penggantian itu, seluruh
     * jenis biaya kantor jatuh ke teks Inggrisnya.
     */
    const t = penerjemah({ 'poType.t5_1_6': 'Perlengkapan kantor' });
    expect(purchaseTypeLabel(t, '5.1.6')).toBe('Perlengkapan kantor');
  });
});
