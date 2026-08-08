import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { Alignment, Margins, PageSize } from 'pdfmake/interfaces';
import {
  ClauseContext,
  OFFICE_CONTACT,
  buildClauseLines,
} from '../constants/clause-templates';
import {
  APPROVAL_BOX,
  FOOTER_RULE,
  LETTERHEAD,
  OFFICE_FOOTER,
} from '../constants/letterhead.constant';
import { documentFonts } from '../constants/document-font.constant';

// Font TIDAK didaftarkan lewat variabel global pdfMake.vfs — helper PDF
// lain menimpanya saat modul dimuat, sehingga Calibri bisa hilang dari
// virtual file system. Konfigurasinya dikirim langsung ke createPdf().

export interface IPurchaseOrderGItem {
  name: string; // nama pekerjaan / barang
  quantity: number;
  unit: string;
  price: number; // harga satuan
}

export interface IPurchaseOrderG {
  purchaseOrderName: string; // 157-PO-TSKBP-G
  date: Date | string; // tanggal PO
  projectName: string; // Tatar Surawisesa-KBP (TSKBP)
  supplierName: string;
  supplierAddress: string;
  /** Kota (+ provinsi) supplier — dicetak sebagai baris tersendiri. */
  supplierCity?: string;
  supplierNpwp?: string;
  items: IPurchaseOrderGItem[];
  includePpn: boolean;
  /** Data sumber klausul — kalimatnya dirakit di sini, bukan diambil dari DB. */
  templateVersion?: string;
  clauseContext: ClauseContext;
  additionalClauses?: string[];
}

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

