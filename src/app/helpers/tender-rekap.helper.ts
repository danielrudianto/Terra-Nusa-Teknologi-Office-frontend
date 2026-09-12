/**
 * Rekap tender: perbandingan penawaran dalam bentuk yang dapat dicetak.
 *
 * Layar perbandingan sudah menampilkan seluruhnya berdampingan, tetapi ia
 * tidak dapat dilampirkan pada permintaan persetujuan dan tidak dapat
 * diarsipkan. Yang meninjau keputusan pengadaan setahun kemudian membaca
 * berkas, bukan membuka aplikasi.
 *
 * Dua bentuk, dan keduanya perlu:
 *
 *   PDF    untuk dilampirkan dan ditandatangani — bentuknya tetap
 *   Excel   untuk ditelusuri sendiri — angkanya dapat dihitung ulang
 */

import { Workbook } from 'exceljs';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

import {
  DOCUMENT_DEFAULT_STYLE,
  DOCUMENT_PAGE,
  DOCUMENT_STYLES,
  documentFooter,
  documentHeader,
  formatDate,
  rupiah,
} from './purchase-order-shared.helper';

import { documentFonts } from '../constants/document-font.constant';

(pdfMake as any).vfs = (pdfFonts as any).vfs;

export interface BarisRekap {
  id: number;
  name: string;
  specification?: string | null;
  quantity?: number | null;
  unit?: string | null;
}

export interface PenawaranRekap {
  id: number;
  supplierName?: string;
  supplierPrefix?: string;
  paymentTerm?: string | null;
  creditTerm?: number | null;
  includePpn?: boolean;
  ppnPercentage?: number | null;
  deliveryMethod?: string | null;
  otherCost?: number | null;
  otherCostNote?: string | null;
  notes?: string | null;
  // Kapan balasannya masuk; dicatat manual karena datangnya lewat WhatsApp.
  //
  // Tidak dipakai kedua pencetak, tetapi ikut disebut di sini karena bentuk
  // ini yang menggambarkan satu penawaran — dan dialog lihat penawaran
  // menampilkannya. Mendefinisikannya terpisah di sana berarti dua bentuk
  // untuk satu baris tabel yang sama.
  quotedAt?: string | null;
  /** Nomor pada surat penawaran PEMASOK; bukan nomor buatan sistem ini. */
  quotationNumber?: string | null;
  /**
   * Keterangan pemasok, berkategori.
   *
   * Menggantikan `notes` yang satu teks bebas. Pada rekap cetak ia menjadi
   * SATU BARIS PER KATEGORI, sehingga syarat pembayaran tiap pemasok sejajar
   * dan dapat dibaca berdampingan — sebelumnya seluruh keterangan menumpuk
   * di satu baris dan yang membandingkannya harus membaca dua paragraf utuh
   * untuk menemukan kalimat yang sebanding.
   */
  noteList?: Array<{
    category: string;
    content: string;
    sortOrder?: number;
  }> | null;
  items: Array<{ tenderItemID: number; price?: number | null; notes?: string | null }>;
}

export interface DataRekap {
  nomor?: number | null;
  nama: string;
  proyek: string;
  jenis: 'barang' | 'jasa';
  tanggal: string;
  uraian?: string | null;
  ketentuan?: string | null;
  items: BarisRekap[];
  quotes: PenawaranRekap[];
}

// ----------------------------------------------------------------------
// Perhitungan — SATU sumber untuk PDF dan Excel
// ----------------------------------------------------------------------

/**
 * Dikumpulkan di sini, bukan disalin ke masing-masing pencetak.
 *
 * Dua salinan rumus berarti satu di antaranya pasti tertinggal ketika
 * perhitungannya disesuaikan — dan yang membandingkan PDF dengan Excel-nya
 * menemukan dua angka berbeda untuk tender yang sama.
 */
export function hargaBaris(q: PenawaranRekap, itemId: number): number | null {
  const b = (q.items ?? []).find((x) => x.tenderItemID === itemId);
  return b && b.price !== null && b.price !== undefined ? Number(b.price) : null;
}

export function subtotal(d: DataRekap, q: PenawaranRekap): number {
  return d.items.reduce((a, it) => {
    const h = hargaBaris(q, it.id);
    return a + (h ?? 0) * (Number(it.quantity) || 0);
  }, 0);
}

