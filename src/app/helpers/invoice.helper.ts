import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { Alignment, Margins, PageSize } from 'pdfmake/interfaces';
import { documentFonts } from '../constants/document-font.constant';

/**
 * Invoice & kuitansi tenaga kerja.
 *
 * Berbeda dengan dokumen PO, berkas ini diterbitkan **oleh supplier untuk
 * PT. Alpha Konstruksi Nusantara**, sehingga tidak memakai kop surat Alpha.
 * Yang dicetak: halaman 1 invoice, halaman 2 kuitansi dengan nomor sama.
 */

export interface IInvoiceItem {
  /** Mata pekerjaan: Upah Harian, Lembur, Bonus. */
  name: string;
  quantity: number;
  unit: string;
  price: number;
}

export interface IInvoiceDocument {
  /**
   * Lampiran SPK: isi dokumen yang sudah dirakit helper PO-D.
   * Dicetak di belakang kuitansi bila SPK-nya ketemu di basis data.
   */
  attachment?: any[];

  /** Nomor dokumen, mis. 05-021-INV-R501-VIII-2026. */
  invoiceNumber: string;
  /** Kota penerbitan, mengikuti lokasi proyek. */
  city: string;
  /** Tanggal invoice. */
  date: Date | string;
  /** Nama supplier/pekerja yang menandatangani. */
  supplierName: string;
  items: IInvoiceItem[];
  bankAccountNumber: string;
  bankAccountName: string;
  bankName: string;
  /** Keterangan periode kerja untuk kuitansi. */
  periode?: string;
  /** Uraian pekerjaan pada kuitansi, mengikuti jenis upah yang dibayarkan. */
  keterangan?: string;
}

export type PdfOutput = 'open' | 'print' | 'download';

