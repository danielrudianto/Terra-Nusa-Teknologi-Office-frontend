import moment from 'moment';

/**
 * Muatan jadwal angsuran untuk dikirim ke server — SATU aturan untuk
 * formulir buat dan ubah.
 *
 * Tenor kosong berarti pinjaman TANPA jadwal (mis. pinjaman pribadi); tanggal
 * angsuran pertama lalu ikut dikosongkan, karena tanpa tenor ia tidak
 * berarti apa pun dan menyimpannya hanya meninggalkan data yatim.
 *
 * `null` dikirim terang-terangan, bukan dihilangkan: pada formulir ubah,
 * mengosongkan tenor harus MENGHAPUS jadwalnya, dan server hanya menghapus
 * kolom yang dikirim sebagai `null`.
 */
export function jadwalAngsuran(
  tenor: unknown,
  pertama: unknown,
): { tenorMonths: number | null; firstInstallmentDate: string | null } {
  const n = Math.floor(Number(tenor));
  if (!tenor || !Number.isFinite(n) || n < 1) {
    return { tenorMonths: null, firstInstallmentDate: null };
  }
  const t = pertama ? moment(pertama as any) : null;
  return {
    tenorMonths: n,
    firstInstallmentDate: t && t.isValid() ? t.format('YYYY-MM-DD') : null,
  };
}
