import { Alignment, Margins, PageSize } from 'pdfmake/interfaces';
import {
  APPROVAL_BOX,
  FOOTER_RULE,
  LETTERHEAD,
  OFFICE_FOOTER,
} from '../constants/letterhead.constant';
// Alamat & email kantor tinggal di clause-templates, bukan di letterhead.
import { OFFICE_CONTACT } from '../constants/clause-templates';

/**
 * Bagian dokumen PO yang dipakai bersama semua jenis PO (G, C, dst):
 * kop surat, footer, lampiran tata cara penagihan, dan util format.
 *
 * Dipisahkan agar perubahan tata letak cukup dilakukan sekali, tidak
 * diulang di tiap helper jenis PO.
 */

/** Cara dokumen dibuka: tab baru (default), dialog print, atau unduh. */
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

/**
 * Kalimat pengantar sebelum tabel, mengikuti bentuk pekerjaannya.
 *
 * Sebelumnya seluruh dokumen berbunyi "untuk melakukan pekerjaan", termasuk
 * yang isinya menyewa alat atau menutup pertanggungan — dan itu terbaca
 * janggal karena yang dipesan bukan pekerjaan dalam arti itu.
 */
export function workIntroSentence(poType?: string): string {
  const t = String(poType || '').toUpperCase();

  if (t === 'B') {
    return 'Untuk melakukan penyewaan alat kerja dengan ketentuan-ketentuan sebagai berikut:';
  }
  if (t === '6.4.2') {
    return 'Untuk melakukan penutupan pertanggungan dengan ketentuan-ketentuan sebagai berikut:';
  }
  if (t === '6.5.2') {
    return 'Untuk menyelenggarakan pelatihan dengan ketentuan-ketentuan sebagai berikut:';
  }
  if (t === '5.1.12') {
    return 'Untuk melakukan pengadaan perangkat lunak dengan ketentuan-ketentuan sebagai berikut:';
  }
  // Sisanya memang pemesanan pekerjaan: jasa, tenaga kerja, subkontraktor.
  return 'Untuk melakukan pekerjaan dengan ketentuan-ketentuan sebagai berikut:';
}

