import pdfMake from 'pdfmake/build/pdfmake';
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
  rupiah,
  vendorDisplayName,
} from './purchase-order-shared.helper';

/**
 * Surat Perintah Kerja jasa transportasi (PO-A).
 *
 * Berbeda dengan PO-B yang catatannya satu daftar rata, dokumen ini disusun
 * per seksi: Umum, lalu satu seksi untuk tiap moda angkutan yang benar-benar
 * dipakai, lalu Catatan Tambahan. Seksinya dirakit oleh pemanggil lewat
 * `buildTransportClauses`, sama seperti PO-H — helper ini hanya menatanya.
 *
 * Alasan pemisahan: satu SPK bisa memuat beberapa pengiriman dengan moda,
 * rute, dan jadwal berbeda. Tabel pekerjaannya karena itu berbasis baris
 * pengiriman, bukan baris barang.
 */

/** Satu baris pengiriman pada tabel pekerjaan. */
export interface IPurchaseOrderAShipment {
  /** 'darat' | 'laut' | 'udara'. Moda lama tetap dicetak apa adanya. */
  mode?: string;
  from?: string;
  to?: string;
  /** Darat: nama armada dari katalog fleet. */
  fleetName?: string;
  /** Darat: nomor polisi kendaraan. */
  nopol?: string;
  /** Darat: nama & NIK pengemudi. */
  driver?: string;
  /** Laut/udara: nama kapal-pelayaran atau maskapai. */
  provider?: string;
  /** Laut: no. kontainer | udara: no. AWB | lainnya: no. resi. */
  refNumber?: string;
  /** Penanggung jawab baris ini; bisa berbeda tiap pengiriman. */
  picName?: string;
  picPhone?: string;
  quantity: number;
  unit: string;
  price: number;
  /** Jadwal kirim, sudah diformat oleh pemanggil bila ada. */
  deliveryDateText?: string;
}

