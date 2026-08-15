/**
 * Model data panduan dalam aplikasi (in-app guide).
 *
 * Sumber isi: berkas markdown statis di `src/assets/panduan/`.
 * Daftarnya dibaca dari `src/assets/panduan/index.json`.
 *
 * Disengaja TIDAK disimpan di basis data:
 * - ikut riwayat git, ketahuan siapa mengubah apa
 * - panduan bisa diperbarui bersamaan dengan perubahan fitur di commit sama
 * - tidak perlu layar admin, CRUD, atau izin edit tersendiri
 */

/**
 * Satu bagian (heading `##`) di dalam topik.
 *
 * TIDAK ditulis tangan di index.json. Daftar ini disusun dari heading yang
 * benar-benar ada di berkas markdown setelah dirender, sehingga daftar isi
 * mustahil melenceng dari isinya. Versi lama menuliskannya manual dan
 * anchor yang salah ketik hanya terlihat sebagai tautan yang diam.
 */
export interface PanduanBagian {
  /** id heading pada HTML hasil render, mis. `status-dokumen`. */
  anchor: string;
  /** Teks heading tanpa nomor urut. */
  judul: string;
}

/**
 * Teks pendek berbahasa, mis. `{ "id": "Pembelian", "en": "Purchases" }`.
 *
 * Bahasa yang belum diisi mundur ke bahasa cadangan — sama seperti isi
 * markdownnya. Kunci `id` wajib ada karena itulah cadangannya.
 */
export type TeksLokal = Record<string, string>;

/** Satu topik panduan = satu berkas markdown per bahasa. */
export interface PanduanTopik {
  /** Pengenal unik, dipakai di `<app-panduan-button topik="...">`. */
  id: string;
  judul: TeksLokal;
  /**
   * Nama dasar berkas, TANPA bahasa dan ekstensi.
   * `"pembelian"` dimuat sebagai `pembelian.<bahasa>.md`.
   */
  berkas: string;
  /**
   * Modul izin (RBAC). Bila diisi, topik hanya tampil untuk pengguna yang
   * boleh membaca modul tersebut. Kosongkan untuk topik umum.
   *
   * Nilainya harus sama persis dengan kunci di `permission_matrix.py`,
   * mis. `purchase`, `purchase_order`, `salary_slip`.
   */
  modul?: string;
  /** Satu kalimat penjelas di daftar topik. */
  ringkas?: TeksLokal;
  /** Kata kunci tambahan untuk pencarian (istilah yang tak ada di judul). */
  kataKunci?: string[];
}

/** Topik yang judul dan ringkasnya sudah diselesaikan ke satu bahasa. */
export interface PanduanTopikTampil {
  id: string;
  judul: string;
  ringkas?: string;
}

export interface PanduanIndeks {
  versi: number;
  topik: PanduanTopik[];
}
