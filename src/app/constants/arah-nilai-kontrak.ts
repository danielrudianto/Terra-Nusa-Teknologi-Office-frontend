/**
 * Arah nilai dokumen kontrak: menambah atau mengurangi.
 *
 * Nilai negatif tidak lagi diketik. Angkanya selalu diisi POSITIF, dan
 * tandanya ditentukan pilihan ini.
 *
 * Mengetik minus terlihat sederhana dan ternyata tidak: tanda minus harus
 * lolos dari mask pemisah ribuan, terbaca kembali sebagai angka saat dokumen
 * dibuka, dan tetap benar ketika disunting ulang — tiga tempat yang gagal
 * tanpa suara masing-masing. Yang lebih menentukan, minus tidak terbaca
 * sebagai maksud: "-25.000.000" pada layar tidak menyatakan APA yang
 * dikurangi, sedangkan kartu "Mengurangi nilai kontrak" menyatakannya.
 */

export type ArahNilai = 'tambah' | 'kurang';

export interface PilihanArah {
  value: ArahNilai;
  label: string;
  hint: string;
  icon: string;
}

export const PILIHAN_ARAH_KONTRAK: PilihanArah[] = [
  {
    value: 'tambah',
    label: 'project.arahTambah',
    hint: 'project.arahTambahHint',
    icon: 'add_circle_outline',
  },
  {
    value: 'kurang',
    label: 'project.arahKurang',
    hint: 'project.arahKurangHint',
    icon: 'remove_circle_outline',
  },
];

/**
 * Nilai yang DIKIRIM ke server: positif untuk menambah, negatif untuk
 * mengurangi.
 *
 * `Math.abs` dipakai dengan sengaja. Isiannya sudah dibatasi positif, tetapi
 * nilai yang terlanjur negatif — dari dokumen lama, atau dari mask yang
 * meloloskan minus — akan berbalik arti bila tandanya sekadar dibiarkan:
 * memilih "mengurangi" atas angka yang sudah minus menghasilkan penambahan.
 */
export function nilaiBerarah(besaran: unknown, arah: ArahNilai): number {
  const n = Math.abs(Number(besaran) || 0);
  return arah === 'kurang' ? -n : n;
}

/**
 * Arah sebuah dokumen yang SUDAH tersimpan, dibaca dari tandanya.
 *
 * Dokumen lama tidak menyimpan arah — yang ada hanya nilainya. Nol dianggap
 * menambah; server menolak nol, jadi keadaan itu tidak pernah tersimpan dan
 * hanya muncul pada formulir yang belum diisi.
 */
export function arahDariNilai(nilai: unknown): ArahNilai {
  return Number(nilai) < 0 ? 'kurang' : 'tambah';
}

/** Besaran tanpa tanda, untuk ditampilkan di isian. */
export function besaranDariNilai(nilai: unknown): number {
  return Math.abs(Number(nilai) || 0);
}
