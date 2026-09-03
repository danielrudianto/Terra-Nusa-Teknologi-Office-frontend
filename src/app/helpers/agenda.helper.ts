/**
 * Aturan tampilan agenda yang dipakai desktop DAN mobile.
 *
 * Keduanya menampilkan daftar yang sama dengan kata-kata yang sama. Bila
 * masing-masing menulis sendiri, cepat atau lambat salah satunya diubah —
 * dan satu layar menyebut "Besok" sementara layar sebelahnya "1 hari lagi"
 * untuk baris yang persis sama. Bukan galat, hanya dua aplikasi yang terasa
 * bukan satu.
 */

/** Baris agenda apa pun, sejauh yang dibutuhkan pengurutan. */
export interface AgendaTerurut {
  jenis: 'birthday' | 'reminder';
  daysUntil: number;
}

/**
 * "Hari ini", "Besok", atau "n hari lagi".
 *
 * Nilai negatif diperlakukan sebagai hari ini: pengingat yang tanggalnya
 * sudah lewat tetapi belum ditutup masih relevan, dan "-2 hari lagi" tidak
 * berarti apa-apa bagi yang membacanya.
 */
export function labelJarak(n: number): string {
  if (n <= 0) return 'Hari ini';
  if (n === 1) return 'Besok';
  return `${n} hari lagi`;
}

/**
 * Urutan agenda: yang paling dekat lebih dulu.
 *
 * Pada hari yang sama ulang tahun didahulukan — ia tidak bisa ditunda,
 * sedangkan pengingat bisa.
 */
export function urutkanAgenda(a: AgendaTerurut, b: AgendaTerurut): number {
  return (
    a.daysUntil - b.daysUntil ||
    (a.jenis === 'birthday' ? -1 : 1) - (b.jenis === 'birthday' ? -1 : 1)
  );
}
