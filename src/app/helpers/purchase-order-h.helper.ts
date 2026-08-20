import pdfMake from 'pdfmake/build/pdfmake';
import { nilaiBaris } from './nilai-baris.helper';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { Alignment, Margins } from 'pdfmake/interfaces';
import { documentFonts } from '../constants/document-font.constant';
import {
  DOCUMENT_DEFAULT_STYLE,
  DOCUMENT_PAGE,
  DOCUMENT_STYLES,
  PdfOutput,
  TABLE_LAYOUT,
  clauseList,
  clauseToPdf,
  documentFooter,
  documentHeader,
  formatDate,
  vendorDisplayName,
  signerLines,
  draftWatermark,
  namaProyekCetak,
  rupiahDokumen,
  angkaSatuan,
} from './purchase-order-shared.helper';

/**
 * Surat Perintah Kerja pekerjaan borongan/jasa (PO-H).
 *
 * Berbeda dengan PO barang, isinya disusun per pasal: lingkup & waktu, nilai
 * pekerjaan, kewajiban, keterangan, lalu penagihan & pembayaran.
 */

export interface IPurchaseOrderHScope {
  task: string;
  quantity: number;
  unit: string;
  price: number;
}

export interface IPurchaseOrderH {
  /**
   * Dokumen ini SUDAH DISETUJUI.
   *
   * Menentukan ada tidaknya cap air DRAFT. Keduanya diperiksa karena
   * sebagian dokumen tersimpan dengan `status` sudah "approved" sementara
   * `isApproved` masih `false`.
   */
  isApproved?: boolean;
  status?: string;

  /**
   * Dokumen ini ADENDUM atas purchase order lain.
   *
   * Mengubah kalimat pembuka lembarnya; pada varian bertabel volume, judul
   * kolomnya juga menyatakan bahwa yang dicantumkan SELISIH.
   */
  isAdendum?: boolean;

  /** Jabatan penyetuju; kosong bila belum diisi. */
  approvedByPosition?: string | null;
  /** Nama penyetuju; kosong selama dokumennya belum disetujui. */
  approvedByName?: string | null;
  purchaseOrderName: string;
  date: Date | string;
  projectName: string;
  supplierName: string;
  supplierPrefix?: string;
  supplierAddress: string;
  supplierCity?: string;
  supplierNpwp?: string;
  supplierPIC?: string;
  /** Jabatan penanggung jawab vendor; kosong tercetak sebagai penunjuk. */
  supplierPICPosition?: string;

  /** Pasal 1 — dirakit dari template klausul H. */
  pasal1: (string | string[])[];
  /** Pasal 2 — rincian lingkup pekerjaan. */
  scopes: IPurchaseOrderHScope[];
  /** Lump sum: nilai borongan tunggal, harga baris tidak dipakai. */
  isLumpSum: boolean;
  lumpSumPrice?: number;
  includePpn: boolean;
  /** Pasal 3 & 4 — daftar poin. */
  kewajiban: (string | string[])[];
  keterangan: (string | string[])[];
  /** Pasal 5 — string biasa, atau array untuk sub-poin. */
  pasal5: (string | string[])[];

  /**
   * Bentuk dokumen:
   * - 'lengkap' → disusun per pasal (borongan)
   * - 'ringkas' → satu daftar catatan, tanpa pasal (mis. buang lumpur)
   */
  mode?: 'lengkap' | 'ringkas';
  /** Daftar catatan untuk bentuk ringkas; boleh memuat sub-poin. */
  catatan?: (string | string[])[];
  /**
   * Bentuk bersekat: beberapa seksi berjudul, masing-masing dengan daftar
   * poin sendiri (mis. SPK mandor: Catatan / Laporan Lapangan / Tata Cara
   * Pembayaran). Penomoran dimulai ulang tiap seksi.
   */
  sections?: { title?: string; items: (string | string[])[] }[];
  /** Kalimat penutup; berbeda antar jenis dokumen. */
  closingText?: string;
  /**
   * Lampiran tata cara penagihan; dicetak sebagai halaman terpisah.
   * Butirnya bisa bersarang hingga tiga tingkat.
   */
  billingTerms?: any[];
}

const DAY_NAMES = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
];

function dayName(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? '-' : DAY_NAMES[d.getDay()];
}

/** Judul pasal; dibuat unbreakable agar tidak terpisah dari isinya. */
function pasalTitle(text: string) {
  return {
    text,
    bold: true,
    margin: [0, 10, 0, 4] as Margins,
  };
}

function identityTable(data: IPurchaseOrderH) {
  const row = (label: string, value?: string) => [
    { text: label, style: 'td' },
    { text: label ? ':' : '', style: 'td', alignment: 'center' as Alignment },
    { text: value || '-', style: 'td' },
  ];

  const nama = vendorDisplayName(data.supplierName, data.supplierPrefix);

  const rows = [row('Nama', nama), row('Alamat', data.supplierAddress)];
  if (data.supplierCity) rows.push(row('', data.supplierCity));
  if (data.supplierNpwp) rows.push(row('NPWP/NIK', data.supplierNpwp));
  if (data.supplierPIC) rows.push(row('Penanggung Jawab', data.supplierPIC));

  return {
    table: { widths: [110, 10, '*'], body: rows },
    layout: 'noBorders' as any,
    margin: [0, 6, 0, 8] as Margins,
  };
}

