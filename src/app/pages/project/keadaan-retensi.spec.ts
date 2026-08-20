/**
 * Keadaan proyek: masa retensi antara BAST 1 dan BAST 2.
 *
 * Sebelumnya proyek hanya punya tiga keadaan — berjalan, selesai, batal —
 * sehingga proyek yang sudah diserahkan tetapi masih dalam masa pemeliharaan
 * tidak punya tempat. Yang menandainya "selesai" kehilangan jejak retensinya;
 * yang membiarkannya "berjalan" tidak dapat membedakannya dari pekerjaan yang
 * masih dikerjakan.
 *
 * Penandanya `isRetention`, dan proyeknya TETAP `isActive`: masa pemeliharaan
 * masih berjalan, sebagian nilai kontrak masih ditahan, dan perbaikan yang
 * timbul masih dibebankan ke proyek itu. Mematikan `isActive` akan
 * mengeluarkannya dari setiap pemilih proyek — sehingga biaya perbaikannya
 * tidak punya tempat untuk dicatat.
 */

import { keadaanProyek } from './project.model';

describe('keadaan proyek', () => {
  it('berjalan', () => {
    expect(
      keadaanProyek({ isActive: true, isCancelled: false, isRetention: false }),
    ).toBe('berjalan');
  });

  it('tunggu retensi', () => {
    expect(
      keadaanProyek({ isActive: true, isCancelled: false, isRetention: true }),
    ).toBe('retensi');
  });

  it('selesai', () => {
    expect(
      keadaanProyek({ isActive: false, isCancelled: false, isRetention: false }),
    ).toBe('selesai');
  });

  it('batal', () => {
    expect(
      keadaanProyek({ isActive: false, isCancelled: true, isRetention: false }),
    ).toBe('batal');
  });

  it('retensi dibaca SEBELUM isActive', () => {
    /*
     * Keduanya menyala bersamaan. Membaca `isActive` lebih dahulu membuat
     * seluruh proyek retensi terbaca "berjalan" — kepingnya ada di layar,
     * dan tidak pernah menemukan satu pun.
     */
    expect(
      keadaanProyek({ isActive: true, isCancelled: false, isRetention: true }),
    ).not.toBe('berjalan');
  });

  it('batal menang atas retensi', () => {
    // Proyek yang dibatalkan tidak pernah sampai ke BAST 1; kombinasi ini
    // hanya muncul dari data lama, dan artinya tetap batal.
    expect(
      keadaanProyek({ isActive: false, isCancelled: true, isRetention: true }),
    ).toBe('batal');
  });

  it('proyek lama tanpa penanda retensi terbaca seperti dahulu', () => {
    /*
     * Penjaga terpenting bagi data yang sudah ada. Seluruh baris lama tidak
     * punya kolom ini sampai migrasinya dijalankan, dan `undefined` tidak
     * boleh mengubah arti satu pun di antaranya.
     */
    expect(keadaanProyek({ isActive: true, isCancelled: false })).toBe('berjalan');
    expect(keadaanProyek({ isActive: false, isCancelled: false })).toBe('selesai');
    expect(keadaanProyek({ isActive: false, isCancelled: true })).toBe('batal');
  });
});