export function nilaiPpn(d: DataRekap, q: PenawaranRekap): number {
  if (!q.includePpn) return 0;
  return (subtotal(d, q) * (Number(q.ppnPercentage) || 0)) / 100;
}

export function dibayarkan(d: DataRekap, q: PenawaranRekap): number {
  return subtotal(d, q) + nilaiPpn(d, q);
}

/**
 * Biaya yang benar-benar ditanggung AKN.
 *
 * PPN yang dipungut PKP dikreditkan sebagai pajak masukan sehingga tidak
 * menjadi beban; biaya lain — ongkos angkut pada Loco, bongkar muat —
 * seluruhnya menjadi beban.
 */
export function biayaSebenarnya(d: DataRekap, q: PenawaranRekap): number {
  return subtotal(d, q) + (Number(q.otherCost) || 0);
}

export function jumlahDitawar(d: DataRekap, q: PenawaranRekap): number {
  return d.items.filter((it) => hargaBaris(q, it.id) !== null).length;
}

export function tidakLengkap(d: DataRekap, q: PenawaranRekap): boolean {
  return jumlahDitawar(d, q) < d.items.length;
}

/** Potong teks yang melebihi panjang tertentu, dengan elipsis. */
function potong(teks: string, maks: number): string {
  const t = String(teks || '').trim();
  return t.length <= maks ? t : t.slice(0, maks - 1) + '…';
}

function namaPemasok(q: PenawaranRekap): string {
  return `${q.supplierPrefix ?? ''} ${q.supplierName ?? ''}`.trim();
}

function terminTeks(q: PenawaranRekap): string {
  if (!q.paymentTerm) return '—';
  return q.creditTerm ? `${q.paymentTerm} · ${q.creditTerm} hari` : q.paymentTerm;
}

/**
 * Kategori keterangan, beserta namanya pada berkas cetak.
 *
 * Sengaja TIDAK memakai `@ngx-translate` di sini: kedua pencetak menghasilkan
 * dokumen berbahasa Indonesia apa pun bahasa antarmukanya — sama seperti PO
 * dan slip gaji — dan menariknya dari terjemahan akan membuat lembar yang
 * sama tercetak dalam dua bahasa tergantung siapa yang menekan tombolnya.
 *
 * Urutannya sama dengan di layar; daftar yang berbeda urutan membuat yang
 * membandingkan layar dengan berkasnya harus mencari barisnya dua kali.
 */
const KATEGORI_CETAK: ReadonlyArray<{ nilai: string; judul: string }> = [
  { nilai: 'pembayaran', judul: 'Ket. pembayaran' },
  { nilai: 'teknis', judul: 'Ket. teknis' },
  { nilai: 'nonteknis', judul: 'Ket. non-teknis' },
  { nilai: 'lainnya', judul: 'Ket. lain-lain' },
];

/** Kategori yang BENAR-BENAR diisi pada tender ini. */
function kategoriTerpakaiCetak(d: DataRekap): typeof KATEGORI_CETAK {
  const ada = new Set<string>();
  for (const q of d.quotes ?? []) {
    for (const k of q.noteList ?? []) {
      if (String(k?.content ?? '').trim()) ada.add(k.category);
    }
  }
  return KATEGORI_CETAK.filter((k) => ada.has(k.nilai));
}

/** Seluruh keterangan satu pemasok pada satu kategori, digabung. */
function keteranganCetak(q: PenawaranRekap, kategori: string): string {
  const isi = (q.noteList ?? [])
    .filter((k) => k?.category === kategori)
    .map((k) => String(k.content ?? '').trim())
    .filter(Boolean);
  return isi.length ? isi.join('\n') : '—';
}

/** Nomor pada surat penawaran pemasok; kosong bila tidak dicatat. */
function nomorPenawaran(q: PenawaranRekap): string {
  return String(q.quotationNumber ?? '').trim();
}

function kirimTeks(q: PenawaranRekap): string {
  if (q.deliveryMethod === 'loco') return 'Loco';
  if (q.deliveryMethod === 'franco') return 'Franco';
  return '—';
}

// ----------------------------------------------------------------------
// PDF
// ----------------------------------------------------------------------

/**
 * Paling banyak pemasok yang masih terbaca dalam satu halaman.
 *
 * Lebih dari ini, tiap kolomnya menyusut di bawah 52pt dan angka rupiah
 * terpotong di tengah — lebih baik dibagi dua lembar daripada dicetak
 * menjadi sesuatu yang tidak dapat dibaca.
 */