export interface IPurchaseOrderA {
  purchaseOrderName: string;
  date: Date | string;
  projectName: string;
  supplierName: string;
  supplierPrefix?: string;
  supplierAddress: string;
  supplierCity?: string;
  supplierNpwp?: string;
  /** Penanggung jawab tingkat kontrak; opsional karena PIC melekat per baris. */
  supplierPIC?: string;
  shipments: IPurchaseOrderAShipment[];
  includePpn: boolean;
  /**
   * Tarif PPN dalam persen. Jasa angkutan umumnya 11%; jasa pengurusan
   * transportasi (freight forwarding) memakai DPP nilai lain sehingga
   * tarif efektifnya 1,1%. Tidak dipatok di sini agar dokumen mengikuti
   * apa yang benar-benar dipilih pada formulir.
   */
  ppnRate?: number;
  /** Seksi klausul hasil `buildTransportClauses`. */
  sections: { title?: string; items: (string | string[])[] }[];
  /** Lampiran hasil `buildTransportBillingTerms`; dicetak di lembar terpisah. */
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

const MODE_LABEL: Record<string, string> = {
  darat: 'Darat',
  laut: 'Laut',
  udara: 'Udara',
};

/**
 * Penomoran bersarang; gaya penomoran berganti tiap tingkat.
 *
 * Sama seperti PO-H: lampiran penagihan bisa bersarang sampai tiga tingkat,
 * dan blok alamat dicetak rata tengah tanpa nomor.
 */
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
function buildIdentityTable(data: IPurchaseOrderA) {
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

/**
 * Rincian di bawah judul rute: armada/penyedia, identitas kendaraan atau
 * nomor rujukan, PIC, dan jadwal kirim.
 *
 * Ditulis sebagai baris-baris kecil, bukan kolom sendiri, karena isinya
 * berbeda per moda — darat memakai nopol dan pengemudi, laut/udara memakai
 * nama penyedia dan nomor rujukan. Kolom tetap akan banyak yang kosong.
 */
function shipmentDetailLines(s: IPurchaseOrderAShipment): string[] {
  const mode = String(s.mode || 'darat').toLowerCase();
  const lines: string[] = [];

  const modeLabel = MODE_LABEL[mode] || s.mode || 'Darat';

  if (mode === 'darat') {
    const armada = [s.fleetName, s.nopol].filter(Boolean).join(' — ');
    lines.push(`Moda: ${modeLabel}${armada ? ` (${armada})` : ''}`);
    if (s.driver) lines.push(`Pengemudi: ${s.driver}`);
  } else {
    lines.push(`Moda: ${modeLabel}${s.provider ? ` (${s.provider})` : ''}`);
    if (s.refNumber) {
      const label =
        mode === 'laut'
          ? 'No. kontainer'
          : mode === 'udara'
            ? 'No. AWB'
            : 'No. resi';
      lines.push(`${label}: ${s.refNumber}`);
    }
  }

  if (s.deliveryDateText) lines.push(`Jadwal kirim: ${s.deliveryDateText}`);

  if (s.picName) {
    lines.push(
      `Penanggung jawab: ${s.picName}${s.picPhone ? ` (${s.picPhone})` : ''}`,
    );
  }

  return lines;
}

/**
 * Tabel pekerjaan pengiriman.
 *
 * Baris PPN tetap ditampilkan walau nilainya nol agar pembaca tahu tarif
 * mana yang dipakai; label menyebut tarifnya, dan tarif 1,1% diberi
 * keterangan DPP nilai lain supaya tidak terbaca sebagai salah ketik.
 */
function buildShipmentTable(data: IPurchaseOrderA) {
  const th = (text: string) => ({
    text,
    style: 'th',
    alignment: 'center' as Alignment,
    margin: [0, text.includes('\n') ? 0 : 6, 0, 0] as Margins,
  });

  const header = [
    th('No.'),
    th('Uraian Pengiriman'),
    th('Volume'),
    th('Satuan'),
    th('Harga Satuan\n(Rp.)'),
    th('Jumlah\n(Rp.)'),
  ];

  const rows = (data.shipments || []).map((s, i) => {
    const qty = Number(s.quantity) || 0;
    const price = Number(s.price) || 0;
    const detail = shipmentDetailLines(s);

    return [
      { text: `${i + 1}.`, style: 'td', alignment: 'center' as Alignment },
      {
        style: 'td',
        stack: [
          {
            text: `Pengiriman dari ${s.from || '—'} ke ${s.to || '—'}`,
            bold: true,
          },
          ...detail.map((line) => ({
            text: line,
            fontSize: 10,
            color: '#4b5563',
          })),
        ],
      },
      { text: rupiah(qty), style: 'td', alignment: 'center' as Alignment },
      { text: s.unit || '-', style: 'td', alignment: 'center' as Alignment },
      { text: rupiah(price), style: 'td', alignment: 'right' as Alignment },
      {
        text: rupiah(qty * price),
        style: 'td',
        alignment: 'right' as Alignment,
      },
    ];
  });

  // Harga satuan yang diisi adalah DPP; PPN ditambahkan di atasnya.
  const subTotal = (data.shipments || []).reduce(
    (acc, s) => acc + (Number(s.quantity) || 0) * (Number(s.price) || 0),
    0,
  );

  const rate = data.includePpn ? Number(data.ppnRate ?? 11) : 0;
  const ppn = subTotal * (rate / 100);
  const total = subTotal + ppn;

  // Angka desimal tarif ditulis dengan koma, mengikuti penulisan Indonesia.
  const rateText = String(rate).replace('.', ',');
  const ppnLabel =
    rate === 0
      ? 'PPN'
      : rate === 1.1
        ? `PPN ${rateText}% (DPP nilai lain)`
        : `PPN ${rateText}%`;

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

  return {
    table: {
      headerRows: 1,
      widths: [22, '*', 42, 42, 78, 82],
      body: [
        header,
        ...rows,
        summaryRow('Sub Total', subTotal),
        summaryRow(ppnLabel, ppn),
        summaryRow('Total', total, true),
      ],
    },
    layout: TABLE_LAYOUT,
    margin: [0, 6, 0, 12] as Margins,
  };
}

/** Tanda tangan dua pihak, sesuai dokumen SPK. */
function signatureColumns(data: IPurchaseOrderA) {
  const vendor = vendorDisplayName(data.supplierName, data.supplierPrefix);

  return {
    unbreakable: true,
    columns: [
      {
        width: '*',
        stack: [
          { text: 'PIHAK PERTAMA,' },
          { text: 'PT. Alpha Konstruksi Nusantara' },
          { text: '\n\n\n' },
          { text: 'Daniel Tri', bold: true },
          { text: 'Direktur' },
        ],
      },
      {
        width: '*',
        stack: [
          { text: 'PIHAK KEDUA,' },
          { text: vendor },
          { text: '\n\n\n' },
          // Jabatan pihak kedua tidak diasumsikan.
          { text: data.supplierPIC || vendor, bold: true },
        ],
      },
    ],
    margin: [0, 10, 0, 0] as Margins,
  };
}

export function printPurchaseOrderA(
  data: IPurchaseOrderA,
  output: PdfOutput = 'open',
) {
  const sections = data.sections || [];

  const dd = {
    ...DOCUMENT_PAGE,
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
        text: 'Untuk melaksanakan pekerjaan pengiriman dengan ketentuan-ketentuan sebagai berikut:',
        margin: [0, 0, 0, 4] as Margins,
      },

      buildShipmentTable(data),

      // Seksi tanpa judul tetap diberi pengantar agar daftarnya tidak
      // menggantung tanpa keterangan apa pun.
      ...sections.flatMap((sec) => [
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
              text: 'TATA CARA PENAGIHAN DAN PEMBAYARAN\nJASA TRANSPORTASI',
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

  if (output === 'print') return pdf.print();
  if (output === 'download') return pdf.download(fileName);
  return pdf.open();
}
