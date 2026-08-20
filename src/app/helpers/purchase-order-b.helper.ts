import pdfMake from 'pdfmake/build/pdfmake';
import { nilaiBaris } from './nilai-baris.helper';
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
  clauseList,
  clauseToPdf,
  documentFooter,
  documentHeader,
  formatDate,
  vendorDisplayName,
  workIntroSentence,
  signerLines,
  draftWatermark,
  namaProyekCetak,
  rupiahDokumen,
  angkaSatuan,
} from './purchase-order-shared.helper';

export interface IPurchaseOrderBItem {
  /** Uraian pekerjaan / alat yang disewa. */
  name: string;
  quantity: number;
  unit: string;
  price: number;
  /**
   * Mobilisasi dan demobilisasi, dititipkan pada kolom keterangan.
   *
   * `purchase_order_items` sudah menyediakan enam kolom keterangan dan tiga
   * di antaranya belum terpakai; menambah kolom basis data untuk dua angka
   * yang hanya dipakai satu varian tidak sepadan.
   *
   * Bertipe teks karena kolomnya memang teks — dibaca dengan `Number()`.
   */
  remarks_4?: string | number | null;
  remarks_5?: string | number | null;
  /**
   * Keterangan di bawah nama, dicetak lebih kecil.
   *
   * Pada sewa alat berisi periode dan lokasi penempatan — keduanya
   * membedakan satu baris dari baris lain yang alatnya sama, dan tanpa itu
   * dokumen tidak menyebutkan sampai kapan alatnya disewa.
   */
  remarks?: string;
}

export interface IPurchaseOrderB {
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
  /**
   * Kode jenis PO untuk memilih template klausul. Default 'B'.
   * PO 5.1.2 mode jasa memakai tata letak SPK yang sama persis, hanya
   * kode templatenya berbeda — sama seperti 5.1.6 yang menumpang PO-G.
   */
  poType?: string;
  purchaseOrderName: string;
  date: Date | string;
  projectName: string;
  supplierName: string;
  supplierPrefix?: string;
  supplierAddress: string;
  supplierCity?: string;
  supplierNpwp?: string;
  /** Penanggung jawab dari pihak vendor. */
  supplierPIC?: string;
  /**
   * Jabatan penanggung jawab vendor.
   *
   * Boleh kosong: sebagian vendor tidak menyebutkannya, dan yang kosong
   * tercetak sebagai penunjuk abu-abu "Jabatan" — sama seperti sisi AKN,
   * bukan dibiarkan hampa.
   */
  supplierPICPosition?: string;
  items: IPurchaseOrderBItem[];
  includePpn: boolean;
  templateVersion?: string;
  clauseContext: ClauseContext;
  additionalClauses?: string[];
  /**
   * Poin perjanjian yang sudah terbagi seksi berjudul.
   *
   * Dikirim langsung oleh pemanggil untuk jenis PO yang klausulnya tidak
   * terdaftar di CLAUSE_TEMPLATES. Bila diisi, seksi inilah yang dicetak.
   */
  sections?: { title?: string; items: (string | string[])[] }[];
  /**
   * Lampiran tata cara penagihan, dicetak di lembar terpisah.
   *
   * SPK sewa alat tidak memakainya; PO 5.1.2 mode jasa memakainya karena
   * catatan perjanjiannya menyebut adanya lembar terpisah.
   */
  /**
   * Premi yang DITITIPKAN kepada PIHAK KEDUA untuk diteruskan ke penanggung.
   *
   * Hanya dipakai penutupan pertanggungan (6.4.2). Ia bukan penghasilan
   * PIHAK KEDUA dan karena itu TIDAK boleh masuk `items`: dasar pajak
   * dihitung dari `items`, sehingga memasukkannya ke sana akan menambah PPN
   * dan PPh atas uang yang hanya lewat.
   *
   * Tetapi ia tetap harus TERCETAK. Tanpa itu dokumennya hanya memuat
   * imbalan jasa, sementara klausulnya menyebut "nilai premi yang tercantum
   * dalam dokumen ini" — merujuk sesuatu yang tidak ada di halaman mana pun.
   * Vendor yang membacanya tidak dapat mengetahui apakah yang dibayarkan
   * jasanya saja atau berikut preminya.
   */
  premiums?: {
    task?: string;
    /** Keterangan bebas dokumen lama; tidak lagi diisi maupun dicetak. */
    description?: string;
    amount?: number;
    /*
     * Rincian pertanggungan melekat pada PREMINYA, bukan pada baris imbalan
     * jasa.
     *
     * Satu SPK dapat menutup dua polis dengan nilai, risiko sendiri, dan masa
     * yang berbeda-beda. Selama rinciannya menempel pada baris jasa, kedua
     * polis itu hanya punya satu tempat untuk menuliskannya — dan yang kedua
     * kehilangan angkanya.
     */
    object?: string | null;
    sumInsured?: number;
    deductible?: string | null;
    coverageStart?: string | null;
    coverageEnd?: string | null;
  }[];
  billingTerms?: any[];
  /** Judul lampiran, dua baris seperti dokumen PO lain. */
  billingTitle?: string;
}