export const MAKS_PEMASOK_CETAK = 9;

export function berkasRekapTender(d: DataRekap) {
  /*
   * Lebar kolom DITENTUKAN, bukan `auto`.
   *
   * `auto` melebar mengikuti isinya — dan nama pemasok panjang seperti
   * "PT Sumber Rezeki Abadi Sentosa" mendorong tabelnya melewati tepi
   * halaman, memotong kolom terakhir tanpa peringatan.
   *
   * Lebar per pemasok dihitung dari ruang yang tersisa: A4 landscape
   * 841,89pt dikurangi margin 45+45, lalu dikurangi kolom barang.
   */
  const LEBAR_HALAMAN = 841.89 - 90;
  const LEBAR_BARANG = Math.max(140, LEBAR_HALAMAN * 0.28);
  const lebarPenawaran = Math.max(
    52,
    (LEBAR_HALAMAN - LEBAR_BARANG) / Math.max(1, d.quotes.length),
  );
  const lebar = [LEBAR_BARANG, ...d.quotes.map(() => lebarPenawaran)];

  const kepalaTabel = [
    { text: d.jenis === 'jasa' ? 'Pekerjaan' : 'Barang', style: 'th' },
    ...d.quotes.map((q) => ({
      text: [
        // Nama dipotong bila terlalu panjang: kolomnya sudah ditentukan
        // lebarnya, dan nama yang melimpah menumpuk ke baris berikutnya
        // sampai kepala tabelnya setinggi setengah halaman.
        { text: potong(namaPemasok(q), 28) },
        // Nomor surat penawarannya, supaya lembar ini dapat dipakai menunjuk
        // dokumen aslinya saat keputusannya ditinjau kembali.
        nomorPenawaran(q)
          ? {
              text: `\n${potong(nomorPenawaran(q), 24)}`,
              fontSize: 7,
              bold: false,
            }
          : '',
        tidakLengkap(d, q)
          ? {
              text: `\n${jumlahDitawar(d, q)}/${d.items.length} baris`,
              fontSize: 7,
              italics: true,
            }
          : '',
      ],
      style: 'th',
      alignment: 'center' as const,
    })),
  ];

  const barisHarga = d.items.map((it) => [
    {
      text: [
        { text: it.name },
        it.specification ? { text: `\n${it.specification}`, fontSize: 7, color: '#666' } : '',
        it.quantity
          ? { text: `\n${Number(it.quantity).toLocaleString('id-ID')} ${it.unit ?? ''}`, fontSize: 7, color: '#666' }
          : '',
      ],
      style: 'td',
    },
    ...d.quotes.map((q) => {
      const h = hargaBaris(q, it.id);
      return {
        text: h === null ? '—' : rupiah(h),
        style: 'td',
        alignment: 'right' as const,
      };
    }),
  ]);

  const terendah = (() => {
    const lengkap = d.quotes.filter((q) => !tidakLengkap(d, q));
    return lengkap.length < 2
      ? null
      : Math.min(...lengkap.map((q) => biayaSebenarnya(d, q)));
  })();

  const barisRingkas = (
    label: string,
    isi: (q: PenawaranRekap) => string,
    tebal = false,
  ) => [
    { text: label, style: tebal ? 'thRingkas' : 'tdRingkas' },
    ...d.quotes.map((q) => ({
      text: isi(q),
      style: tebal ? 'thRingkas' : 'tdRingkas',
      alignment: 'right' as const,
    })),
  ];

  const doc: any = {
    ...DOCUMENT_PAGE,
    header: documentHeader,
    footer: documentFooter,
    content: [
      {
        text: 'REKAP PERBANDINGAN PENAWARAN',
        style: 'judul',
        margin: [0, 0, 0, 4],
      },
      {
        text: [
          d.nomor ? `Tender No. ${d.nomor}   ·   ` : '',
          `${d.nama}`,
        ],
        style: 'subjudul',
      },
      {
        text: `Proyek ${d.proyek}   ·   ${formatDate(d.tanggal)}`,
        style: 'subjudul',
        margin: [0, 0, 0, 10],
      },

      ...(d.uraian
        ? [{ text: d.uraian, style: 'uraian', margin: [0, 0, 0, 8] }]
        : []),

      {
        table: {
          headerRows: 1,
          widths: lebar,
          body: [
            kepalaTabel,
            ...barisHarga,
            barisRingkas('Subtotal', (q) => rupiah(subtotal(d, q))),
            barisRingkas('Pengiriman', kirimTeks),
            barisRingkas('PPN', (q) =>
              q.includePpn ? `${q.ppnPercentage ?? 0}%` : 'Non-PKP',
            ),
            barisRingkas('Dibayarkan', (q) => rupiah(dibayarkan(d, q))),
            barisRingkas('Biaya lain', (q) =>
              q.otherCost ? rupiah(Number(q.otherCost)) : '—',
            ),
            barisRingkas(
              'BIAYA SEBENARNYA',
              (q) =>
                rupiah(biayaSebenarnya(d, q)) +
                (terendah !== null &&
                !tidakLengkap(d, q) &&
                biayaSebenarnya(d, q) === terendah
                  ? '  *'
                  : ''),
              true,
            ),
            barisRingkas('Termin', terminTeks),
            // SATU BARIS PER KATEGORI, dan hanya yang benar-benar diisi.
            //
            // Sebelumnya seluruh keterangan menumpuk di satu baris, sehingga
            // membandingkan syarat pembayaran dua pemasok menuntut membaca
            // dua paragraf utuh lebih dulu untuk menemukan kalimat yang
            // sebanding. Di lembar cetak itu lebih parah daripada di layar:
            // tidak ada yang dapat digulir atau diperbesar.
            ...kategoriTerpakaiCetak(d).map((kat) =>
              barisRingkas(kat.judul, (q) => keteranganCetak(q, kat.nilai)),
            ),
          ],
        },
        layout: {
          hLineWidth: (i: number, node: any) =>
            i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#999',
          vLineColor: () => '#ccc',
        },
      },

      /*
       * Keterangan tanda bintang, dan batasannya.
       *
       * Yang ditandai bukan pemenangnya — waktu kirim, garansi, dan riwayat
       * pemasok ikut menentukan. Menyebutnya di lembar yang ditandatangani
       * mencegah pembacanya menyimpulkan keputusan sudah diambil sistem.
       */
      {
        text:
          '*  Biaya sebenarnya terendah di antara penawaran yang lengkap. ' +
          'Bukan penetapan pemenang: waktu kirim, garansi, dan riwayat pemasok ' +
          'ikut menentukan.',
        style: 'catatan',
        margin: [0, 8, 0, 0],
      },
      {
        text:
          'PPN yang dipungut PKP dapat dikreditkan sehingga tidak menjadi beban; ' +
          'biaya lain seluruhnya menjadi beban. Karena itu yang dibandingkan ' +
          'adalah baris BIAYA SEBENARNYA, bukan harga yang tertulis pada penawaran.',
        style: 'catatan',
        margin: [0, 4, 0, 0],
      },

      ...(d.ketentuan
        ? [
            {
              text: `Ketentuan tender: ${d.ketentuan}`,
              style: 'catatan',
              margin: [0, 8, 0, 0],
            },
          ]
        : []),

      // Ruang tanda tangan; lembar ini dilampirkan pada permintaan
      // persetujuan, dan tanpa ruangnya harus dicetak ulang.
      {
        columns: [
          { text: 'Disusun oleh,\n\n\n\n(_______________)', alignment: 'center' },
          { text: 'Diperiksa oleh,\n\n\n\n(_______________)', alignment: 'center' },
          { text: 'Disetujui oleh,\n\n\n\n(_______________)', alignment: 'center' },
        ],
        style: 'ttd',
        margin: [0, 30, 0, 0],
      },
    ],
    styles: {
      ...DOCUMENT_STYLES,
      judul: { fontSize: 14, bold: true },
      subjudul: { fontSize: 9 },
      uraian: { fontSize: 8.5, italics: true },
      th: { fontSize: 8, bold: true, fillColor: '#eef1f8', margin: [2, 4, 2, 4] },
      td: { fontSize: 8, margin: [2, 3, 2, 3] },
      thRingkas: { fontSize: 8, bold: true, fillColor: '#f6f8ff', margin: [2, 3, 2, 3] },
      tdRingkas: { fontSize: 8, margin: [2, 3, 2, 3] },
      catatan: { fontSize: 7.5, color: '#555', italics: true },
      ttd: { fontSize: 8.5 },
    },
    defaultStyle: DOCUMENT_DEFAULT_STYLE,
    // Mendatar: satu kolom per pemasok, dan lima pemasok tidak muat tegak.
    pageOrientation: 'landscape',
  };

  // Calibri HARUS ikut dikirim ke createPdf.
  //
  // `DOCUMENT_DEFAULT_STYLE` meminta font 'Calibri', tetapi pdfmake hanya
  // membawa Roboto pada vfs bawaannya. Tanpa `fonts`/`vfs` di sini, pdfmake
  // melempar "Font 'Calibri' in style 'bold' is not defined" — dan karena
  // galatnya terjadi saat menyusun tata letak, TIDAK ADA berkas yang keluar
  // sama sekali. Tombolnya seperti tidak berfungsi.
  const baseVfs = (pdfFonts as any).vfs ?? (pdfFonts as any);
  const { fonts, vfs } = documentFonts(baseVfs);

  return pdfMake.createPdf(doc, undefined, fonts as any, vfs as any);
}

