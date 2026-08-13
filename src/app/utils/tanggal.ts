/**
 * Ubah tanggal menjadi teks `YYYY-MM-DD` menurut waktu LOKAL.
 *
 * Alasan fungsi ini ada:
 *
 * `Date.toISOString()` selalu mengubah ke UTC lebih dulu. Datepicker Material
 * menghasilkan tengah malam waktu lokal, dan di Jakarta (UTC+7) tengah malam
 * tanggal 14 adalah pukul 17.00 tanggal 13 menurut UTC. Mengambil bagian
 * tanggal dari hasilnya menghasilkan tanggal yang MUNDUR SEHARI:
 *
 *     new Date(2026, 7, 14).toISOString()   -> "2026-08-13T17:00:00.000Z"
 *                                    .split('T')[0]  -> "2026-08-13"
 *
 * Pergeserannya tidak menimbulkan galat apa pun — dokumen tersimpan dengan
 * tanggal yang salah dan terlihat wajar. Yang paling merugikan terjadi di
 * pergantian bulan dan tahun: 1 Januari tersimpan sebagai 31 Desember tahun
 * sebelumnya, sehingga dokumennya jatuh ke periode pajak yang keliru.
 *
 * Fungsi ini membaca komponen tanggal apa adanya, tanpa konversi zona waktu,
 * sehingga yang tersimpan sama dengan yang dipilih pengguna.
 */
export function tanggalLokal(nilai: any): string | null {
  if (!nilai) return null;

  const t = nilai instanceof Date ? nilai : new Date(nilai);
  if (isNaN(t.getTime())) return null;

  const dua = (n: number) => String(n).padStart(2, '0');
  return `${t.getFullYear()}-${dua(t.getMonth() + 1)}-${dua(t.getDate())}`;
}

/**
 * Sama seperti `tanggalLokal`, tetapi mengembalikan teks kosong alih-alih
 * `null`. Dipakai di tempat yang muatannya tidak menerima `null`.
 */
export function tanggalLokalTeks(nilai: any): string {
  return tanggalLokal(nilai) ?? '';
}