/**
 * Penomoran bersarang untuk lampiran; gaya penomoran berganti tiap tingkat,
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

/** Baris identitas vendor; label dan isian dipisah kolom agar titik dua sejajar. */
function buildIdentityTable(data: IPurchaseOrderB) {
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
 * Daftar pekerjaan/sewa alat.
 *
 * Vendor PO-B adalah badan usaha (PKP), sehingga baris PPN tetap
 * ditampilkan walau nilainya nol.
 */
/** Tanggal yang boleh kosong; yang tidak terbaca dianggap tidak diisi. */
function tanggalPertanggungan(nilai: unknown): string {
  if (nilai === null || nilai === undefined) return '';
  const teks = nilai instanceof Date ? nilai : String(nilai).trim();
  if (!teks) return '';
  const hasil = formatDate(teks as any);
  return hasil === '-' ? '' : hasil;
}

/**
 * Rincian pertanggungan yang dicetak di bawah uraian preminya.
 *
 * Inilah yang selama ini diisi di formulir tetapi tidak pernah sampai ke
 * kertas: nilai pertanggungan, risiko sendiri, masa berlakunya, dan objek
 * yang dijamin. Klausul pada dokumen yang sama berbunyi "Masa pertanggungan,
 * nilai pertanggungan, risiko yang dijamin, serta risiko sendiri mengikuti
 * rincian sebagaimana tercantum dalam dokumen ini" — merujuk rincian yang
 * tidak ada di halaman mana pun.
 *
 * Yang kosong DILEWATI, bukan dicetak sebagai "-": baris berlabel tanpa isi
 * pada dokumen yang ditandatangani terbaca sebagai ketentuan yang sengaja
 * dikosongkan.
 */
function rincianPremi(p: any): string[] {
  const baris: string[] = [];

  const objek = String(p?.object ?? '').trim();
  if (objek) baris.push(`Objek yang dijamin: ${objek}`);

  const nilai = Number(p?.sumInsured) || 0;
  if (nilai > 0) baris.push(`Nilai pertanggungan: Rp ${rupiahDokumen(nilai)}`);

  const risiko = String(p?.deductible ?? '').trim();
  if (risiko) baris.push(`Risiko sendiri: ${risiko}`);

  const mulai = tanggalPertanggungan(p?.coverageStart);
  const akhir = tanggalPertanggungan(p?.coverageEnd);
  if (mulai && akhir) {
    baris.push(`Masa pertanggungan: ${mulai} s.d. ${akhir}`);
  } else if (mulai) {
    // Disebut sepihak, bukan dirangkai dengan tanda hubung yang menggantung:
    // "6 Maret 2026 –" terbaca seperti akhir yang terpotong saat mencetak.
    baris.push(`Mulai pertanggungan: ${mulai}`);
  } else if (akhir) {
    baris.push(`Berakhir pertanggungan: ${akhir}`);
  }

  return baris;
}

/**
 * Uraian satu baris premi: judulnya, berikut rinciannya bila ada.
 *
 * Bentuknya sama dengan baris pekerjaan di atasnya — keterangan tambahan
 * dicetak lebih kecil dan lebih redup di bawah judulnya, bukan disambung
 * dengan tanda hubung. Sambungan itulah yang membuat "Ls" pada dokumen
 * sebelumnya terbaca seperti satuan dari nama polisnya.
 */
function uraianPremi(p: any): any {
  const judul = String(p?.task ?? '').trim() || 'Premi';
  const rincian = rincianPremi(p);
  if (!rincian.length) return judul;
  return [
    judul,
    { text: `\n${rincian.join('\n')}`, fontSize: 9, color: '#555555' },
  ];
}

function buildItemTable(data: IPurchaseOrderB) {
  const th = (text: string) => ({
    text,
    style: 'th',
    alignment: 'center' as Alignment,
    margin: [0, text.includes('\n') ? 0 : 6, 0, 0] as Margins,
  });

  const header = [
    th('No.'),
    th('Nama Pekerjaan'),
    /*
     * Pada adendum, yang dicantumkan adalah SELISIH — bukan volume yang
     * berlaku. Judul kolomnya dinyatakan terang-terangan supaya vendor
     * tidak membacanya sebagai volume total, lalu menagih dua kali.
     */
    th(data.isAdendum ? 'Volume\nTambah / Kurang' : 'Volume'),
    th('Satuan'),
    th('Harga Satuan\n(Rp.)'),
    th('Jumlah\n(Rp.)'),
  ];

  /*
   * Mobilisasi dan demobilisasi dicetak sebagai BARIS TERSENDIRI.
   *
   * Bukan dijumlahkan ke dalam baris sewanya: vendor yang memeriksa
   * dokumennya harus dapat mencocokkan volume kali harga satuan dengan
   * jumlahnya. Bila mobilisasi disembunyikan di dalam angka itu, hitungannya
   * tidak pernah cocok dan yang memeriksa menyangka ada salah hitung.
   *
   * Nilainya dititipkan pada `remarks_4` dan `remarks_5` — kolom keterangan
   * yang memang belum terpakai. Dibaca dengan `Number()` karena kolomnya
   * teks.
   */
  const rows = data.items.map((item, i) => {
    const amount = nilaiBaris(item);
    return [
      { text: `${i + 1}.`, style: 'td', alignment: 'center' as Alignment },
      {
        style: 'td',
        text: item.remarks
          ? [
              item.name || '-',
              { text: `\n${item.remarks}`, fontSize: 9, color: '#555555' },
            ]
          : item.name || '-',
      },
      {
        text: angkaSatuan(item.quantity),
        style: 'td',
        alignment: 'center' as Alignment,
      },
      { text: item.unit || '-', style: 'td', alignment: 'center' as Alignment },
      {
        text: rupiahDokumen(item.price),
        style: 'td',
        alignment: 'right' as Alignment,
      },
      { text: rupiahDokumen(amount), style: 'td', alignment: 'right' as Alignment },
    ];
  });

  // Harga satuan yang diisi adalah DPP; PPN ditambahkan di atasnya.
  const subTotal = data.items.reduce(
    (acc, item) =>
      acc +
      // Mobilisasi sudah menjadi baris tersendiri lewat
      // `perluasItemMobilisasi`, sehingga terhitung di sini seperti baris
      // lainnya — dan ikut DPP, karena itu ikut kena PPN.
      nilaiBaris(item),
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
    { text: rupiahDokumen(value), style: 'td', alignment: 'right' as Alignment, bold },
  ];

  /*
   * Premi dicetak SESUDAH total jasa, sebagai blok tersendiri.
   *
   * Bukan digabung ke baris pekerjaan: dasar pajak dihitung dari `items`,
   * dan menyatukannya akan menambah PPN atas uang yang hanya dititipkan.
   * Bukan pula dihilangkan: tanpa angkanya, dokumen ini hanya menyebutkan
   * imbalan jasa dan vendor tidak dapat mengetahui apakah preminya ikut
   * dibayarkan.
   *
   * Baris terakhirnya menjumlahkan keduanya — itulah angka yang sebenarnya
   * berpindah tangan, dan satu-satunya yang selama ini tidak pernah tertulis.
   */
  const premi = (data.premiums ?? []).filter(
    (p) => (Number(p?.amount) || 0) > 0 || String(p?.task ?? '').trim(),
  );
  const jumlahPremi = premi.reduce((a, p) => a + (Number(p?.amount) || 0), 0);

  const barisPremi: any[][] = premi.length
    ? [
        [
          {
            text: 'PREMI — dititipkan untuk diteruskan kepada penanggung, di luar dasar pajak',
            style: 'td',
            colSpan: 6,
            italics: true,
          },
          {}, {}, {}, {}, {},
        ],
        ...premi.map((p, i) => [
          /*
           * Bernomor sendiri, mulai dari satu.
           *
           * Sebelumnya kolom nomornya dikosongkan, sehingga dua polis pada
           * satu dokumen tidak dapat dirujuk dalam percakapan maupun dalam
           * endorsement — tidak ada yang bisa disebut "premi nomor dua".
           * Penomorannya tidak menyambung dari baris jasa di atasnya: itu
           * daftar yang lain, dan menyambungnya membuat keduanya terbaca
           * sebagai satu tagihan.
           */
          { text: `${i + 1}.`, style: 'td', alignment: 'center' as Alignment },
          {
            text: uraianPremi(p),
            style: 'td',
            colSpan: 4,
          },
          {}, {}, {},
          {
            text: rupiahDokumen(Number(p?.amount) || 0),
            style: 'td',
            alignment: 'right' as Alignment,
          },
        ]),
        summaryRow('Jumlah premi', jumlahPremi),
        summaryRow('JUMLAH DIBAYARKAN', total + jumlahPremi, true),
      ]
    : [];

  return {
    table: {
      headerRows: 1,
      widths: [22, '*', 42, 42, 78, 82],
      body: [
        header,
        ...rows,
        summaryRow('Sub Total', subTotal),
        summaryRow('PPN', ppn),
        summaryRow(premi.length ? 'Total jasa' : 'Total', total, true),
        ...barisPremi,
      ],
    },
    layout: TABLE_LAYOUT,
    margin: [0, 6, 0, 12] as Margins,
  };
}

/** Tanda tangan dua pihak, sesuai dokumen SPK. */
function signatureColumns(data: IPurchaseOrderB) {
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
          // tanda tangannya: judul dan nama badan usaha yang tertinggal di
          // kiri membuat blok itu terbaca seperti dua bagian terpisah.
          { text: 'PIHAK KEDUA,', alignment: 'right' as Alignment },
          { text: vendor, alignment: 'right' as Alignment },
          /*
           * Bentuknya disamakan dengan PIHAK PERTAMA lewat `signerLines`.
           *
           * Sebelumnya sisi ini menulis nama vendor DUA KALI: sekali sebagai
           * badan usaha di atas, sekali lagi sebagai penanda tangan di bawah
           * — karena `supplierPIC` kosong dan cadangan yang dipakai adalah
           * nama vendornya sendiri.
           *
           * Cadangannya dibuang. Yang belum diisi tercetak sebagai penunjuk
           * abu-abu "Nama" dan "Jabatan", sama seperti sisi AKN — sehingga
           * yang menandatangani tahu apa yang harus ditulis, bukan menemukan
           * namanya sendiri sudah tercetak di tempat tanda tangannya.
           */
          ...signerLines(data.supplierPIC, data.supplierPICPosition, true),
        ],
      },
    ],
    margin: [0, 10, 0, 0] as Margins,
  };
}