/**
 * Susun berkas PDF-nya, tanpa membuka atau mengunduh.
 *
 * Dipisahkan supaya wiring font-nya dapat diuji: `getBuffer()` di atas hasil
 * fungsi ini menjalankan penyusunan tata letak yang sama persis dengan yang
 * dijalankan tombol Cetak — termasuk pemuatan fontnya.
 */
export function cetakRekapTender(
  d: DataRekap,
  output: 'open' | 'download' = 'open',
) {
  const pdf = berkasRekapTender(d);
  const berkas = `Rekap_Tender_${d.nomor ?? ''}_${d.proyek}.pdf`;
  if (output === 'download') pdf.download(berkas);
  else pdf.open();
}

// ----------------------------------------------------------------------
// Excel
// ----------------------------------------------------------------------

/*
 * Lembar ini sebelumnya hanya diisi, tidak dibentuk.
 *
 * Isinya sudah benar sejak awal — yang tidak ada adalah kisi. Tanpa garis,
 * mata tidak punya pegangan untuk melompat dari nama pemasok di kepala kolom
 * ke angkanya belasan baris di bawah, dan pada enam pemasok kesalahan baca
 * satu kolom bukan kemungkinan melainkan kepastian. Untuk lembar yang
 * seluruh gunanya adalah MEMBANDINGKAN antar kolom, itu menghapus gunanya.
 *
 * Tiga hal lain yang membuatnya tidak dapat dipakai sebagai lembar kerja:
 *
 *   * Tanggal ditulis sebagai TEKS, sehingga tidak dapat diurutkan atau
 *     dihitung selisihnya.
 *   * PPN ditulis "11%" sebagai TEKS, sehingga tidak dapat dikalikan.
 *   * Lebar kolom 18 memotong angka ratusan juta menjadi `#######`.
 *
 * Bentuk di bawah mengikuti berkas yang Daniel rapikan sendiri di Excel.
 */