function formatDate(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '-';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function rupiah(value: number): string {
  return (Number(value) || 0).toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/** Baris tabel barang + baris Sub Total / PPN / Total. */
function buildItemTable(data: IPurchaseOrderG) {
  // Semua judul kolom rata tengah.
  // pdfmake tidak punya properti vertical-align. Judul kolom harga memakai
  // dua baris, jadi judul satu baris diberi margin atas agar seluruh header
  // terlihat sejajar di tengah.
  const th = (text: string) => ({
    text,
    style: 'th',
    alignment: 'center' as Alignment,
    margin: [0, text.includes('\n') ? 0 : 6, 0, 0] as Margins,
  });

  const header = [
    th('No.'),
    th('Nama Barang'),
    th('Volume'),
    th('Satuan'),
    // satuan mata uang ditaruh di baris bawah agar judul tetap ringkas
    th('Harga Satuan\n(Rp.)'),
    th('Jumlah\n(Rp.)'),
  ];

  const rows = data.items.map((item, i) => {
    const amount = (Number(item.quantity) || 0) * (Number(item.price) || 0);
    return [
      { text: `${i + 1}.`, style: 'td', alignment: 'center' as Alignment },
      { text: item.name || '-', style: 'td' },
      {
        text: rupiah(item.quantity),
        style: 'td',
        alignment: 'center' as Alignment,
      },
      { text: item.unit || '-', style: 'td', alignment: 'center' as Alignment },
      {
        text: rupiah(item.price),
        style: 'td',
        alignment: 'right' as Alignment,
      },
      { text: rupiah(amount), style: 'td', alignment: 'right' as Alignment },
    ];
  });

  const subTotal = data.items.reduce(
    (acc, item) =>
      acc + (Number(item.quantity) || 0) * (Number(item.price) || 0),
    0,
  );
  const ppn = data.includePpn ? subTotal * 0.11 : 0;
  const total = subTotal + ppn;

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
    { text: rupiah(value), style: 'td', alignment: 'right' as Alignment, bold },
  ];

  // Baris PPN selalu ditampilkan; nilainya 0 bila PO tidak kena PPN,
  // supaya pembaca tahu itu memang nol, bukan terlewat dicantumkan.
  const body: any[] = [
    header,
    ...rows,
    summaryRow('Sub Total', subTotal),
    summaryRow('PPN', ppn),
    summaryRow('Total', total, true),
  ];

  return {
    table: {
      headerRows: 1,
      widths: [22, '*', 42, 42, 78, 82],
      body,
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => '#9aa1ad',
      vLineColor: () => '#9aa1ad',
      // Padding atas-bawah dibuat sama besar sehingga teks satu baris
      // tampil di tengah sel. (pdfmake tidak menyediakan vertical-align,
      // jadi nama barang yang sampai membungkus dua baris akan membuat
      // sel tetangganya rata atas.)
      paddingTop: () => 6,
      paddingBottom: () => 6,
    },
    margin: [0, 6, 0, 12] as Margins,
  };
}

/**
 * Lampiran "Tata cara penagihan dan pembayaran" (lembar terpisah),
 * disalin sesuai dokumen resmi PEMBELIAN BARANG CASH.
 */
const BILLING_TERMS: any[] = [
  {
    stack: [
      {
        text: 'PIHAK PENJUAL berhak menagihkan barang penjualannya sebelum pengambilan/pengiriman barang dengan mengirimkan dokumen-dokumen sebagai berikut:',
      },
      {
        ul: [
          `Proforma Invoice yang menyatakan jumlah yang harus dibayar dan nomor rekening penerima (soft copy) via email ke ${OFFICE_CONTACT.email} atau via hardcopy ke alamat yang tertera dibawah;`,
          'Purchase Order (PO) yang telah ditandatangani (salinan);',
        ],
        margin: [0, 2, 0, 0] as Margins,
      },
    ],
  },
  {
    stack: [
      {
        text: 'PIHAK PENJUAL berkewajiban untuk mengirimkan dokumen-dokumen penjualan asli selambat-lambatnya 3 (tiga) hari kerja setelah transaksi pembayaran dilakukan. Adapun dokumen yang diperlukan adalah sebagai berikut:',
      },
      {
        ul: [
          'Invoice yang menyatakan jumlah yang harus dibayar dan nomor rekening penerima (asli);',
          'Kwitansi bermaterai (asli);',
          'Purchase Order (PO) yang telah ditandatangani (salinan);',
          'Dokumentasi (video) penyerahterimaan barang beserta kondisi pada saat serah terima;',
          'Surat Jalan yang sudah ditandatangani oleh perwakilan PIHAK PEMBELI;',
          'Faktur Pajak (bila ada);',
          'Surat Keaslian Barang (bila ada); dan',
          'Sertifikat Garansi (bila ada).',
        ],
        margin: [0, 2, 0, 0] as Margins,
      },
    ],
  },
  {
    stack: [
      {
        text: 'Dokumen dapat dikirimkan ke alamat kantor PT. Alpha Konstruksi Nusantara, yaitu:',
      },
      {
        text: 'KANTOR PT. ALPHA KONSTRUKSI NUSANTARA',
        bold: true,
        decoration: 'underline' as any,
        alignment: 'center' as Alignment,
        margin: [0, 4, 0, 0] as Margins,
      },
      {
        text: 'RUKO ASIA TROPIS AT 12 NO. 21',
        alignment: 'center' as Alignment,
      },
      {
        text: 'KOTA HARAPAN INDAH - BEKASI',
        alignment: 'center' as Alignment,
      },
    ],
  },
  'Proses pembayaran tagihan vendor dilakukan melalui Transfer Bank ke nomor rekening yang tercantum dalam dokumen penagihan (WAJIB sesuai dengan nama penandatangan kontrak kerja). Bilamana ditemukan perbedaan nama penerima, vendor WAJIB memberikan surat kuasa asli dan bermaterai yang ditandatangani oleh penerima kontrak.',
  'Biaya administrasi pembayaran melalui transfer bank dibebankan kepada vendor sesuai dengan tarif Bank Indonesia yang berlaku (bila ada).',
  'Khusus untuk penerima kontrak yang berada diluar Jabodetabek, pengiriman dokumen penagihan dapat dilakukan melalui jasa Kurir dan dilakukan khusus di antara hari Senin dan Rabu. PIHAK PERTAMA tidak bertanggung jawab atas kehilangan dokumen pada saat proses pengiriman.',
  'Tata cara pembayaran ini merupakan sebuah kesatuan dengan kontrak yang diterima dan menjadi syarat dalam pengajuan pembayaran.',
];

/** Cara dokumen dibuka: tab baru (default), dialog print, atau unduh. */
export type PdfOutput = 'open' | 'print' | 'download';

export function printPurchaseOrderG(
  data: IPurchaseOrderG,
  output: PdfOutput = 'open',
) {
  // Poin perjanjian dirakit dari template + data, sehingga PO yang diedit
  // selalu mencetak kalimat yang sesuai dengan datanya.
  const clauses = buildClauseLines(
    'G',
    data.clauseContext,
    data.templateVersion,
    data.additionalClauses,
  );

  const dd = {
    pageSize: 'A4' as PageSize,
    // ruang atas untuk kop, bawah untuk garis + alamat + kotak paraf
    pageMargins: [45, 86, 45, 80] as Margins,
    header: () => ({
      stack: [
        { image: LETTERHEAD, width: 505 },
        { image: FOOTER_RULE, width: 505, margin: [0, 4, 0, 0] as Margins },
      ],
      margin: [45, 18, 45, 0] as Margins,
    }),
    footer: () => ({
      stack: [
        { image: FOOTER_RULE, width: 505, margin: [0, 0, 0, 5] as Margins },
        {
          columns: [
            { text: '', width: 60 },
            {
              width: '*',
              stack: [
                { text: `Office : ${OFFICE_FOOTER.office}` },
                { text: `Phone : ${OFFICE_FOOTER.phone}` },
                { text: `Email : ${OFFICE_FOOTER.email}` },
              ],
              alignment: 'center' as Alignment,
              fontSize: 9,
              // footer memakai spacing rapat sendiri; mengikuti 1.5 milik
              // isi dokumen akan membuatnya melampaui ruang margin bawah
              lineHeight: 1.15,
            },
            // kotak paraf PROC / PM / DIR di sisi kanan
            { image: APPROVAL_BOX, width: 60 },
          ],
        },
      ],
      margin: [45, 8, 45, 0] as Margins,
    }),
    content: [
      {
        text: `Bekasi, ${formatDate(data.date)}`,
        alignment: 'right' as Alignment,
        margin: [0, 0, 0, 10] as Margins,
      },
      { text: 'PURCHASE ORDER', style: 'docTitle' },
      {
        text: `No.: ${data.purchaseOrderName}`,
        alignment: 'center' as Alignment,
      },
      {
        text: `Proyek: ${data.projectName}`,
        alignment: 'center' as Alignment,
        margin: [0, 0, 0, 14] as Margins,
      },

      { text: 'Kepada Yth.', margin: [0, 0, 0, 2] as Margins },
      { text: data.supplierName, bold: true },
      { text: data.supplierAddress },
      // baris kota hanya muncul bila datanya ada, agar tidak menyisakan
      // baris kosong pada supplier yang kotanya belum diisi
      ...(data.supplierCity ? [{ text: data.supplierCity }] : []),
      ...(data.supplierNpwp ? [{ text: `NPWP: ${data.supplierNpwp}` }] : []),

      { text: 'Dengan hormat,', margin: [0, 12, 0, 4] as Margins },
      {
        text: 'Berdasarkan permintaan kami, bersama ini kami bermaksud untuk melakukan sewa/pembelian barang-barang sebagai berikut:',
        margin: [0, 0, 0, 4] as Margins,
      },

      buildItemTable(data),

      {
        text: 'Catatan dalam perjanjian ini:',
        margin: [0, 2, 0, 4] as Margins,
      },
      {
        ol: clauses,
        margin: [0, 0, 0, 12] as Margins,
      },

      {
        text: 'Demikian kami sampaikan, atas perhatiannya kami ucapkan terima kasih.',
        margin: [0, 0, 0, 22] as Margins,
      },

      // Blok tanda tangan rata kiri, sesuai dokumen asli.
      // unbreakable: salam, nama perusahaan, dan nama penanda tangan wajib
      // berada di halaman yang sama — bila sisa ruang tidak cukup, seluruh
      // blok pindah ke halaman berikutnya.
      {
        unbreakable: true,
        stack: [
          { text: 'Hormat kami,' },
          { text: 'PT. Alpha Konstruksi Nusantara' },
          { text: '\n\n\n' },
          { text: 'Daniel Tri', bold: true },
          { text: 'Direktur' },
        ],
      },

      // Judul lampiran: dua baris dengan gaya yang sama (Calibri 16 bold).
      {
        text: 'TATA CARA PENAGIHAN DAN PEMBAYARAN\nPEMBELIAN BARANG CASH',
        style: 'docTitle',
        pageBreak: 'before' as any,
        margin: [0, 0, 0, 12] as Margins,
      },
      { ol: BILLING_TERMS },
    ],
    styles: {
      docTitle: {
        fontSize: 16,
        bold: true,
        alignment: 'center' as Alignment,
        margin: [0, 0, 0, 2] as Margins,
      },
      // tabel memakai spacing lebih rapat daripada isi surat (1.5)
      th: { bold: true, fontSize: 11, fillColor: '#eef1f5', lineHeight: 1.15 },
      td: { fontSize: 11, lineHeight: 1.15 },
    },
    defaultStyle: { font: 'Calibri', fontSize: 11, lineHeight: 1.5 },
  };

  // pdfmake 0.2.x mengekspor { vfs }, versi lama mengekspor objeknya langsung
  const baseVfs = (pdfFonts as any).vfs ?? (pdfFonts as any);
  const { fonts, vfs } = documentFonts(baseVfs);
  const pdf = pdfMake.createPdf(dd as any, undefined, fonts as any, vfs as any);
  const fileName = `${data.purchaseOrderName}.pdf`;

  if (output === 'print') return pdf.print();
  if (output === 'download') return pdf.download(fileName);
  // 'open' — tampilkan di tab baru supaya bisa dilihat dulu sebelum dicetak
  return pdf.open();
}