/** Judul seksi pada poin perjanjian. */
function pasalTitle(text: string) {
  return {
    text,
    bold: true,
    margin: [0, 10, 0, 4] as Margins,
  };
}

/**
 * Sisipkan mobilisasi dan demobilisasi sebagai BARIS PEKERJAAN tersendiri.
 *
 * Bukan baris anak tanpa nomor: vendor menagih per baris, dan baris tanpa
 * nomor tidak dapat dirujuk pada invoice maupun berita acara. Dengan nomor
 * sendiri, "nomor 2" pada tagihan menunjuk sesuatu yang pasti.
 *
 * Uraiannya menyebut nomor alat yang dimaksud, sehingga tetap terbaca
 * sebagai satu kesatuan walaupun barisnya terpisah.
 *
 * Dipakai DUA jalur cetak — dari formulir dan dari cetak ulang. Ditulis di
 * sini, bukan di masing-masing, karena sebelumnya mobilisasi memang tidak
 * pernah sampai ke dokumen: kedua jalur menyusun daftar itemnya sendiri dan
 * keduanya lupa menyertakannya.
 */
export function perluasItemMobilisasi(
  items: readonly IPurchaseOrderBItem[],
): IPurchaseOrderBItem[] {
  const hasil: IPurchaseOrderBItem[] = [];

  items.forEach((item) => {
    hasil.push(item);
    const nomorAlat = hasil.length; // nomor baris alatnya, setelah disisipkan

    const tambahan: Array<[string, number]> = [
      ['Mobilisasi', Number(item.remarks_4) || 0],
      ['Demobilisasi', Number(item.remarks_5) || 0],
    ];

    tambahan.forEach(([label, nilai]) => {
      // Yang bernilai nol tidak dicetak: PO tanpa mobilisasi tampil persis
      // seperti sebelumnya.
      if (nilai <= 0) return;
      hasil.push({
        name: `${label} ${item.name || ''} sesuai pada nomor ${nomorAlat}`.replace(
          /\s+/g,
          ' ',
        ),
        quantity: 1,
        unit: 'LS',
        price: nilai,
      });
    });
  });

  return hasil;
}

