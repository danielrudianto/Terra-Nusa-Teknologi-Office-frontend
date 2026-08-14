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

export interface IPurchaseOrderCItem {
  name: string;
  /** Catatan per baris; dicetak kecil di bawah nama barang. */
  remarks?: string;
  quantity: number;
  unit: string;
  price: number;
}

export interface IPurchaseOrderC {
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
  items: IPurchaseOrderCItem[];
  includePpn: boolean;
  /** PBBKB dalam persen, dihitung dari DPP. */
  pbbkbPercent?: number;
  /** PPh 22 sebagai nominal (diisi manual pada form). */
  pph22?: number;
  /** Data sumber klausul — kalimatnya dirakit di sini, bukan diambil dari DB. */
  templateVersion?: string;
  clauseContext: ClauseContext;
  additionalClauses?: string[];
}

/**
 * Tabel barang + ringkasan nilai.
 *
 * PO-C adalah pembelian BBM, sehingga ringkasannya memuat PBBKB dan PPh 22
 * selain PPN. Baris PPN, PBBKB, dan PPh 22 selalu ditampilkan meski nilainya
 * nol, supaya pembaca tahu komponen itu memang nol — bukan terlewat.
 */
function buildItemTable(data: IPurchaseOrderC) {
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

  const rawTotal = data.items.reduce(
    (acc, item) =>
      acc + (Number(item.quantity) || 0) * (Number(item.price) || 0),
    0,
  );
  // Harga satuan pada formulir adalah DPP; PPN 11% ditambahkan di atasnya.
  const subTotal = rawTotal;
  const ppn = data.includePpn ? subTotal * 0.11 : 0;
  const pbbkb = (subTotal * (Number(data.pbbkbPercent) || 0)) / 100;
  const pph22 = Number(data.pph22) || 0;
  const total = subTotal + ppn + pbbkb + pph22;

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

  const body: any[] = [
    header,
    ...rows,
    summaryRow('Sub Total', subTotal),
    summaryRow('PPN', ppn),
    summaryRow('PBBKB', pbbkb),
    summaryRow('PPh 22', pph22),
    summaryRow('Total', total, true),
  ];

  return {
    table: { headerRows: 1, widths: [22, '*', 42, 42, 78, 82], body },
    layout: TABLE_LAYOUT,
    margin: [0, 6, 0, 12] as Margins,
  };
}

export function printPurchaseOrderC(
  data: IPurchaseOrderC,
  output: PdfOutput = 'open',
) {
  // Poin perjanjian dirakit dari template + data, sehingga PO yang diedit
  // selalu mencetak kalimat yang sesuai dengan datanya.
  const clauses = buildClauseLines(
    'C',
    data.clauseContext,
    data.templateVersion,
    data.additionalClauses,
  );

  // Lampiran tata cara mengikuti termin: berjangka -> TEMPO, selain itu CASH.
  const tempo = isTempoTerm(data.clauseContext?.paymentTerm as string);

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
      { text: `No.: ${data.purchaseOrderName}`, style: 'docSubTitle' },
      {
        text: `Proyek: ${data.projectName}`,
        style: 'docSubTitle',
        margin: [0, 0, 0, 14] as Margins,
      },

      { text: 'Kepada Yth.', margin: [0, 0, 0, 2] as Margins },
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
      { ...clauseList(clauses), margin: [0, 0, 0, 12] as Margins },

      {
        text: 'Demikian kami sampaikan, atas perhatiannya kami ucapkan terima kasih.',
        margin: [0, 0, 0, 22] as Margins,
      },

      signatureBlock(data.approvedByName, data.approvedByPosition),

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