/**
 * Rincian lingkup pekerjaan.
 *
 * Pada lump sum kolom harga satuan dan jumlah tidak bermakna — nilainya satu
 * untuk seluruh pekerjaan — sehingga kolomnya tidak ditampilkan.
 */
function scopeTable(data: IPurchaseOrderH) {
  const th = (text: string) => ({
    text,
    style: 'th',
    alignment: 'center' as Alignment,
    margin: [0, text.includes('\n') ? 0 : 6, 0, 0] as Margins,
  });

  const lump = data.isLumpSum;

  const header = lump
    ? [th('No.'), th('Uraian Pekerjaan'), th('Volume'), th('Satuan')]
    : [
        th('No.'),
        th('Uraian Pekerjaan'),
        th('Volume'),
        th('Satuan'),
        th('Harga Satuan\n(Rp.)'),
        th('Jumlah\n(Rp.)'),
      ];

  const rows = data.scopes.map((s, i) => {
    const base = [
      { text: `${i + 1}.`, style: 'td', alignment: 'center' as Alignment },
      { text: s.task || '-', style: 'td' },
      {
        text: angkaSatuan(s.quantity),
        style: 'td',
        alignment: 'center' as Alignment,
      },
      { text: s.unit || '-', style: 'td', alignment: 'center' as Alignment },
    ];
    if (lump) return base;
    return [
      ...base,
      { text: rupiahDokumen(s.price), style: 'td', alignment: 'right' as Alignment },
      {
        text: rupiahDokumen(nilaiBaris(s)),
        style: 'td',
        alignment: 'right' as Alignment,
      },
    ];
  });

  // Harga yang diisi adalah DPP; PPN ditambahkan di atasnya.
  const subTotal = lump
    ? Number(data.lumpSumPrice) || 0
    : data.scopes.reduce(
        (acc, s) => acc + nilaiBaris(s),
        0,
      );
  const ppn = data.includePpn ? subTotal * 0.11 : 0;
  const total = subTotal + ppn;

  const span = lump ? 3 : 5;
  const summaryRow = (label: string, value: number, bold = false) => {
    const cells: any[] = [
      {
        text: label,
        style: 'td',
        colSpan: span,
        alignment: 'right' as Alignment,
        bold,
      },
    ];
    for (let i = 1; i < span; i++) cells.push({});
    cells.push({
      text: rupiahDokumen(value),
      style: 'td',
      alignment: 'right' as Alignment,
      bold,
    });
    return cells;
  };

  return {
    table: {
      headerRows: 1,
      widths: lump ? [22, '*', 55, 60] : [22, '*', 42, 42, 78, 82],
      body: [
        header,
        ...rows,
        summaryRow('Sub Total', subTotal),
        summaryRow('PPN', ppn),
        summaryRow('Total', total, true),
      ],
    },
    layout: TABLE_LAYOUT,
    margin: [0, 6, 0, 4] as Margins,
  };
}

/**
 * Daftar bernomor bertingkat.
 *
 * Ditulis rekursif agar sanggup menampung lampiran penagihan yang bersarang
 * sampai tiga tingkat; penomorannya berganti gaya tiap tingkat.
 */
const LIST_STYLES = ['decimal', 'lower-alpha', 'lower-roman'];

function nestedList(items: any[], level = 0): any {
  return {
    ol: items.map((item) => {
      if (Array.isArray(item)) return nestedList(item, level + 1);
      // Blok alamat dicetak rata tengah, tanpa nomor.
      if (item && typeof item === 'object' && Array.isArray(item.block)) {
        return {
          text: item.block.join('\n'),
          alignment: 'center' as Alignment,
          bold: true,
          margin: [0, 6, 0, 6] as Margins,
          listType: 'none' as any,
        };
      }
      return clauseToPdf(item);
    }),
    type: LIST_STYLES[Math.min(level, LIST_STYLES.length - 1)] as any,
    margin: [0, 0, 0, 4] as Margins,
  };
}

function signatureColumns(data: IPurchaseOrderH) {
  const vendor = vendorDisplayName(data.supplierName, data.supplierPrefix);

  return {
    unbreakable: true,
    columns: [
      {
        width: '*',
        stack: [
          { text: 'PIHAK PERTAMA,' },
          { text: 'PT. Alpha Konstruksi Nusantara' },
          // Jarak ke garis diatur `signerLines`; baris kosong tambahan
          // membuat tingginya berbeda antar dokumen.
          ...signerLines(data.approvedByName, data.approvedByPosition),
        ],
      },
      {
        width: '*',
        stack: [
          { text: 'PIHAK KEDUA,', alignment: 'right' as Alignment },
          { text: vendor, alignment: 'right' as Alignment },
          /*
           * Bentuknya disamakan dengan PIHAK PERTAMA lewat `signerLines`.
           *
           * Sebelumnya nama vendor tercetak DUA KALI: sekali sebagai badan
           * usaha, sekali lagi sebagai penanda tangan — karena `supplierPIC`
           * kosong dan cadangannya nama vendornya sendiri.
           *
           * Jabatan tetap TIDAK diasumsikan; yang belum diisi tercetak
           * sebagai penunjuk abu-abu, bukan ditebak.
           */
          ...signerLines(data.supplierPIC, data.supplierPICPosition, true),
        ],
      },
    ],
    margin: [0, 16, 0, 0] as Margins,
  };
}

