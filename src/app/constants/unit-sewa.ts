/**
 * Jumlah alat pada satu baris sewa, dipisahkan dari DURASINYA.
 *
 * Baris sewa punya dua pengali yang berbeda artinya:
 *
 *     10 set scaffolding  ×  1 bulan  ×  Rp 50.000 per set per bulan
 *     └── jumlah alat ──┘     └ durasi ┘
 *
 * Sebelumnya hanya ada satu, `quantity`, sehingga penyewaan sepuluh set
 * selama sebulan tidak dapat ditulis dengan benar. Yang tersedia hanya dua
 * jalan, dan keduanya menghasilkan dokumen yang keliru: menulis volume 10
 * dengan satuan "bulan" — dokumennya berbunyi sepuluh BULAN — atau menulis
 * volume 1 dengan harga sepuluh kali lipat, yang menyembunyikan harga satuan
 * yang justru diperiksa vendor.
 *
 * Disimpan pada `remarks_6`, satu-satunya kolom keterangan yang belum
 * terpakai pada varian sewa. Bentuknya `jumlah|satuan`, mis. `10|set`.
 * Mengikuti kebiasaan yang sudah ada di dokumen ini — tiap varian
 * memampatkan isian barisnya ke `remarks_1..6` dengan arti masing-masing.
 */

/** Satuan jumlah alat; yang dihitung BENDANYA, bukan waktunya. */
export const SATUAN_ALAT = ['set', 'unit', 'buah', 'lot'] as const;

/** Bawaan bila dokumen lama tidak menyimpannya. */
export const JUMLAH_ALAT_BAWAAN = 1;
export const SATUAN_ALAT_BAWAAN = 'set';

/** Rakit `remarks_6` dari isian barisnya. */
export function simpanJumlahAlat(jumlah: unknown, satuan: unknown): string {
  const n = Number(jumlah);
  const j = isFinite(n) && n > 0 ? n : JUMLAH_ALAT_BAWAAN;
  const s = String(satuan || '').trim() || SATUAN_ALAT_BAWAAN;
  return `${j}|${s}`;
}

/**
 * Baca `remarks_6` kembali menjadi isian barisnya.
 *
 * Dokumen LAMA tidak punya kolom ini, dan yang kembali `null` atau teks
 * kosong. Keduanya dibaca sebagai satu — persis keadaan sebelum kolom ini
 * ada — sehingga dokumen lama terbuka dan tercetak sama seperti sebelumnya.
 */
export function bacaJumlahAlat(nilai: unknown): {
  jumlahUnit: number;
  satuanUnit: string;
} {
  const teks = String(nilai ?? '').trim();
  if (!teks) {
    return {
      jumlahUnit: JUMLAH_ALAT_BAWAAN,
      satuanUnit: SATUAN_ALAT_BAWAAN,
    };
  }

  const [angka, satuan] = teks.split('|');
  const n = Number(angka);
  return {
    jumlahUnit: isFinite(n) && n > 0 ? n : JUMLAH_ALAT_BAWAAN,
    satuanUnit: (satuan || '').trim() || SATUAN_ALAT_BAWAAN,
  };
}

/**
 * Bentuk VOLUME dan SATUAN sebagaimana dicetak pada tabel dokumen.
 *
 * Tabelnya berkolom `Volume | Satuan | Harga Satuan | Jumlah`, dan yang
 * memeriksanya mengalikan volume dengan harga satuan lalu mencocokkannya
 * dengan jumlah. Karena itu volumenya HARUS hasil kali kedua pengali —
 * sepuluh set selama tiga bulan tercetak 30, bukan 10 — kalau tidak,
 * perkaliannya tidak pernah cocok dan yang memeriksa menyangka ada salah
 * hitung.
 *
 * Bila jumlah alatnya satu, bentuknya dikembalikan PERSIS seperti sebelum
 * kolom ini ada. Itu disengaja: seluruh dokumen lama harus tercetak sama
 * dengan cetakan aslinya, sampai ke satuannya.
 */
export function volumeCetak(
  jumlahUnit: unknown,
  quantity: unknown,
  unit: string,
): { volume: number; satuan: string } {
  const alat = Number(jumlahUnit) || JUMLAH_ALAT_BAWAAN;
  const durasi = Number(quantity) || 0;
  return { volume: alat * durasi, satuan: unit };
}

/**
 * Keterangan rincian, mis. "10 set × 3 bulan".
 *
 * Kosong bila jumlah alatnya satu — tidak ada yang perlu diuraikan, dan
 * menambahkan "1 set × 3 bulan" pada setiap baris dokumen lama hanya
 * membuatnya lebih ramai tanpa menambah keterangan.
 */
export function rincianSewa(
  jumlahUnit: unknown,
  satuanUnit: unknown,
  quantity: unknown,
  unit: string,
): string {
  const alat = Number(jumlahUnit) || JUMLAH_ALAT_BAWAAN;
  if (alat <= 1) return '';

  const satuan = String(satuanUnit || '').trim() || SATUAN_ALAT_BAWAAN;
  const durasi = Number(quantity) || 0;
  return `${alat} ${satuan} × ${durasi} ${unit}`;
}