const MONTHS = [
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

const RECIPIENT = [
  'PT. Alpha Konstruksi Nusantara',
  'Ruko Asia Tropis blok AT 12 no. 21,',
  'Kota Harapan Indah, Kab. Bekasi',
];

function formatDate(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '-';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function rupiah(value: number): string {
  return (Number(value) || 0).toLocaleString('id-ID', {
    maximumFractionDigits: 0,
  });
}

/** Ubah angka menjadi terbilang; dipakai pada kuitansi. */
export function terbilang(value: number): string {
  const satuan = [
    '',
    'satu',
    'dua',
    'tiga',
    'empat',
    'lima',
    'enam',
    'tujuh',
    'delapan',
    'sembilan',
    'sepuluh',
    'sebelas',
  ];

  const eja = (n: number): string => {
    if (n < 12) return satuan[n];
    if (n < 20) return `${eja(n - 10)} belas`;
    if (n < 100) return `${eja(Math.floor(n / 10))} puluh ${eja(n % 10)}`;
    if (n < 200) return `seratus ${eja(n - 100)}`;
    if (n < 1000) return `${eja(Math.floor(n / 100))} ratus ${eja(n % 100)}`;
    if (n < 2000) return `seribu ${eja(n - 1000)}`;
    if (n < 1_000_000)
      return `${eja(Math.floor(n / 1000))} ribu ${eja(n % 1000)}`;
    if (n < 1_000_000_000)
      return `${eja(Math.floor(n / 1_000_000))} juta ${eja(n % 1_000_000)}`;
    return `${eja(Math.floor(n / 1_000_000_000))} miliar ${eja(
      n % 1_000_000_000,
    )}`;
  };

  const hasil = eja(Math.round(Number(value) || 0))
    .replace(/\s+/g, ' ')
    .trim();
  if (!hasil) return 'nol rupiah';
  return `${hasil.charAt(0).toUpperCase()}${hasil.slice(1)} rupiah`;
}

function itemsTable(data: IInvoiceDocument, total: number) {
  const th = (text: string, align: Alignment = 'center') => ({
    text,
    bold: true,
    alignment: align,
    fillColor: undefined,
  });

  const rows = data.items.map((item, i) => {
    const jumlah = (Number(item.quantity) || 0) * (Number(item.price) || 0);
    return [
      { text: `${i + 1}.`, alignment: 'center' as Alignment },
      { text: item.name || '-' },
      {
        text: `${rupiah(item.quantity)} ${item.unit || ''}`.trim(),
        alignment: 'center' as Alignment,
      },
      { text: rupiah(item.price), alignment: 'right' as Alignment },
      { text: rupiah(jumlah), alignment: 'right' as Alignment },
    ];
  });

  return {
    table: {
      headerRows: 1,
      widths: [24, '*', 70, 90, 95],
      body: [
        [
          th('No.'),
          th('Mata Pekerjaan', 'left'),
          th('Volume'),
          th('Harga Satuan (Rp.)', 'right'),
          th('Harga Total (Rp.)', 'right'),
        ],
        ...rows,
        [
          {
            text: 'Total',
            colSpan: 4,
            alignment: 'right' as Alignment,
            bold: true,
          },
          {},
          {},
          {},
          { text: rupiah(total), alignment: 'right' as Alignment, bold: true },
        ],
      ],
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => '#9aa1ad',
      vLineColor: () => '#9aa1ad',
      paddingTop: () => 4,
      paddingBottom: () => 4,
    },
    margin: [0, 8, 0, 12] as Margins,
  };
}

/** Blok rekening tujuan pembayaran. */
function bankBlock(data: IInvoiceDocument) {
  const row = (label: string, value: string) => [
    { text: label },
    { text: ':', alignment: 'center' as Alignment },
    { text: value || '-' },
  ];

  return {
    lineHeight: 1,
    stack: [
      {
        text: 'Mohon dibayarkan ke rekening:',
        margin: [0, 0, 0, 4] as Margins,
      },
      {
        table: {
          widths: [90, 10, '*'],
          body: [
            row('Nomor akun', data.bankAccountNumber),
            row('Nama akun', data.bankAccountName),
            row('Nama bank', data.bankName),
          ],
        },
        layout: 'noBorders' as any,
      },
    ],
  };
}

function signatureBlock(data: IInvoiceDocument) {
  return {
    unbreakable: true,
    stack: [
      { text: 'Hormat kami,' },
      { text: '\n\n\n' },
      { text: data.supplierName, bold: true },
    ],
    margin: [0, 18, 0, 0] as Margins,
  };
}

export function printInvoiceDocument(
  data: IInvoiceDocument,
  output: PdfOutput = 'open',
) {
  const total = data.items.reduce(
    (acc, item) =>
      acc + (Number(item.quantity) || 0) * (Number(item.price) || 0),
    0,
  );

  const heading = (title: string) => [
    {
      text: `${data.city}, ${formatDate(data.date)}`,
      alignment: 'right' as Alignment,
      margin: [0, 0, 0, 10] as Margins,
    },
    { text: title, style: 'docTitle' },
    {
      text: `No.: ${data.invoiceNumber}`,
      alignment: 'center' as Alignment,
      lineHeight: 1,
      margin: [0, 0, 0, 14] as Margins,
    },
  ];

  const dd = {
    pageSize: 'A4' as PageSize,
    pageMargins: [50, 45, 50, 45] as Margins,
    content: [
      // ---------- halaman 1: invoice ----------
      ...heading('INVOICE'),
      { text: 'Kepada Yth.', margin: [0, 0, 0, 2] as Margins },
      { lineHeight: 1, stack: RECIPIENT.map((text) => ({ text })) },

      itemsTable(data, total),
      bankBlock(data),
      signatureBlock(data),

      // ---------- halaman 2: kuitansi ----------
      {
        text: '',
        pageBreak: 'before' as any,
      },
      ...heading('KUITANSI'),
      {
        table: {
          widths: [130, 10, '*'],
          body: [
            [
              { text: 'Telah terima dari' },
              { text: ':', alignment: 'center' as Alignment },
              { text: RECIPIENT[0], bold: true },
            ],
            [
              { text: 'Uang sejumlah' },
              { text: ':', alignment: 'center' as Alignment },
              { text: terbilang(total), italics: true },
            ],
            [
              { text: 'Untuk pembayaran' },
              { text: ':', alignment: 'center' as Alignment },
              {
                text: [
                  data.keterangan || 'Upah pekerjaan',
                  data.periode ? `periode ${data.periode}` : '',
                ]
                  .filter(Boolean)
                  .join(' '),
              },
            ],
          ],
        },
        layout: 'noBorders' as any,
        margin: [0, 4, 0, 14] as Margins,
      },
      {
        // nominal ditonjolkan seperti kuitansi cetak pada umumnya
        table: {
          widths: ['auto'],
          body: [[{ text: `Rp ${rupiah(total)}`, bold: true, fontSize: 15 }]],
        },
        layout: {
          hLineWidth: () => 0.8,
          vLineWidth: () => 0.8,
          hLineColor: () => '#16181d',
          vLineColor: () => '#16181d',
          paddingLeft: () => 12,
          paddingRight: () => 12,
          paddingTop: () => 6,
          paddingBottom: () => 6,
        },
        margin: [0, 0, 0, 6] as Margins,
      },
      signatureBlock(data),

      ,
      // ---------- lampiran: SPK yang bersangkutan ----------
      ...(data.attachment?.length
        ? [
            {
              text: '',
              pageBreak: 'before' as any,
            },
            ...data.attachment,
          ]
        : []),
    ],
    styles: {
      docTitle: {
        fontSize: 16,
        bold: true,
        alignment: 'center' as Alignment,
        lineHeight: 1,
        margin: [0, 0, 0, 2] as Margins,
      },
    },
    defaultStyle: { font: 'Calibri', fontSize: 11, lineHeight: 1.15 },
  };

  const baseVfs = (pdfFonts as any).vfs ?? (pdfFonts as any);
  const { fonts, vfs } = documentFonts(baseVfs);
  const pdf = pdfMake.createPdf(dd as any, undefined, fonts as any, vfs as any);
  const fileName = `${data.invoiceNumber}.pdf`;

  if (output === 'print') return pdf.print();
  if (output === 'download') return pdf.download(fileName);
  return pdf.open();
}
