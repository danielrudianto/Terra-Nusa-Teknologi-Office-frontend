/**
 * Saringan tahun pada laporan proyek.
 *
 * Yang disaring hanya AKTIVITAS — biaya, rincian pemasok, dan arus per
 * minggu. Nilai kontrak dan margin TIDAK pernah ikut disaring, dan itu
 * bukan kelalaian melainkan syarat supaya angkanya berarti.
 *
 * Sebabnya: margin adalah `kontrak − biaya`. Proyek konstruksi kerap lintas
 * tahun — SPK terbit Desember, pekerjaannya berjalan tahun berikutnya.
 * Bila biayanya disaring per tahun sementara kontraknya utuh, tahun pertama
 * tampak untung hampir seratus persen dan tahun berikutnya rugi telak.
 * Kedua angka itu sama-sama tidak menggambarkan apa pun, dan tidak ada
 * galat yang muncul untuk memberitahunya.
 *
 * Karena itu laporannya memuat DUA angka biaya yang hidup berdampingan:
 * biaya seumur proyek (yang membentuk margin) dan biaya tahun terpilih.
 */

export type TahunLaporan = 'semua' | number;

/*
 * `as const`, bukan `: TahunLaporan`.
 *
 * Dengan anotasi tipe gabungan, `tahun !== SELURUH` tidak menyempitkan
 * tipenya menjadi `number` — dan setiap perbandingan tahun sesudahnya
 * ditolak penyusun. Tipe literal membuat penyempitannya bekerja.
 */
export const SELURUH = 'semua' as const;

/**
 * Tahun sebuah tanggal dokumen.
 *
 * Dibaca dari EMPAT ANGKA DI DEPAN teksnya, bukan lewat `new Date()`.
 *
 * Server mengirim tanggal dokumen sebagai `YYYY-MM-DD` — kolomnya `DATE`,
 * tanpa jam. Menurut spesifikasi JavaScript, teks sepert itu diurai sebagai
 * tengah malam UTC, sehingga `new Date('2026-01-01').getFullYear()`
 * menghasilkan 2025 di setiap zona waktu yang di belakang UTC. Dokumen
 * tanggal 1 Januari akan jatuh ke tahun sebelumnya, dan laporannya tetap
 * terbit dengan wajar.
 *
 * Membaca empat angka di depan juga membuat tahun di sini SAMA dengan
 * tanggal yang tercetak di layar — keduanya berasal dari teks yang sama,
 * jadi tidak mungkin berbeda.
 */
export function tahunDokumen(tanggal: unknown): number | null {
  if (tanggal === null || tanggal === undefined) return null;

  const teks = String(tanggal).trim();
  const cocok = /^(\d{4})-\d{2}/.exec(teks);
  if (cocok) return Number(cocok[1]);

  // Bentuk lain (mis. objek Date) tetap dilayani, dibaca menurut waktu
  // setempat supaya tidak bergeser seperti di atas.
  const d = tanggal instanceof Date ? tanggal : new Date(teks);
  return isNaN(d.getTime()) ? null : d.getFullYear();
}

/**
 * Tahun yang benar-benar ada isinya, terbaru lebih dulu.
 *
 * Daftarnya diturunkan dari data proyeknya sendiri, BUKAN deretan tahun
 * tetap. Proyek yang hanya berjalan setahun cuma menawarkan satu tahun,
 * sehingga tidak ada tahun kosong yang bisa terpilih; proyek lintas tahun
 * menampilkan tahunnya sendiri — dan daftar itu sekaligus yang memberitahu
 * bahwa proyeknya memang lintas tahun.
 */
export function daftarTahun(tanggalTanggal: unknown[]): number[] {
  const tahun = new Set<number>();
  for (const t of tanggalTanggal) {
    const y = tahunDokumen(t);
    if (y !== null) tahun.add(y);
  }
  return [...tahun].sort((a, b) => b - a);
}

/** Dokumen ini masuk tahun terpilih. `'semua'` menerima segalanya. */
export function dalamTahun(tanggal: unknown, tahun: TahunLaporan): boolean {
  if (tahun === SELURUH) return true;
  return tahunDokumen(tanggal) === tahun;
}

/**
 * Dokumen ini terjadi SEBELUM tahun terpilih.
 *
 * Dipakai menghitung biaya yang dibawa dari tahun-tahun sebelumnya. Tanpa
 * angka bawaan itu, grafik kumulatif tahun kedua dimulai dari nol dan
 * proyek yang sudah berjalan setahun terlihat baru dimulai.
 */
export function sebelumTahun(tanggal: unknown, tahun: TahunLaporan): boolean {
  if (tahun === SELURUH) return false;
  const y = tahunDokumen(tanggal);
  return y !== null && y < tahun;
}

/** Sebutan periode untuk layar dan untuk dicetak pada berkas unduhannya. */
export function labelTahun(tahun: TahunLaporan): string {
  return tahun === SELURUH ? 'Seluruh periode' : String(tahun);
}