/** Abu-abu garis kisi; cukup gelap untuk terbaca, cukup pucat untuk tidak berisik. */
const GARIS_KISI = 'FF9E9E9E';

/** Bingkai luar dan pemisah kepala; lebih tegas supaya bloknya terbaca dari jauh. */
const GARIS_BINGKAI = 'FF4A4A4A';

/**
 * Garis satu sel, dengan sisi tebal yang dipilih.
 *
 * Tiap sisi mendapat objeknya SENDIRI — bukan satu acuan yang dipakai
 * bersama. Objek bersama membuat ExcelJS menuliskan `<color auto="1"/>`
 * alih-alih warnanya, dan `auto` nyaris tak terlihat di sebagian penampil:
 * garisnya terpasang, tetapi yang membuka berkasnya melihat lembar tanpa
 * kotak sama sekali. Sudah pernah terjadi pada kisi kalender.
 */
function tepiSel(tebal: {
  kiri?: boolean;
  kanan?: boolean;
  atas?: boolean;
  bawah?: boolean;
}): any {
  const sisi = (t?: boolean) => ({
    style: t ? 'medium' : 'thin',
    color: { argb: t ? GARIS_BINGKAI : GARIS_KISI },
  });
  return {
    top: sisi(tebal.atas),
    left: sisi(tebal.kiri),
    bottom: sisi(tebal.bawah),
    right: sisi(tebal.kanan),
  };
}

