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

export interface RingkasJadwal {
  tenor: number;
  angsuran: number;
  pertama: string; // YYYY-MM-DD
  terakhir: string;
  jatuhTempo: number; // jadwal yang tanggalnya <= hari ini
  berikutnya: string | null; // null = seluruh jadwal sudah lewat
  tunggakan: number; // seharusnya dibayar s/d hari ini - yang sudah dibayar (>= 0)
}

/**
 * Ringkasan jadwal untuk layar lihat — anggapan SAMA dengan server
 * (`porsi_lancar`): angsuran bulanan rata `utang / tenor`; tanpa tanggal
 * angsuran pertama, dianggap sebulan setelah tanggal pinjaman.
 * `null` bila pinjaman tanpa tenor.
 */
export function ringkasJadwal(
  loan: { debt?: unknown; tenorMonths?: unknown; firstInstallmentDate?: unknown; date?: unknown } | null,
  dibayar: number,
  hariIni: Date = new Date(),
): RingkasJadwal | null {
  const tenor = Math.floor(Number(loan?.tenorMonths));
  if (!loan || !Number.isFinite(tenor) || tenor < 1) return null;
  const mulai = loan.firstInstallmentDate
    ? moment(loan.firstInstallmentDate as any)
    : loan.date
      ? moment(loan.date as any).add(1, 'month')
      : null;
  if (!mulai || !mulai.isValid()) return null;

  const utang = Number(loan.debt) || 0;
  const angsuran = utang / tenor;
  const kini = moment(hariIni).startOf('day');
  let jatuh = 0;
  while (jatuh < tenor && !mulai.clone().add(jatuh, 'month').isAfter(kini, 'day')) jatuh++;
  const seharusnya = angsuran * jatuh;
  return {
    tenor,
    angsuran,
    pertama: mulai.format('YYYY-MM-DD'),
    terakhir: mulai.clone().add(tenor - 1, 'month').format('YYYY-MM-DD'),
    jatuhTempo: jatuh,
    berikutnya: jatuh < tenor ? mulai.clone().add(jatuh, 'month').format('YYYY-MM-DD') : null,
    tunggakan: Math.max(0, Math.round((seharusnya - (Number(dibayar) || 0)) * 100) / 100),
  };
}
