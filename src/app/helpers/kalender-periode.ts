/**
 * Cakupan unduhan kalender — satu bulan, atau rentang tanggal apa pun.
 *
 * Seluruh perakit berkas dulunya berputar `hari = 1..totalHari` di dalam
 * SATU bulan. Bentuk itu tidak sekadar membatasi; ia membuat rentang lintas
 * bulan mustahil dinyatakan, dan tiga tempat menyusun tanggalnya sendiri
 * dengan `${tahun}-${dd(bulan)}-${dd(hari)}`. Semua penyusunan tanggal
 * dipindahkan ke sini supaya ketiganya tidak dapat lagi berbeda.
 *
 * SELURUH tanggal di berkas ini adalah TEKS `YYYY-MM-DD`, dan `Date` hanya
 * dipakai sebagai alat hitung dengan konstruktor LOKAL `new Date(y, b, h)`.
 * `new Date('2026-09-15')` diurai sebagai tengah malam UTC; dibandingkan
 * dengan tanggal lokal ia bergeser satu hari bagi pembaca di sebelah timur
 * Greenwich — dan Karma berjalan di UTC, jadi uji tidak akan pernah
 * menangkapnya.
 */

const NAMA_BULAN_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const SINGKAT_BULAN_ID = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

/** Satu bulan yang tersentuh rentang, beserta bagian yang termasuk. */
export interface BlokBulan {
  /** 1–12. */
  bulan: number;
  tahun: number;
  /** `September 2026` — dipakai sebagai judul kisi dan nama lembar. */
  label: string;
  /** Hari pertama bulan itu pada kolom kalender; 0 = Senin. */
  hariPertama: number;
  /** Jumlah hari bulan itu — kisinya tetap utuh sebulan penuh. */
  totalHari: number;
  /** Hari pertama & terakhir bulan itu yang IKUT rentang (1-based). */
  dariHari: number;
  sampaiHari: number;
}

const p2 = (n: number) => String(n).padStart(2, '0');

/** `YYYY-MM-DD` dari komponen tanggal lokal. */
export function teksTanggal(tahun: number, bulan: number, hari: number): string {
  return `${tahun}-${p2(bulan)}-${p2(hari)}`;
}

/** Mengurai `YYYY-MM-DD` menjadi `[tahun, bulan, hari]`; `null` bila tidak terbaca. */
export function uraiTanggal(teks: string): [number, number, number] | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(teks ?? ''));
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** Jumlah hari dalam satu bulan. `new Date(y, b, 0)` = hari terakhir bulan `b`. */
export function hariDalamBulan(tahun: number, bulan: number): number {
  return new Date(tahun, bulan, 0).getDate();
}

/** Kolom hari pertama bulan itu; 0 = Senin, mengikuti susunan kolom kalender. */
export function kolomHariPertama(tahun: number, bulan: number): number {
  return (new Date(tahun, bulan - 1, 1).getDay() + 6) % 7;
}

/**
 * Seluruh tanggal dari `mulai` sampai `akhir`, KEDUANYA termasuk.
 *
 * Melangkah dengan `setDate(+1)` pada `Date` lokal, bukan menambah 86400000
 * milidetik: hari yang bergeser karena pergantian waktu musim panas bukan 24
 * jam, dan penambahan milidetik menghasilkan tanggal yang sama dua kali atau
 * melompati satu. Indonesia tidak mengenalnya, tetapi peramban yang zona
 * waktunya disetel lain tetap menjalankan kode ini.
 */
export function daftarTanggal(mulai: string, akhir: string): string[] {
  const a = uraiTanggal(mulai);
  const b = uraiTanggal(akhir);
  if (!a || !b) return [];

  const hasil: string[] = [];
  const kursor = new Date(a[0], a[1] - 1, a[2]);
  const henti = new Date(b[0], b[1] - 1, b[2]);

  while (kursor.getTime() <= henti.getTime()) {
    hasil.push(
      teksTanggal(kursor.getFullYear(), kursor.getMonth() + 1, kursor.getDate()),
    );
    kursor.setDate(kursor.getDate() + 1);
  }
  return hasil;
}

/**
 * Bulan-bulan yang tersentuh rentang, berurutan.
 *
 * Kisinya tetap SEBULAN PENUH sekalipun rentangnya memotongnya di tengah.
 * Kisi tujuh kolom itu memang bentuk bulan — dipotong, kolom hari-nya tidak
 * lagi sejajar dengan tanggalnya, dan yang membacanya salah membaca hari.
 * Hari di luar rentang dikosongkan, bukan dihilangkan; `dariHari`/
 * `sampaiHari` yang menentukan mana yang diisi.
 */
export function blokBulan(mulai: string, akhir: string): BlokBulan[] {
  const a = uraiTanggal(mulai);
  const b = uraiTanggal(akhir);
  if (!a || !b) return [];
  if (new Date(a[0], a[1] - 1, a[2]) > new Date(b[0], b[1] - 1, b[2])) return [];

  const hasil: BlokBulan[] = [];
  let tahun = a[0];
  let bulan = a[1];

  // Batas iterasi: tanpa ini, tanggal yang tidak masuk akal (tahun 9999)
  // memutar selamanya dan tab-nya membeku tanpa satu pun pesan.
  for (let putaran = 0; putaran < 1200; putaran++) {
    const total = hariDalamBulan(tahun, bulan);
    const awalBulanIni = tahun === a[0] && bulan === a[1];
    const akhirBulanIni = tahun === b[0] && bulan === b[1];

    hasil.push({
      bulan,
      tahun,
      label: `${NAMA_BULAN_ID[bulan - 1]} ${tahun}`,
      hariPertama: kolomHariPertama(tahun, bulan),
      totalHari: total,
      dariHari: awalBulanIni ? a[2] : 1,
      sampaiHari: akhirBulanIni ? b[2] : total,
    });

    if (akhirBulanIni) break;
    bulan += 1;
    if (bulan > 12) {
      bulan = 1;
      tahun += 1;
    }
  }

  return hasil;
}

/**
 * Judul periode untuk kop berkas dan nama unduhan.
 *
 * Sebulan penuh disebut sebagai bulannya — `September 2026` — karena itulah
 * yang dicari orang di folder. Rentang yang memotong bulan disebut kedua
 * ujungnya, supaya tidak ada berkas dengan nama "September" yang isinya
 * separuh Oktober.
 */
export function labelPeriode(mulai: string, akhir: string): string {
  const a = uraiTanggal(mulai);
  const b = uraiTanggal(akhir);
  if (!a || !b) return '';

  const sebulanPenuh =
    a[0] === b[0] &&
    a[1] === b[1] &&
    a[2] === 1 &&
    b[2] === hariDalamBulan(b[0], b[1]);

  if (sebulanPenuh) return `${NAMA_BULAN_ID[a[1] - 1]} ${a[0]}`;

  const kiri =
    a[0] === b[0]
      ? `${a[2]} ${SINGKAT_BULAN_ID[a[1] - 1]}`
      : `${a[2]} ${SINGKAT_BULAN_ID[a[1] - 1]} ${a[0]}`;
  return `${kiri} – ${b[2]} ${SINGKAT_BULAN_ID[b[1] - 1]} ${b[0]}`;
}

/** Potongan `labelPeriode` yang aman untuk nama berkas. */
export function labelBerkas(mulai: string, akhir: string): string {
  return labelPeriode(mulai, akhir)
    .replace(/\s*–\s*/g, '_sd_')
    .replace(/\s+/g, '_')
    .replace(/[\\/:*?"<>|]/g, '-');
}