/**
 * Tanggal sebagai TANGGAL, bukan teks yang kebetulan berbentuk tanggal.
 *
 * Yang membuka rekap ini mengurutkan, menyaring, dan menghitung selisih hari
 * terhadapnya. Teks "2026-09-08" tidak dapat diapa-apakan — dan kegagalannya
 * tidak bersuara: rumusnya menjawab `#VALUE!` atau, lebih buruk, mengurutkan
 * secara alfabet tanpa memberi tahu.
 *
 * Bila isinya memang tidak dapat dibaca sebagai tanggal, teks aslinya
 * dikembalikan apa adanya — lebih baik menampilkan yang tertulis daripada
 * menebak.
 */
function nilaiTanggal(teks: string): Date | string {
  const t = String(teks || '').trim();
  if (!t) return '';
  const d = new Date(t);
  return isNaN(d.getTime()) ? t : d;
}

/**
 * Susun buku kerjanya, tanpa mengunduh.
 *
 * Dipisahkan dari `unduhRekapTenderExcel` supaya bentuknya dapat DIPERIKSA:
 * yang mengunduh memanggil `URL.createObjectURL` dan menekan tautan, dan
 * pengujian tidak dapat membaca apa pun dari sana. Pemisahan yang sama sudah
 * dipakai pada PDF — `berkasRekapTender` menyusun, `cetakRekapTender`
 * mencetak.
 *
 * Ini bukan pemisahan demi kerapian. Yang membuat unduhan ini bertahun-tahun
 * tampil tanpa kisi adalah tidak adanya satu pun uji yang benar-benar membuka
 * hasilnya.
 */