export function printPurchaseOrderB(
  data: IPurchaseOrderB,
  output: PdfOutput = 'open',
) {
  // Poin perjanjian dirakit dari template + data, bukan teks tersimpan.
  const clauses = buildClauseLines(
    data.poType || 'B',
    data.clauseContext,
    data.templateVersion,
    data.additionalClauses,
  );

  /*
   * Sebagian jenis PO merakit klausulnya sebagai seksi berjudul, bukan satu
   * daftar rata — dan seksinya dikirim langsung oleh pemanggil karena tidak
   * terdaftar di CLAUSE_TEMPLATES. Bila ada, seksi itulah yang dicetak.
   */
  const sections = data.sections;

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
        text: workIntroSentence(data.poType, data.isAdendum),
        margin: [0, 0, 0, 4] as Margins,
      },

      buildItemTable(data),

      {
        text: 'Catatan dalam perjanjian adalah:',
        margin: [0, 2, 0, 4] as Margins,
      },
      ...(sections?.length
        ? sections.flatMap((sec: any) => [
            ...(sec.title ? [pasalTitle(sec.title)] : []),
            { ...clauseList(sec.items || []), margin: [0, 0, 0, 8] as Margins },
          ])
        : [{ ...clauseList(clauses), margin: [0, 0, 0, 12] as Margins }]),

      {
        text: 'Demikian kami sampaikan, atas perhatiannya kami ucapkan terima kasih.',
        margin: [0, 0, 0, 18] as Margins,
      },

      signatureColumns(data),

      // ---------- lampiran: tata cara penagihan ----------
      ...(data.billingTerms?.length
        ? [
            {
              text:
                data.billingTitle ||
                'TATA CARA PENAGIHAN DAN PEMBAYARAN\nPENYEDIA JASA',
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
