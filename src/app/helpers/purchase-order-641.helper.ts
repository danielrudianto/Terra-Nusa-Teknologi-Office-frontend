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
 * Surat Perintah Kerja jasa pengurusan legalitas & perizinan (PO 6.4.1).
 *
 * Ciri khas dokumen ini: tagihannya memuat dua komponen yang berbeda sifat.
 *
 *   nilai jasa   — pendapatan PIHAK KEDUA, dikenakan PPN dan dipotong PPh
 *   biaya resmi  — PNBP, retribusi, iuran lembaga; hanya dititipkan, jadi
 *                  ditagihkan sesuai bukti setor tanpa penambahan
 *
 * Keduanya dicetak sebagai tabel terpisah, dan hanya nilai jasa yang masuk
 * perhitungan PPN. Mencampurnya membuat PPN dan PPh terhitung dari angka
 * yang bukan penghasilan vendor.
 */

/** Satu baris pekerjaan pengurusan. */
export interface IPurchaseOrder641Item {
  /** Jenis pengurusan, mis. "Perpanjangan SBU". */
  task: string;
  /** Objek yang diurus, mis. "SBU BS004 Bangunan Gedung". */
  description?: string;
  /** Target penyelesaian dalam hari kerja sejak berkas lengkap. */
  targetDays?: number | string;
  quantity: number;
  unit: string;
  price: number;
}

/** Satu baris perkiraan biaya resmi. */
export interface IPurchaseOrder641Fee {
  /** Uraian biaya, mis. "PNBP pengesahan akta". */
  task: string;
  description?: string;
  amount: number;
}