export function printPurchaseOrderH(
  data: IPurchaseOrderH,
  output: PdfOutput = 'open',
) {
  const dd = {
    ...DOCUMENT_PAGE,
    // Cap DRAFT pada dokumen yang belum disetujui; `undefined`
    // bila sudah sah, dan pdfmake mengabaikan bidang itu.
    watermark: draftWatermark(data.isApproved, data.status),
    header: () => documentHeader(),
    footer: () => documentFooter(),
    content: [
      { text: 'SURAT PERINTAH KERJA', style: 'docTitle' },
      { text: `No.: ${data.purchaseOrderName}`, style: 'docSubTitle' },
      {
        // Nama PANJANG proyeknya, bukan kodenya. Kode itu sudah tercetak di
        // dalam nomor dokumen tepat di atas baris ini; mengulangnya tidak
        // menambah keterangan apa pun. Lihat `namaProyekCetak`.
        text: `Proyek: ${namaProyekCetak(data.projectName)}`,
        style: 'docSubTitle',
        margin: [0, 0, 0, 14] as Margins,
      },

      {
        text: `Pada hari ini, ${dayName(data.date)}, tanggal ${formatDate(
          data.date,
        )}, PT. Alpha Konstruksi Nusantara memberikan perintah kerja kepada:`,
      },

      identityTable(data),

      ...(data.sections?.length
        ? [
            scopeTable(data),
            ...data.sections.flatMap((sec) => [
              ...(sec.title
                ? [pasalTitle(sec.title)]
                : [
                    {
                      text: 'Catatan dalam perjanjian ini:',
                      margin: [0, 8, 0, 4] as Margins,
                    },
                  ]),
              nestedList(sec.items),
            ]),
          ]
        : data.mode === 'ringkas'
          ? [
              // Bentuk ringkas: rincian pekerjaan lalu satu daftar catatan.
              scopeTable(data),
              {
                text: 'Catatan dalam perjanjian ini:',
                margin: [0, 6, 0, 4] as Margins,
              },
              nestedList(data.catatan || []),
            ]
          : [
              pasalTitle('PASAL 1 — LINGKUP DAN WAKTU PEKERJAAN'),
              clauseList(data.pasal1),

              pasalTitle('PASAL 2 — NILAI PEKERJAAN'),
              scopeTable(data),

              pasalTitle('PASAL 3 — KEWAJIBAN'),
              clauseList(data.kewajiban),

              pasalTitle('PASAL 4 — KETERANGAN'),
              clauseList(data.keterangan),

              pasalTitle('PASAL 5 — PENAGIHAN DAN PEMBAYARAN'),
              nestedList(data.pasal5),
            ]),

      {
        text:
          data.closingText ||
          (data.mode === 'ringkas'
            ? 'Demikian kami sampaikan, atas perhatiannya kami ucapkan terima kasih.'
            : 'Demikian surat perintah kerja ini dibuat untuk dilaksanakan sebagaimana mestinya.'),
        margin: [0, 12, 0, 0] as Margins,
      },

      signatureColumns(data),

      // ---------- lampiran: tata cara penagihan ----------
      ...(data.billingTerms?.length
        ? [
            {
              text: 'TATA CARA PENAGIHAN DAN PEMBAYARAN\nPENYEDIA JASA',
              style: 'docTitle',
              pageBreak: 'before' as any,
              margin: [0, 0, 0, 12] as Margins,
            },
            nestedList(data.billingTerms),
          ]
        : []),
    ],
    styles: DOCUMENT_STYLES,
    defaultStyle: DOCUMENT_DEFAULT_STYLE,
  };

  const baseVfs = (pdfFonts as any).vfs ?? (pdfFonts as any);
  const { fonts, vfs } = documentFonts(baseVfs);
  const pdf = pdfMake.createPdf(dd as any, undefined, fonts as any, vfs as any);
  const fileName = `${data.purchaseOrderName}.pdf`;

  // Definisi dokumen dikembalikan apa adanya, tanpa membuat PDF.
  //
  // Dipakai saat beberapa dokumen harus terbit sebagai SATU berkas —
  // mencetak adendum menyertakan induk dan adendum sebelumnya.
  if (output === 'docdef') return dd as any;

  if (output === 'dataurl') {
    // Dikembalikan sebagai Promise: pdfMake menyerahkan hasilnya lewat
    // callback, sementara pemanggilnya perlu menunggu berkasnya jadi
    // sebelum dialog ditampilkan.
    return new Promise<string>((selesai) => pdf.getDataUrl((url) => selesai(url)));
  }
  if (output === 'print') return pdf.print();
  if (output === 'download') return pdf.download(fileName);
  return pdf.open();
}
