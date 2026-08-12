/**
 * Model data panduan dalam aplikasi (in-app guide).
 *
 * Sumber isi: berkas markdown statis di `src/assets/panduan/`.
 * Daftarnya dibaca dari `src/assets/panduan/index.json`.
 *
 * Disengaja TIDAK disimpan di basis data:
 * - ikut riwayat git, ketahuan siapa mengubah apa
 * - panduan bisa diperbarui bersamaan dengan perubahan fitur di commit yang sama
 * - tidak perlu layar admin, CRUD, atau izin edit tersendiri
 */

/** Satu bagian (heading) di dalam sebuah topik — dipakai untuk tautan langsung. */
export interface PanduanBagian {
  /** id heading di HTML hasil render, mis. `membuat-po`. */
  anchor: string;
  /** Judul yang tampil di daftar isi. */
  judul: string;
}

/** Satu topik panduan = satu berkas markdown. */
export interface PanduanTopik {
  /** Pengenal unik, dipakai di `<app-panduan-button topik="...">`. */
  id: string;
  judul: string;
  /** Nama berkas markdown relatif terhadap `assets/panduan/`. */
  berkas: string;
  /**
   * Modul izin (RBAC). Bila diisi, topik hanya tampil untuk pengguna yang
   * punya izin baca modul tersebut. Kosongkan untuk topik umum.
   *
   * Nilainya harus sama persis dengan kunci di `constants/permission_matrix.py`.
   */
  modul?: string;
  /** Satu kalimat penjelas di daftar topik. */
  ringkas?: string;
  /** Kata kunci tambahan untuk pencarian (istilah yang tidak muncul di judul). */
  kataKunci?: string[];
  bagian?: PanduanBagian[];
}

export interface PanduanIndeks {
  versi: number;
  topik: PanduanTopik[];
}