export function formatDate(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '-';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function rupiah(value: number): string {
  return (Number(value) || 0).toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/** Baris tabel barang + baris Sub Total / PPN / Total. */

/**
 * Lampiran "Tata cara penagihan dan pembayaran" (lembar terpisah).
 *
 * Ada dua versi: PEMBELIAN BARANG CASH dan PEMBELIAN BARANG TEMPO. Isinya
 * hampir sama; yang membedakan hanya dokumen penagihan awal (Proforma
 * Invoice vs Invoice) dan redaksi ketentuan pengiriman via kurir.
 */
export function buildBillingTerms(tempo: boolean): any[] {
  const firstDocument = tempo
    ? `Invoice yang menyatakan jumlah yang harus dibayar dan nomor rekening penerima (soft copy) via email ke ${OFFICE_CONTACT.email} atau via hardcopy ke alamat yang tertera dibawah;`
    : `Proforma Invoice yang menyatakan jumlah yang harus dibayar dan nomor rekening penerima (soft copy) via email ke ${OFFICE_CONTACT.email} atau via hardcopy ke alamat yang tertera dibawah;`;

  const courierClause = tempo
    ? 'Khusus untuk penerima kontrak yang berada diluar Jabodetabek, pengiriman dokumen penagihan dapat dilakukan melalui jasa Kurir dan dilakukan khusus di hari SENIN-RABU. Apabila terjadi kehilangan akibat kesalahan hari pengiriman, PIHAK PERTAMA tidak dapat bertanggung jawab.'
    : 'Khusus untuk penerima kontrak yang berada diluar Jabodetabek, pengiriman dokumen penagihan dapat dilakukan melalui jasa Kurir dan dilakukan khusus di antara hari Senin dan Rabu. PIHAK PERTAMA tidak bertanggung jawab atas kehilangan dokumen pada saat proses pengiriman.';

  return [
    {
      stack: [
        {
          text: 'PIHAK PENJUAL berhak menagihkan barang penjualannya sebelum pengambilan/pengiriman barang dengan mengirimkan dokumen-dokumen sebagai berikut:',
        },
        {
          ul: [
            firstDocument,
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
          margin: [0, 10, 0, 0] as Margins,
        },
        {
          text: 'RUKO ASIA TROPIS AT 12 NO. 21',
          alignment: 'center' as Alignment,
        },
        {
          text: 'KOTA HARAPAN INDAH - BEKASI',
          alignment: 'center' as Alignment,
          margin: [0, 0, 0, 10] as Margins,
        },
      ],
    },
    'Proses pembayaran tagihan vendor dilakukan melalui Transfer Bank ke nomor rekening yang tercantum dalam dokumen penagihan (WAJIB sesuai dengan nama penandatangan kontrak kerja). Bilamana ditemukan perbedaan nama penerima, vendor WAJIB memberikan surat kuasa asli dan bermaterai yang ditandatangani oleh penerima kontrak.',
    'Biaya administrasi pembayaran melalui transfer bank dibebankan kepada vendor sesuai dengan tarif Bank Indonesia yang berlaku (bila ada).',
    courierClause,
    'Tata cara pembayaran ini merupakan sebuah kesatuan dengan kontrak yang diterima dan menjadi syarat dalam pengajuan pembayaran.',
  ];
}

/** Termin berjangka (kredit/prepaid) memakai lampiran versi TEMPO. */
export function isTempoTerm(paymentTerm?: string): boolean {
  return ['CR', 'CRD', 'PPD'].includes(String(paymentTerm || '').toUpperCase());
}

/** Kop surat: dipasang sebagai header di setiap halaman. */
export function documentHeader() {
  return {
    stack: [
      { image: LETTERHEAD, width: 505 },
      { image: FOOTER_RULE, width: 505, margin: [0, 4, 0, 0] as Margins },
    ],
    margin: [45, 18, 45, 0] as Margins,
  };
}

/** Footer: garis, alamat kantor, dan kotak paraf PROC/PM/DIR. */
export function documentFooter() {
  return {
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
            lineHeight: 1.15,
          },
          { image: APPROVAL_BOX, width: 60 },
        ],
      },
    ],
    margin: [45, 8, 45, 0] as Margins,
  };
}

/** Blok tanda tangan; unbreakable agar tidak terpotong antar halaman. */
export function signatureBlock() {
  return {
    unbreakable: true,
    stack: [
      { text: 'Hormat kami,' },
      { text: 'PT. Alpha Konstruksi Nusantara' },
      { text: '\n\n\n' },
      { text: 'Daniel Tri', bold: true },
      { text: 'Direktur' },
    ],
  };
}

/** Gaya teks yang dipakai seluruh dokumen PO. */
export const DOCUMENT_STYLES = {
  docTitle: {
    fontSize: 16,
    bold: true,
    alignment: 'center' as Alignment,
    lineHeight: 1,
    margin: [0, 0, 0, 2] as Margins,
  },
  docSubTitle: {
    alignment: 'center' as Alignment,
    lineHeight: 1,
  },
  // Header tabel tanpa warna latar: hemat tinta saat dicetak, dan
  // pembeda barisnya sudah cukup dari huruf tebal + garis tabel.
  th: { bold: true, fontSize: 11, lineHeight: 1 },
  td: { fontSize: 11, lineHeight: 1 },
};

export const DOCUMENT_DEFAULT_STYLE = {
  font: 'Calibri',
  fontSize: 11,
  lineHeight: 1.15,
};

export const DOCUMENT_PAGE = {
  pageSize: 'A4' as PageSize,
  pageMargins: [45, 86, 45, 80] as Margins,
};

/** Layout garis + padding tabel barang. */
export const TABLE_LAYOUT = {
  hLineWidth: () => 0.5,
  vLineWidth: () => 0.5,
  hLineColor: () => '#9aa1ad',
  vLineColor: () => '#9aa1ad',
  paddingTop: () => 4,
  paddingBottom: () => 4,
};

