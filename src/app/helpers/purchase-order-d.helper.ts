import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { Alignment, Margins } from 'pdfmake/interfaces';
import {
  ClauseContext,
  buildManpowerClauses,
} from '../constants/clause-templates';
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
  rupiah,
  vendorDisplayName,
  workIntroSentence,
  signerLines,
  draftWatermark,
} from './purchase-order-shared.helper';

/** Satu komponen upah (gaji pokok, uang makan, insentif, dst). */
export interface IPurchaseOrderDItem {
  /** Nama komponen upah. */
  label: string;
  /** Nominal per satuan. */
  amount: number;
  /** Satuan: hari, bulan, jam, m', dst. */
  unit: string;
}

export interface IPurchaseOrderD {
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
   * Mengubah dua hal pada cetakannya: kalimat pembukanya, dan judul kolom
   * volume — pada adendum yang dicantumkan adalah SELISIH, bukan volume
   * yang berlaku.
   */
  isAdendum?: boolean;

  /** Jabatan penyetuju; kosong bila belum diisi. */
  approvedByPosition?: string | null;
  /** Nama penyetuju; kosong selama dokumennya belum disetujui. */
  approvedByName?: string | null;
  purchaseOrderName: string;
  date: Date | string;
  projectName: string;
  /** Nama pekerja (diambil dari supplier yang dipilih). */
  workerName: string;
  workerPrefix?: string;
  workerAddress: string;
  workerCity?: string;
  /**
   * NPWP atau NIK pekerja.
   *
   * Hanya dicetak bila terisi: sebagian pekerja belum ber-NPWP, dan baris
   * kosong pada dokumen resmi lebih mengganggu daripada tidak ada barisnya.
   */
  workerNpwp?: string;
  /** Jenis pekerjaan: tukang cor, operator boredpile, dst. */
  task?: string;
  items: IPurchaseOrderDItem[];
  templateVersion?: string;
  clauseContext: ClauseContext;
  additionalClauses?: string[];
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

/**
 * Baris identitas pekerja: label dan isian dipisah kolom agar titik dua
 * sejajar, seperti pada dokumen SPK aslinya.
 */
function identityRow(label: string, value: string) {
  return [
    { text: label, style: 'td' },
    { text: ':', style: 'td', alignment: 'center' as Alignment },
    { text: value || '-', style: 'td' },
  ];
}

function buildIdentityTable(data: IPurchaseOrderD) {
  const name = vendorDisplayName(data.workerName, data.workerPrefix);

  const rows = [
    identityRow('Nama', name),
    identityRow('Alamat', data.workerAddress),
  ];
  if (data.workerCity) rows.push(identityRow('', data.workerCity));
  if (data.workerNpwp) rows.push(identityRow('NPWP/NIK', data.workerNpwp));
  if (data.task) rows.push(identityRow('Jenis Pekerjaan', data.task));

  return {
    table: { widths: [110, 10, '*'], body: rows },
    // tanpa garis: ini blok identitas, bukan tabel data
    layout: 'noBorders' as any,
    margin: [0, 6, 0, 10] as Margins,
  };
}

/**
 * Daftar komponen upah.
 *
 * Berbeda dengan PO barang, SPK tenaga kerja tidak memakai volume dan tidak
 * dikenai PPN (pekerja perorangan bukan PKP), sehingga tabelnya hanya memuat
 * komponen, nominal, dan satuannya.
 */
function buildWageTable(data: IPurchaseOrderD) {
  const th = (text: string) => ({
    text,
    style: 'th',
    alignment: 'center' as Alignment,
  });

  const header = [
    th('No.'),
    th('Komponen Upah'),
    th('Nominal (Rp.)'),
    th('Satuan'),
  ];

  const rows = data.items.map((item, i) => [
    { text: `${i + 1}.`, style: 'td', alignment: 'center' as Alignment },
    { text: item.label || '-', style: 'td' },
    {
      text: rupiah(item.amount),
      style: 'td',
      alignment: 'right' as Alignment,
    },
    { text: item.unit || '-', style: 'td', alignment: 'center' as Alignment },
  ]);

  return {
    table: {
      headerRows: 1,
      widths: [22, '*', 110, 70],
      body: [header, ...rows],
    },
    layout: TABLE_LAYOUT,
    margin: [0, 6, 0, 12] as Margins,
  };
}

/** Tanda tangan dua pihak, sesuai dokumen SPK. */
function signatureColumns(data: IPurchaseOrderD) {
  const workerName = vendorDisplayName(data.workerName, data.workerPrefix);

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
          { text: 'PIHAK KEDUA,' },
          { text: workerName },
          { text: '\n\n\n' },
          { text: data.workerName, bold: true },
        ],
      },
    ],
    margin: [0, 10, 0, 0] as Margins,
  };
}

/**
 * Susun isi dokumen SPK tenaga kerja tanpa mencetaknya.
 *
 * Dipakai invoice generator untuk melampirkan SPK di belakang kuitansi,
 * sehingga tata letaknya dijamin sama dengan dokumen aslinya.
 */
/**
 * Susun docDefinition SPK tenaga kerja.
 *
 * Dipisahkan agar isinya bisa dipakai ulang sebagai lampiran pada dokumen
 * lain (mis. invoice) tanpa menyalin tata letaknya.
 */
function buildDocDefinition(data: IPurchaseOrderD) {
  // Poin perjanjian dirakit dari template + data, bukan teks tersimpan.
  // Terbagi empat bagian agar pembaca tahu poin mana mengatur apa.
  const sections = buildManpowerClauses(
    data.clauseContext,
    data.additionalClauses,
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
        text: `Proyek: ${data.projectName}`,
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
        // PO-D selalu pemesanan tenaga kerja; tidak ada bentuk lain.
        text: workIntroSentence('D', data.isAdendum),
        margin: [0, 0, 0, 4] as Margins,
      },

      buildWageTable(data),

      {
        text: 'Catatan dalam perjanjian adalah:',
        margin: [0, 2, 0, 4] as Margins,
      },
      ...sections.flatMap((sec) => [
        {
          text: sec.title as string,
          bold: true,
          margin: [0, 8, 0, 4] as Margins,
        },
        {
          ol: sec.items.map((x) => clauseToPdf(x as string)),
          margin: [0, 0, 0, 4] as Margins,
        },
      ]),
      { text: '', margin: [0, 0, 0, 8] as Margins },

      {
        text: 'Demikian surat perintah kerja ini dibuat untuk dilaksanakan sebagaimana mestinya.',
        margin: [0, 0, 0, 18] as Margins,
      },

      signatureColumns(data),
    ],
    styles: DOCUMENT_STYLES,
    defaultStyle: DOCUMENT_DEFAULT_STYLE,
  };

  return dd;
}

/** Isi dokumen SPK, untuk dilampirkan pada dokumen lain. */
export function buildPurchaseOrderDContent(data: IPurchaseOrderD): any[] {
  return buildDocDefinition(data).content as any[];
}

export function printPurchaseOrderD(
  data: IPurchaseOrderD,
  output: PdfOutput = 'open',
) {
  const dd = buildDocDefinition(data);
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
