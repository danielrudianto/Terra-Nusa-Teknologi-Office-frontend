/**
 * Logika murni pencarian global — dipisah dari komponennya supaya dapat
 * diuji tanpa merender dialog.
 */

export interface HasilServer {
  id: number;
  judul: string;
  sub?: string | null;
  tanggal?: string | null;
  kunci?: string | null;
}

export interface KelompokServer {
  jenis: string;
  hasil: HasilServer[];
}

export interface ButirMenu {
  name: string; // kunci i18n
  route: string;
  icon?: string;
  grup?: string;
}

export interface Tujuan {
  perintah: any[];
  queryParams?: Record<string, any>;
}

/** Ikon dan label kelompok per jenis. */
export const KELOMPOK_INFO: Record<string, { ikon: string; label: string }> = {
  proyek: { ikon: 'apartment', label: 'cariGlobal.proyek' },
  klien: { ikon: 'business', label: 'cariGlobal.klien' },
  pemasok: { ikon: 'local_shipping', label: 'cariGlobal.pemasok' },
  purchase_order: { ikon: 'receipt_long', label: 'cariGlobal.purchaseOrder' },
  pembelian: { ikon: 'shopping_cart', label: 'cariGlobal.pembelian' },
  faktur_penjualan: { ikon: 'request_quote', label: 'cariGlobal.fakturPenjualan' },
  tender: { ikon: 'gavel', label: 'cariGlobal.tender' },
  karyawan: { ikon: 'badge', label: 'cariGlobal.karyawan' },
};

/**
 * Ke mana sebuah hasil dibuka.
 *
 * Yang punya halaman rinci (proyek, tender) dibuka langsung. PO membuka
 * dialog rincinya di atas daftar (`?open=`). Sisanya membuka DAFTAR yang
 * sudah tersaring (`?search=`) — mereka tidak punya halaman rinci tersendiri,
 * dan daftar tersaring satu baris lebih berguna daripada tidak ke mana-mana.
 */
export function tujuanHasil(jenis: string, h: HasilServer): Tujuan | null {
  const cari = { search: h.kunci || h.judul };
  switch (jenis) {
    case 'proyek':
      return { perintah: ['/Project', h.id] };
    case 'tender':
      return { perintah: ['/Tender', h.id] };
    case 'purchase_order':
      return { perintah: ['/Purchase-order'], queryParams: { open: h.id } };
    case 'pembelian':
      return { perintah: ['/Purchase'], queryParams: cari };
    case 'faktur_penjualan':
      return { perintah: ['/Sales-invoice'], queryParams: cari };
    case 'klien':
      return { perintah: ['/Master/Client'], queryParams: cari };
    case 'pemasok':
      return { perintah: ['/Master/Supplier'], queryParams: cari };
    case 'karyawan':
      return { perintah: ['/Master/Employee'], queryParams: cari };
    default:
      return null;
  }
}

/**
 * Menu yang cocok — dicocokkan pada teks TAMPILAN (sudah diterjemahkan),
 * bukan kuncinya, sama seperti "Cari menu" di menu samping. Yang diawali
 * ketikan didahulukan: "pem" → "Pembelian" sebelum "Tagihan Pembayaran".
 */
export function cocokkanMenu(
  menu: ButirMenu[],
  q: string,
  terjemah: (k: string) => string,
  batas = 6,
): ButirMenu[] {
  const kata = q.trim().toLowerCase();
  if (!kata) return [];
  const skor = (b: ButirMenu) => {
    const t = (terjemah(b.name) || b.name).toLowerCase();
    if (t.startsWith(kata)) return 0;
    if (t.split(/\s+/).some((w) => w.startsWith(kata))) return 1;
    if (t.includes(kata)) return 2;
    return -1;
  };
  return menu
    .map((b) => ({ b, s: skor(b) }))
    .filter((x) => x.s >= 0)
    .sort((a, b) => a.s - b.s)
    .slice(0, batas)
    .map((x) => x.b);
}
