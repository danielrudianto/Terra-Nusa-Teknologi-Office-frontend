import { Injectable, signal } from '@angular/core';

/**
 * Satu palet warna halaman ujian.
 *
 * Tiga nilai, bukan satu: warna aksen saja tidak cukup karena warna yang
 * enak dipandang sebagai isian belum tentu terbaca sebagai teks. Oranye AKN
 * (#dd8840) berkontras hanya 2,74:1 dengan putih — jauh di bawah syarat
 * WCAG AA 4,5:1 — jadi ia dipakai sebagai aksen, dan teksnya memakai nilai
 * `ink` yang lebih gelap.
 */
export interface Palet {
  kode: string;
  /** Aksen, garis, dan isian — TIDAK pernah dipakai sebagai warna teks. */
  aksen: string;
  /** Teks di atas latar putih. */
  ink: string;
  /** Ujung gradien gelap; teks putih diletakkan di atasnya. */
  gelap: string;
}

/**
 * Pilihan palet — DIKURASI, bukan pemilih warna bebas.
 *
 * Pemilih warna bebas memang lebih mengesankan sekilas, tetapi ia juga
 * membiarkan orang memilih kuning muda untuk teks di atas putih, dan
 * halamannya menjadi tidak terbaca justru karena fitur yang dipasang untuk
 * memamerkan kerapian. Empat palet di bawah SELURUHNYA diukur:
 *
 *   palet             ink/putih   gelap/putih
 *   AKN oranye           5,54:1        7,94:1
 *   TerraBot biru        7,62:1       12,51:1
 *   Hijau lapangan       6,51:1       10,70:1
 *   Slate netral         7,58:1       12,18:1
 *
 * Ambangnya 4,5:1 untuk teks kecil. Menambah palet berarti mengukurnya
 * lebih dulu — `scripts/pemeriksa/paletujiancek.py` menolak yang tidak
 * memenuhi.
 */
export const PALET: Palet[] = [
  { kode: 'akn', aksen: '#dd8840', ink: '#9c5715', gelap: '#7a4319' },
  { kode: 'biru', aksen: '#3b6fe0', ink: '#1f4bb8', gelap: '#12306f' },
  { kode: 'hijau', aksen: '#2f9e63', ink: '#1a6b41', gelap: '#12472c' },
  { kode: 'slate', aksen: '#64748b', ink: '#475569', gelap: '#2b3648' },
];

/** Bawaannya warna AKN: yang mengundang pelamar adalah AKN. */
export const PALET_BAWAAN = 'akn';

const KUNCI = 'paletUjian';

@Injectable({ providedIn: 'root' })
export class PaletUjianService {
  /**
   * Pilihan yang sedang berlaku.
   *
   * Signal, bukan nilai biasa: halaman depan dan halaman pengerjaan adalah
   * dua komponen terpisah, dan keduanya harus ikut berubah pada saat yang
   * sama tanpa saling mengetahui.
   */
  readonly palet = signal<string>(this.baca());

  private baca(): string {
    /*
     * `localStorage` dibungkus try/catch.
     *
     * Di jendela penyamaran, atau saat data situs diblokir, MEMBACANYA saja
     * sudah melempar — dan halaman ujian yang gagal dimuat karena preferensi
     * warna adalah kegagalan yang jauh lebih mahal daripada warna yang
     * kembali ke bawaannya.
     */
    try {
      const v = localStorage.getItem(KUNCI);
      if (v && PALET.some((p) => p.kode === v)) return v;
    } catch {}
    return PALET_BAWAAN;
  }

  pilih(kode: string): void {
    if (!PALET.some((p) => p.kode === kode)) return;
    this.palet.set(kode);
    try {
      localStorage.setItem(KUNCI, kode);
    } catch {}
  }
}