/**
 * Ubah baris klausul menjadi objek teks pdfmake.
 *
 * Template klausul menandai poin yang dinonaktifkan dengan tag <s>…</s>
 * (dipakai apa adanya oleh preview HTML di formulir). pdfmake tidak
 * membaca HTML, jadi tag itu harus diterjemahkan menjadi properti
 * `decoration: 'lineThrough'` — kalau tidak, tagnya ikut tercetak.
 */
/**
 * Daftar poin perjanjian, termasuk sub-poin bersarang.
 *
 * Anggota berupa array menjadi daftar huruf (a, b, c) di bawah poin
 * sebelumnya. Dipakai bersama oleh seluruh helper agar penomoran bersarang
 * tampil sama di setiap dokumen.
 */
export function clauseList(lines: (string | string[])[]): any {
  return {
    ol: (lines || []).map((x) =>
      Array.isArray(x)
        ? {
            // Sub-poin dirapatkan: jaraknya cukup dari poin induknya, dan
            // jeda penuh di sini membuat rinciannya tampak terpisah dari
            // ketentuan yang menaunginya.
            ol: x.map(subClauseToPdf),
            type: 'lower-alpha' as any,
            margin: [0, 0, 0, CLAUSE_GAP] as Margins,
          }
        : clauseToPdf(x),
    ),
  };
}

/** Sub-poin: sama seperti poin biasa, tetapi jaraknya lebih rapat. */
function subClauseToPdf(line: string): any {
  return { ...clauseToPdf(line), margin: [0, 0, 0, 2] as Margins };
}

/**
 * Jarak bawah tiap poin perjanjian, dalam satuan pt.
 *
 * Kira-kira setengah tinggi barisnya (teks 11pt), cukup untuk memisahkan
 * poin tanpa membuat dokumen bertambah halaman. Tanpa jeda ini, poin yang
 * panjang menyambung ke poin berikutnya dan sulit dibaca di lapangan.
 */
export const CLAUSE_GAP = 6;

export function clauseToPdf(line: string): any {
  const match = /^\s*<s>([\s\S]*)<\/s>\s*$/i.exec(line || '');
  if (match) {
    return {
      text: stripHtmlTags(match[1]),
      decoration: 'lineThrough' as any,
      color: '#6b7280',
      margin: [0, 0, 0, CLAUSE_GAP] as Margins,
    };
  }
  return {
    text: stripHtmlTags(line),
    margin: [0, 0, 0, CLAUSE_GAP] as Margins,
  };
}

/** Buang sisa tag HTML sederhana agar tidak ikut tercetak. */
export function stripHtmlTags(value: string): string {
  return (value || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

/**
 * Susun nama vendor untuk dokumen.
 *
 * Prefix badan usaha (PT., CV., UD., Yayasan, dst) tetap ditulis karena
 * bagian dari nama resminya. Sebaliknya "Pribadi" dan "Lainnya" hanya
 * penanda jenis supplier di sistem, bukan nama — sehingga tidak dicetak.
 *
 * Nama dari pemilih supplier bisa sudah memuat prefix di belakang
 * ("Dedi, Pribadi"); bagian itu dibersihkan lebih dulu agar tidak dobel.
 */
const NON_ENTITY_PREFIXES = ['pribadi', 'lainnya', 'perorangan'];

export function vendorDisplayName(name?: string, prefix?: string): string {
  const bersih = String(name || '')
    // buang ", Pribadi" / ", PT." yang ikut terbawa dari pemilih supplier
    .replace(
      /,\s*(pribadi|lainnya|perorangan|pt\.?|cv\.?|ud\.?|yayasan)\s*$/i,
      '',
    )
    .trim();

  const p = String(prefix || '').trim();
  if (!p || NON_ENTITY_PREFIXES.includes(p.toLowerCase())) return bersih || '-';

  // Hindari penulisan ganda bila nama sudah diawali prefiksnya.
  if (bersih.toLowerCase().startsWith(p.toLowerCase())) return bersih;
  return `${p} ${bersih}`.trim();
}