export async function berkasRekapTenderExcel(d: DataRekap): Promise<Workbook> {
  const wb = new Workbook();

  const kolomTerakhir = d.quotes.length + 1;

  const sheet = wb.addWorksheet('Perbandingan', {
    // Kolom nama pekerjaan dan seluruh blok kepala ikut dibekukan, sehingga
    // menggulir ke pemasok keenam tidak menghilangkan nama barisnya.
    views: [{ state: 'frozen', xSplit: 1, ySplit: 5 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  });

  sheet.getColumn(1).width = 38;
  // 24, bukan 18. Angka ratusan juta berformat ribuan butuh sekitar 15
  // karakter; 18 menyisakan terlalu sedikit dan Excel menggantinya dengan
  // `#######` — yang terbaca sebagai berkas rusak, bukan sebagai kolom sempit.
  d.quotes.forEach((_, i) => (sheet.getColumn(i + 2).width = 24));

  const kolom = (n: number) => ({ kiri: n === 1, kanan: n === kolomTerakhir });

  // ---------------------------------------------------------------- kepala

  sheet.mergeCells(1, 1, 1, kolomTerakhir);
  const judul = sheet.getCell(1, 1);
  judul.value = 'REKAP PERBANDINGAN PENAWARAN';
  judul.font = { bold: true, size: 13 };
  judul.alignment = { horizontal: 'center', vertical: 'middle' };
  /*
   * Garis rentang gabungan disetel SEKALI pada sel induknya.
   *
   * Menyetelnya per kolom seperti pada baris biasa justru merusaknya:
   * seluruh sel dalam satu rentang gabungan berbagi gaya induknya, sehingga
   * tulisan terakhir menang dan bingkai KIRI blok judul berpindah menjadi
   * bingkai kanan. Yang tampak: kotak judul terbuka di sisi kiri.
   */
  judul.border = tepiSel({ atas: true, kiri: true, kanan: true });
  sheet.getRow(1).height = 18;

  const keterangan: Array<[string, any, string | undefined]> = [
    [d.nomor ? `Tender No. ${d.nomor}` : 'Tender', d.nama, undefined],
    ['Proyek', d.proyek, undefined],
    ['Tanggal', nilaiTanggal(d.tanggal), 'd-mmm-yy'],
  ];

  keterangan.forEach(([label, nilai, fmt], i) => {
    const r = i + 2;
    const label_ = sheet.getCell(r, 1);
    label_.value = label;
    label_.border = tepiSel({ kiri: true });

    sheet.mergeCells(r, 2, r, kolomTerakhir);
    const c = sheet.getCell(r, 2);
    c.value = nilai;
    c.alignment = { horizontal: 'left', vertical: 'middle' };
    c.border = tepiSel({ kanan: true });
    if (fmt) c.numFmt = fmt;
  });

  // ----------------------------------------------------------- baris kepala

  const BARIS_KEPALA = 5;
  const kepala = sheet.getRow(BARIS_KEPALA);
  [
    d.jenis === 'jasa' ? 'Pekerjaan' : 'Barang',
    // Nomor penawaran ikut di kepala kolom, di bawah nama pemasoknya.
    ...d.quotes.map((q) =>
      nomorPenawaran(q)
        ? `${namaPemasok(q)}\n${nomorPenawaran(q)}`
        : namaPemasok(q),
    ),
  ].forEach(
    (v, i) => {
      const c = kepala.getCell(i + 1);
      c.value = v;
      c.font = { bold: true };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF1F8' } };
      c.alignment = { vertical: 'middle', wrapText: true };
      c.border = tepiSel({ ...kolom(i + 1), atas: true, bawah: true });
    },
  );
  /*
   * Lebih tinggi bila ada nomor penawaran.
   *
   * Kepala kolomnya jadi dua baris, dan tinggi tetap 32 memotong baris
   * keduanya — nomornya tersimpan di sel tetapi tidak terlihat, yang lebih
   * membingungkan daripada tidak ada sama sekali.
   */
  kepala.height = d.quotes.some((q) => nomorPenawaran(q)) ? 42 : 32;

  // ------------------------------------------------------------ baris barang

  let baris = BARIS_KEPALA;

  for (const it of d.items) {
    baris += 1;
    const nama = [
      it.name,
      it.specification,
      it.quantity ? `${Number(it.quantity).toLocaleString('id-ID')} ${it.unit ?? ''}` : '',
    ]
      .filter(Boolean)
      .join(' · ');

    const r = sheet.getRow(baris);
    r.getCell(1).value = nama;
    r.getCell(1).alignment = { vertical: 'middle', wrapText: true };
    d.quotes.forEach((q, i) => {
      const c = r.getCell(i + 2);
      c.value = hargaBaris(q, it.id) ?? null;
      c.numFmt = '#,##0';
      c.alignment = { horizontal: 'right', vertical: 'middle' };
    });
    for (let c = 1; c <= kolomTerakhir; c++) r.getCell(c).border = tepiSel(kolom(c));
    r.height = 30;
  }

  // Baris kosong pemisah, tetap ikut berkisi.
  //
  // Kisi yang putus di sini membelah tabelnya menjadi dua yang tampak tidak
  // berhubungan — padahal justru baris ringkasan di bawahnyalah yang menjadi
  // kesimpulan dari yang di atas.
  baris += 1;
  const pemisah = sheet.getRow(baris);
  for (let c = 1; c <= kolomTerakhir; c++) pemisah.getCell(c).border = tepiSel(kolom(c));
  pemisah.height = 8;

  // -------------------------------------------------------- baris ringkasan

  const tambah = (
    label: string,
    nilai: any[],
    opsi: {
      tebal?: boolean;
      latar?: string;
      fmt?: string;
      rata?: 'left' | 'center' | 'right';
      bungkus?: boolean;
      tinggi?: number;
    } = {},
  ) => {
    baris += 1;
    const r = sheet.getRow(baris);
    r.getCell(1).value = label;

    nilai.forEach((v, i) => {
      const c = r.getCell(i + 2);
      c.value = v;
      if (opsi.fmt) c.numFmt = opsi.fmt;
      c.alignment = {
        horizontal: opsi.rata ?? (typeof v === 'number' ? 'right' : 'left'),
        vertical: opsi.bungkus ? 'top' : 'middle',
        wrapText: !!opsi.bungkus,
      };
    });

    for (let c = 1; c <= kolomTerakhir; c++) {
      const sel = r.getCell(c);
      sel.border = tepiSel(kolom(c));
      if (opsi.tebal) sel.font = { bold: true };
      if (opsi.latar) {
        sel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opsi.latar } };
      }
    }
    if (opsi.tinggi) r.height = opsi.tinggi;
    return r;
  };

  tambah('Subtotal', d.quotes.map((q) => subtotal(d, q)), { fmt: '#,##0' });
  tambah('Pengiriman', d.quotes.map(kirimTeks), { rata: 'center' });

  /*
   * PPN sebagai PECAHAN, bukan teks "11%".
   *
   * Teks tidak dapat dikalikan. Yang membuka rekap ini kerap mengubah
   * persentasenya untuk melihat pengaruhnya pada nilai yang dibayarkan — dan
   * dengan teks, rumusnya menjawab `#VALUE!`.
   *
   * Pemasok non-PKP tetap ditulis "Non-PKP": nol persen dan tidak memungut
   * PPN adalah dua keadaan berbeda, dan menuliskan keduanya sebagai 0%
   * menghilangkan bedanya.
   */
  tambah(
    'PPN',
    d.quotes.map((q) => (q.includePpn ? (Number(q.ppnPercentage) || 0) / 100 : 'Non-PKP')),
    { fmt: '0%', rata: 'right' },
  );

  tambah('Nilai PPN', d.quotes.map((q) => nilaiPpn(d, q)), { fmt: '#,##0' });
  tambah('Dibayarkan', d.quotes.map((q) => dibayarkan(d, q)), { fmt: '#,##0' });
  tambah('Biaya lain', d.quotes.map((q) => Number(q.otherCost) || 0), { fmt: '#,##0' });
  tambah('Keterangan biaya lain', d.quotes.map((q) => q.otherCostNote || '—'), {
    bungkus: true,
    tinggi: 30,
  });

  tambah('BIAYA SEBENARNYA', d.quotes.map((q) => biayaSebenarnya(d, q)), {
    tebal: true,
    latar: 'FFE7ECFB',
    fmt: '#,##0',
  });

  tambah('Termin', d.quotes.map(terminTeks), { rata: 'center' });

  /*
   * Baris keterangan diberi tinggi TETAP dan dibungkus.
   *
   * Tinggi otomatis tidak berlaku pada sel yang dibungkus melalui berkas —
   * Excel baru menghitungnya ketika selnya disunting tangan. Tanpa tinggi
   * yang disetel, keterangan sepanjang tiga kalimat tampil sebagai satu baris
   * terpotong, dan justru keterangan itulah yang paling menentukan pada
   * perbandingan penawaran: uang muka 70%, BBM ditanggung siapa, mob-demob
   * yang menyesuaikan harga BBM.
   */
  /*
   * Keterangan: SATU BARIS PER KATEGORI, hanya yang diisi.
   *
   * Tingginya tetap dan dibungkus — tinggi otomatis tidak berlaku pada sel
   * yang dibungkus lewat berkas; Excel baru menghitungnya ketika selnya
   * disunting tangan. Tanpa tinggi yang disetel, keterangan sepanjang tiga
   * kalimat tampil sebagai satu baris terpotong.
   *
   * 72, bukan 120: dengan kategori, tiap barisnya memuat satu pokok saja dan
   * jauh lebih pendek daripada ketika seluruhnya menumpuk di satu sel.
   */
  for (const kat of kategoriTerpakaiCetak(d)) {
    tambah(
      kat.judul,
      d.quotes.map((q) => keteranganCetak(q, kat.nilai)),
      { bungkus: true, tinggi: 72 },
    );
  }

  // ---------------------------------------------------------------- catatan

  baris += 1;
  sheet.mergeCells(baris, 1, baris, kolomTerakhir);
  const catatan = sheet.getCell(baris, 1);
  catatan.value =
    'PPN yang dipungut PKP dapat dikreditkan sehingga tidak menjadi beban; ' +
    'biaya lain seluruhnya menjadi beban. Bandingkan baris BIAYA SEBENARNYA, ' +
    'bukan harga yang tertulis pada penawaran.';
  catatan.font = { italic: true, size: 9, color: { argb: 'FF666666' } };
  catatan.alignment = { horizontal: 'left', vertical: 'middle' };
  // Sekali pada induknya — lihat catatan pada baris judul.
  catatan.border = tepiSel({ kiri: true, kanan: true, bawah: true });
  sheet.getRow(baris).height = 16;

  return wb;
}

export async function unduhRekapTenderExcel(d: DataRekap): Promise<void> {
  const wb = await berkasRekapTenderExcel(d);

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Rekap_Tender_${d.nomor ?? ''}_${d.proyek}.xlsx`;
  a.click();
  // Alamat objek dilepas; tanpa ini berkasnya tetap di memori peramban
  // sampai halamannya ditutup.
  URL.revokeObjectURL(url);
}