export interface IPurchaseOrder641 {
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
  /** Baris jasa; menjadi dasar PPN. */
  items: IPurchaseOrder641Item[];
  /** Perkiraan biaya resmi; di luar dasar PPN. */
  officialFees?: IPurchaseOrder641Fee[];
  includePpn: boolean;
  /** Seksi klausul hasil `buildLegalServiceClauses`. */
  sections: { title?: string; items: (string | string[])[] }[];
  /** Lampiran hasil `buildLegalServiceBillingTerms`. */
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

const LIST_STYLES = ['decimal', 'lower-alpha', 'lower-roman'];

function nestedList(items: any[], level = 0): any {
  return {
    ol: items.map((item) => {
      if (Array.isArray(item)) return nestedList(item, level + 1);
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

function sectionTitle(text: string) {
  return {
    text,
    bold: true,
    margin: [0, 10, 0, 4] as Margins,
  };
}

/** Baris identitas vendor; label dan isian dipisah kolom agar titik dua sejajar. */
function buildIdentityTable(data: IPurchaseOrder641) {
  const row = (label: string, value?: string) => [
    { text: label, style: 'td' },
    { text: label ? ':' : '', style: 'td', alignment: 'center' as Alignment },
    { text: value || '-', style: 'td' },
  ];

  const name = vendorDisplayName(data.supplierName, data.supplierPrefix);

  const rows = [row('Nama', name), row('Alamat', data.supplierAddress)];
  if (data.supplierCity) rows.push(row('', data.supplierCity));
  if (data.supplierNpwp) rows.push(row('NPWP/NIK', data.supplierNpwp));
  if (data.supplierPIC) rows.push(row('Penanggung Jawab', data.supplierPIC));

  return {
    table: { widths: [110, 10, '*'], body: rows },
    layout: 'noBorders' as any,
    margin: [0, 6, 0, 10] as Margins,
  };
}

function subTotalOf(items: IPurchaseOrder641Item[]): number {
  return (items || []).reduce(
    (acc, x) => acc + nilaiBaris(x),
    0,
  );
}

/** Tabel nilai jasa. Hanya tabel inilah yang menjadi dasar PPN. */
function buildServiceTable(data: IPurchaseOrder641) {
  const th = (text: string) => ({
    text,
    style: 'th',
    alignment: 'center' as Alignment,
    margin: [0, text.includes('\n') ? 0 : 6, 0, 0] as Margins,
  });

  const header = [
    th('No.'),
    th('Uraian Pengurusan'),
    th('Volume'),
    th('Satuan'),
    th('Harga Satuan\n(Rp.)'),
    th('Jumlah\n(Rp.)'),
  ];

  const rows = (data.items || []).map((x, i) => {
    const qty = Number(x.quantity) || 0;
    const price = Number(x.price) || 0;

    // Keterangan dan target ditulis sebagai baris kecil di bawah judulnya,
    // bukan kolom sendiri: keduanya sering kosong dan panjangnya tak menentu.
    const detail: string[] = [];
    if (x.description) detail.push(x.description);
    if (x.targetDays) {
      detail.push(
        `Target: ${x.targetDays} hari kerja sejak berkas dinyatakan lengkap`,
      );
    }

    return [
      { text: `${i + 1}.`, style: 'td', alignment: 'center' as Alignment },
      {
        style: 'td',
        stack: [
          { text: x.task || '-', bold: true },
          ...detail.map((line) => ({
            text: line,
            fontSize: 10,
            color: '#4b5563',
          })),
        ],
      },
      { text: angkaSatuan(qty), style: 'td', alignment: 'center' as Alignment },
      { text: x.unit || '-', style: 'td', alignment: 'center' as Alignment },
      { text: rupiahDokumen(price), style: 'td', alignment: 'right' as Alignment },
      {
        text: rupiahDokumen(qty * price),
        style: 'td',
        alignment: 'right' as Alignment,
      },
    ];
  });

  const subTotal = subTotalOf(data.items);
  const ppn = data.includePpn ? subTotal * 0.11 : 0;

  const summaryRow = (label: string, value: number, bold = false) => [
    {
      text: label,
      style: 'td',
      colSpan: 5,
      alignment: 'right' as Alignment,
      bold,
    },
    {},
    {},
    {},
    {},
    { text: rupiahDokumen(value), style: 'td', alignment: 'right' as Alignment, bold },
  ];

  return {
    table: {
      headerRows: 1,
      widths: [22, '*', 42, 42, 78, 82],
      body: [
        header,
        ...rows,
        summaryRow('Sub Total Jasa', subTotal),
        summaryRow('PPN 11%', ppn),
        summaryRow('Total Jasa', subTotal + ppn, true),
      ],
    },
    layout: TABLE_LAYOUT,
    margin: [0, 6, 0, 12] as Margins,
  };
}

/**
 * Tabel perkiraan biaya resmi.
 *
 * Sengaja dipisah dari tabel jasa dan diberi keterangan tegas, agar tidak
 * terbaca sebagai bagian dari nilai kontrak yang dikenakan pajak.
 */
function buildOfficialFeeTable(fees: IPurchaseOrder641Fee[]) {
  const th = (text: string) => ({
    text,
    style: 'th',
    alignment: 'center' as Alignment,
    margin: [0, text.includes('\n') ? 0 : 6, 0, 0] as Margins,
  });

  const rows = fees.map((x, i) => [
    { text: `${i + 1}.`, style: 'td', alignment: 'center' as Alignment },
    {
      style: 'td',
      stack: [
        { text: x.task || '-' },
        ...(x.description
          ? [{ text: x.description, fontSize: 10, color: '#4b5563' }]
          : []),
      ],
    },
    {
      text: rupiahDokumen(Number(x.amount) || 0),
      style: 'td',
      alignment: 'right' as Alignment,
    },
  ]);

  const total = fees.reduce((acc, x) => acc + (Number(x.amount) || 0), 0);

  return [
    {
      text: 'Perkiraan biaya resmi yang akan disetorkan atas nama PIHAK PERTAMA:',
      margin: [0, 2, 0, 4] as Margins,
    },
    {
      table: {
        headerRows: 1,
        widths: [22, '*', 100],
        body: [
          [th('No.'), th('Uraian Biaya Resmi'), th('Perkiraan\n(Rp.)')],
          ...rows,
          [
            {
              text: 'Perkiraan Total Biaya Resmi',
              style: 'td',
              colSpan: 2,
              alignment: 'right' as Alignment,
              bold: true,
            },
            {},
            {
              text: rupiahDokumen(total),
              style: 'td',
              alignment: 'right' as Alignment,
              bold: true,
            },
          ],
        ],
      },
      layout: TABLE_LAYOUT,
      margin: [0, 0, 0, 4] as Margins,
    },
    {
      text: 'Biaya resmi bukan bagian dari nilai jasa. Jumlah di atas merupakan perkiraan dan ditagihkan sesuai jumlah yang sebenarnya disetorkan, dibuktikan dengan bukti setor asli, serta tidak dikenakan PPN maupun pemotongan PPh.',
      fontSize: 10,
      color: '#4b5563',
      margin: [0, 0, 0, 12] as Margins,
    },
  ];
}

/** Tanda tangan dua pihak, sesuai dokumen SPK. */
function signatureColumns(data: IPurchaseOrder641) {
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
          // Seluruh kolom kanan diratakan ke kanan, bukan hanya bagian
          // tanda tangannya: judul yang tertinggal di kiri membuat blok itu
          // terbaca seperti dua bagian terpisah.
          { text: 'PIHAK KEDUA,', alignment: 'right' as Alignment },
          { text: vendor, alignment: 'right' as Alignment },
          /*
           * Bentuknya disamakan dengan PIHAK PERTAMA lewat `signerLines`.
           *
           * Sebelumnya nama vendor tercetak DUA KALI: sekali sebagai badan
           * usaha, sekali lagi sebagai penanda tangan — karena `supplierPIC`
           * kosong dan cadangannya nama vendornya sendiri.
           */
          ...signerLines(data.supplierPIC, data.supplierPICPosition, true),
        ],
      },
    ],
    margin: [0, 10, 0, 0] as Margins,
  };
}

export function printPurchaseOrder641(
  data: IPurchaseOrder641,
  output: PdfOutput = 'open',
) {
  const fees = (data.officialFees || []).filter(
    (x) => (Number(x.amount) || 0) > 0 || !!x.task,
  );

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

      buildIdentityTable(data),

      {
        text: 'Untuk melaksanakan pengurusan legalitas dan perizinan dengan ketentuan-ketentuan sebagai berikut:',
        margin: [0, 0, 0, 4] as Margins,
      },

      buildServiceTable(data),

      ...(fees.length ? buildOfficialFeeTable(fees) : []),

      ...(data.sections || []).flatMap((sec) => [
        sec.title
          ? sectionTitle(sec.title)
          : {
              text: 'Catatan dalam perjanjian ini:',
              margin: [0, 8, 0, 4] as Margins,
            },
        nestedList(sec.items || []),
      ]),

      {
        text: 'Demikian kami sampaikan, atas perhatiannya kami ucapkan terima kasih.',
        margin: [0, 12, 0, 18] as Margins,
      },

      signatureColumns(data),

      // ---------- lampiran: tata cara penagihan ----------
      ...(data.billingTerms?.length
        ? [
            {
              text: 'TATA CARA PENAGIHAN DAN PEMBAYARAN\nJASA PENGURUSAN LEGALITAS',
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
