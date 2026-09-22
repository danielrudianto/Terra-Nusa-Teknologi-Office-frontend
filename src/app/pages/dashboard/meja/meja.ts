/**
 * Meja kerja per divisi — pengelompokan tahap papan antrean (`kpi/antrean`)
 * dan tenggat (`dashboard/tenggat`) untuk dasbor.
 *
 * Datanya TIDAK dihitung ulang di sini: papan antrean sudah menyaring tahap
 * menurut izin (tahap yang tidak boleh dikerjakan tidak dikirim sama sekali)
 * dan sudah menghitung umur tunggunya. Yang dilakukan berkas ini hanya
 * menyusunnya menurut divisi yang biasa mengerjakannya.
 */

export type KodeDivisi = 'procurement' | 'engineering' | 'fat' | 'hrd';

export interface DefDivisi {
  kode: KodeDivisi;
  /** Kunci terjemahan judulnya. */
  judul: string;
  ikon: string;
  /** Tahap papan antrean yang termasuk divisi ini, berurutan. */
  tahap: string[];
}

export const DIVISI: DefDivisi[] = [
  {
    kode: 'procurement',
    judul: 'meja.divisi.procurement',
    ikon: 'shopping_cart',
    tahap: ['poPeriksa', 'poSetujui', 'tender', 'tenderBerjalan', 'drafPembelian', 'pembelianDraft'],
  },
  {
    kode: 'engineering',
    judul: 'meja.divisi.engineering',
    ikon: 'engineering',
    tahap: ['copBap', 'copSetujui'],
  },
  {
    kode: 'fat',
    judul: 'meja.divisi.fat',
    ikon: 'account_balance',
    tahap: ['pembayaran', 'faktur', 'reimbursement'],
  },
  {
    kode: 'hrd',
    judul: 'meja.divisi.hrd',
    ikon: 'badge',
    tahap: ['hrNilai', 'hrPutuskan', 'formulirKaryawan'],
  },
];

/** Halaman tempat tahap itu dikerjakan. */
export const RUTE_TAHAP: Record<string, string> = {
  poPeriksa: '/Purchase-order',
  poSetujui: '/Purchase-order',
  tender: '/Tender',
  tenderBerjalan: '/Tender',
  drafPembelian: '/Purchase-draft',
  pembelianDraft: '/Purchase',
  copBap: '/Certificate-of-payment',
  copSetujui: '/Certificate-of-payment',
  pembayaran: '/Payment',
  faktur: '/Sales-invoice',
  reimbursement: '/Reimbursement',
  hrNilai: '/HrCandidate',
  hrPutuskan: '/HrCandidate',
  formulirKaryawan: '/Master/Employee',
};

/** Umur tunggu (hari) mulai dianggap tertahan — sama dengan papan antrean. */
export const HARI_TERTAHAN = 15;
/** Umur tunggu mulai perlu diperhatikan. */
export const HARI_WASPADA = 8;

export interface TahapAntrean {
  kode: string;
  modul?: string;
  jumlah: number | null;
  tertuaHari: number | null;
  ember?: Record<string, number>;
  gagal?: boolean;
}

export interface KelompokDivisi extends DefDivisi {
  baris: TahapAntrean[];
  jumlah: number;
  tertuaHari: number;
  /** Divisi pengguna sendiri — didahulukan. */
  milikSaya: boolean;
}

/**
 * Tahap -> kelompok divisi.
 *
 * - Divisi tanpa satu pun tahap yang boleh dilihat TIDAK muncul.
 * - Divisi pengguna didahulukan; sisanya menurut urutan `DIVISI`.
 * - Tahap yang tidak terdaftar di divisi mana pun (tahap baru di server)
 *   tidak dibuang diam-diam: ia dikumpulkan di `lainnya`, dan layar
 *   menampilkannya sebagai kelompok "Lainnya".
 */
export function kelompokkan(
  tahap: TahapAntrean[],
  divisiSaya: string[] = [],
): { kelompok: KelompokDivisi[]; lainnya: TahapAntrean[] } {
  const perKode = new Map(tahap.map((t) => [t.kode, t]));
  const terpakai = new Set<string>();

  const kelompok: KelompokDivisi[] = [];
  for (const d of DIVISI) {
    const baris = d.tahap.map((k) => perKode.get(k)).filter((t): t is TahapAntrean => !!t);
    if (!baris.length) continue;
    baris.forEach((b) => terpakai.add(b.kode));
    kelompok.push({
      ...d,
      baris,
      jumlah: baris.reduce((a, b) => a + (Number(b.jumlah) || 0), 0),
      tertuaHari: baris.reduce((a, b) => Math.max(a, Number(b.tertuaHari) || 0), 0),
      milikSaya: divisiSaya.map((x) => String(x).toLowerCase()).includes(d.kode),
    });
  }
  kelompok.sort((a, b) => Number(b.milikSaya) - Number(a.milikSaya));

  const lainnya = tahap.filter((t) => !terpakai.has(t.kode));
  return { kelompok, lainnya };
}

/** Ringkasan untuk petak angka di puncak dasbor. */
export interface RingkasanAntrean {
  menunggu: number;
  tertahan: number;
  tertuaHari: number;
  /** Tahap yang memegang dokumen TERTUA — tujuan petak "tertahan". */
  tertuaKode: string | null;
}

export function ringkasAntrean(tahap: TahapAntrean[]): RingkasanAntrean {
  let menunggu = 0;
  let tertahan = 0;
  let tertuaHari = 0;
  let tertuaKode: string | null = null;
  for (const t of tahap) {
    menunggu += Number(t.jumlah) || 0;
    tertahan += Number(t.ember?.['15+']) || 0;
    const h = Number(t.tertuaHari) || 0;
    if ((Number(t.jumlah) || 0) > 0 && h > tertuaHari) {
      tertuaHari = h;
      tertuaKode = t.kode;
    }
  }
  return { menunggu, tertahan, tertuaHari, tertuaKode };
}

/** Tingkat umur: warna baris. */
export function tingkatUmur(hari: number | null | undefined): 'aman' | 'waspada' | 'tertahan' {
  const h = Number(hari) || 0;
  if (h >= HARI_TERTAHAN) return 'tertahan';
  if (h >= HARI_WASPADA) return 'waspada';
  return 'aman';
}

/** Rute halaman tenggat menurut jenisnya. */
export const RUTE_TENGGAT: Record<string, string> = {
  rencanaKeluar: '/Calendar',
  pembayaranTerjadwal: '/Payment',
  hutangJatuhTempo: '/Purchase',
  tenderTutup: '/Tender',
  pajak: '/Taxing',
};
