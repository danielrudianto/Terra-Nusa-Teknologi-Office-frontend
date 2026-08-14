import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { Alignment, Margins } from 'pdfmake/interfaces';
import { ClauseContext, buildClauseLines } from '../constants/clause-templates';
import { documentFonts } from '../constants/document-font.constant';
import {
  DOCUMENT_DEFAULT_STYLE,
  DOCUMENT_PAGE,
  DOCUMENT_STYLES,
  PdfOutput,
  TABLE_LAYOUT,
  buildBillingTerms,
  clauseList,
  clauseToPdf,
  documentFooter,
  documentHeader,
  formatDate,
  isTempoTerm,
  rupiah,
  signatureBlock,
  vendorDisplayName,
} from './purchase-order-shared.helper';

// Font TIDAK didaftarkan lewat variabel global pdfMake.vfs — helper PDF
// lain menimpanya saat modul dimuat, sehingga Calibri bisa hilang dari
// virtual file system. Konfigurasinya dikirim langsung ke createPdf().

export interface IPurchaseOrderGItem {
  name: string;
  /** Catatan per baris; dicetak kecil di bawah nama barang. */
  remarks?: string; // nama pekerjaan / barang
  quantity: number;
  unit: string;
  price: number; // harga satuan
}

export interface IPurchaseOrderG {
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
  /**
   * Kode jenis PO untuk memilih template klausul. Default 'G'.
   * PO 5.1.6 (ATK & dokumen) memakai tata letak yang sama persis, hanya
   * kode templatenya berbeda — jadi keduanya memakai builder ini.
   */
  poType?: string;
  purchaseOrderName: string; // 157-SPK-TSKBP-G
  date: Date | string; // tanggal PO
  projectName: string; // Tatar Surawisesa-KBP (TSKBP)
  supplierName: string;
  /** Bentuk badan usaha (PT., CV., UD.) — dicetak setelah nama. */
  supplierPrefix?: string;
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
      {
        style: 'td',
        // Catatan ditaruh di bawah nama, bukan kolom baru: tabelnya sudah
        // enam kolom dan kolom tambahan membuat harga terlalu sempit.
        stack: [
          { text: item.name || '-' },
          ...(item.remarks
            ? [
                {
                  text: item.remarks,
                  fontSize: 9,
                  italics: true,
                  color: '#6b7280',
                },
              ]
            : []),
        ],
      },
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

  // Harga satuan pada formulir adalah DPP; PPN 11% ditambahkan di atasnya.
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
    layout: TABLE_LAYOUT,
    margin: [0, 6, 0, 12] as Margins,
  };
}

export function printPurchaseOrderG(
  data: IPurchaseOrderG,
  output: PdfOutput = 'open',
) {
  // Poin perjanjian dirakit dari template + data, sehingga PO yang diedit
  // selalu mencetak kalimat yang sesuai dengan datanya.
  // Lampiran tata cara mengikuti termin: berjangka -> TEMPO, selain itu CASH.
  const tempo = isTempoTerm(data.clauseContext?.paymentTerm as string);

  const clauses = buildClauseLines(
    data.poType || 'G',
    data.clauseContext,
    data.templateVersion,
    data.additionalClauses,
  );

  const dd = {
    ...DOCUMENT_PAGE,
    header: () => documentHeader(),
    footer: () => documentFooter(),
    content: [
      {
        text: `Bekasi, ${formatDate(data.date)}`,
        alignment: 'right' as Alignment,
        margin: [0, 0, 0, 5] as Margins,
      },
      { text: 'PURCHASE ORDER', style: 'docTitle' },
      {
        text: `No.: ${data.purchaseOrderName}`,
        style: 'docSubTitle',
      },
      {
        text: `Proyek: ${data.projectName}`,
        style: 'docSubTitle',
        margin: [0, 0, 0, 14] as Margins,
      },

      { text: 'Kepada Yth.', margin: [0, 0, 0, 2] as Margins },
      // Identitas penerima dijadikan satu blok ber-spacing 1; bila tiap baris
      // berdiri sendiri, jaraknya mengikuti spacing isi surat dan terlihat
      // seperti paragraf terpisah. Baris kota/NPWP hanya muncul bila terisi.
      {
        lineHeight: 1,
        stack: [
          {
            text: vendorDisplayName(data.supplierName, data.supplierPrefix),
            bold: true,
          },
          { text: data.supplierAddress },
          ...(data.supplierCity ? [{ text: data.supplierCity }] : []),
          ...(data.supplierNpwp
            ? [{ text: `NPWP/NIK: ${data.supplierNpwp}` }]
            : []),
        ],
      },

      { text: 'Dengan hormat,', margin: [0, 12, 0, 4] as Margins },
      {
        // Tata letak ini hanya dipakai untuk pembelian; sewa alat memakai
        // dokumen tersendiri. Menyebut keduanya membuat dokumen pembelian
        // terbaca seolah masih menawarkan pilihan.
        text: 'Berdasarkan permintaan kami, bersama ini kami bermaksud untuk melakukan pembelian barang-barang sebagai berikut:',
        margin: [0, 0, 0, 4] as Margins,
      },

      buildItemTable(data),

      {
        text: 'Catatan dalam perjanjian ini:',
        margin: [0, 2, 0, 4] as Margins,
      },
      {
        ...clauseList(clauses),
        margin: [0, 0, 0, 12] as Margins,
      },

      {
        text: 'Demikian kami sampaikan, atas perhatiannya kami ucapkan terima kasih.',
        margin: [0, 0, 0, 22] as Margins,
      },

      signatureBlock(data.approvedByName, data.approvedByPosition),

      // Judul lampiran: dua baris dengan gaya yang sama (Calibri 16 bold).
      {
        text: `TATA CARA PENAGIHAN DAN PEMBAYARAN\nPEMBELIAN BARANG ${
          tempo ? 'TEMPO' : 'CASH'
        }`,
        style: 'docTitle',
        pageBreak: 'before' as any,
        margin: [0, 0, 0, 12] as Margins,
      },
      { ol: buildBillingTerms(tempo) },
    ],
    styles: DOCUMENT_STYLES,
    defaultStyle: DOCUMENT_DEFAULT_STYLE,
  };

  // pdfmake 0.2.x mengekspor { vfs }, versi lama mengekspor objeknya langsung
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
  // 'open' — tampilkan di tab baru supaya bisa dilihat dulu sebelum dicetak
  return pdf.open();
}
