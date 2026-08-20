import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

import { PURCHASE_TYPE_LABELS } from '../constants/purchase-type-label.constant';
import { documentFonts } from '../constants/document-font.constant';
import {
  RentangRekap,
  labelRentang,
  potonganBerkas,
} from '../constants/rentang-rekap';
import {
  IRekapItem,
  IRekapPO,
  barisRekapDokumen,
  namaPemasokRekap,
  sudahDisetujuiRekap,
} from './purchase-order-rekap-excel';

/**
 * Rekap purchase order sebuah proyek sebagai PDF.
 *
 * Bentuknya SENGAJA berbeda dari berkas Excel-nya, bukan salinan yang sama
 * dituangkan ke halaman: PDF dibaca, bukan disaring dan dijumlah. Karena itu
 * ia memuat ikhtisar dan satu baris per DOKUMEN, tanpa rincian per barang —
 * seratus halaman baris barang tidak membantu siapa pun membacanya.
 *
 * Yang perlu menyaring, menjumlah, atau mengolah angkanya memakai Excel.
 */

const BIRU = '#1f3864';
const BIRU_MUDA = '#d9e2f3';
const MERAH = '#c00000';
const ABU = '#7f7f7f';

function angka(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function rp(n: number): string {
  return n.toLocaleString('id-ID', { maximumFractionDigits: 0 });
}

function labelJenis(kode: string): string {
  return PURCHASE_TYPE_LABELS[kode] || kode || '—';
}

function tanggalIndo(v: string): string {
  const d = new Date(v);
  if (isNaN(d.getTime())) return v || '—';
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Nilai sebuah dokumen: DPP, PPN, PPh, dan yang dibayarkan.
 *
 * Dihitung sekali di sini dan dipakai baik oleh tabelnya maupun ikhtisarnya,
 * sehingga keduanya tidak dapat berbeda.
 */
function nilaiDokumen(po: IRekapPO): {
  dpp: number;
  ppn: number;
  pph: number;
  total: number;
} {
  const dpp = angka(po.dpp);
  const ppn = Math.round(((dpp * angka(po.ppn)) / 100) * 100) / 100;
  const pph = Math.round(((dpp * angka(po.pphPercentage)) / 100) * 100) / 100;
  return { dpp, ppn, pph, total: dpp + ppn - pph };
}

function sel(teks: string, opsi: Record<string, unknown> = {}): any {
  return { text: teks, fontSize: 7.5, ...opsi };
}

function kepalaSel(teks: string, rata: string = 'center'): any {
  return {
    text: teks,
    fontSize: 7.5,
    bold: true,
    color: BIRU,
    alignment: rata,
    fillColor: BIRU_MUDA,
    margin: [0, 3, 0, 3],
  };
}

function tabelIkhtisar(daftar: IRekapPO[]): any {
  const total = daftar.reduce(
    (a, po) => {
      const n = nilaiDokumen(po);
      return {
        dpp: a.dpp + n.dpp,
        ppn: a.ppn + n.ppn,
        pph: a.pph + n.pph,
        total: a.total + n.total,
      };
    },
    { dpp: 0, ppn: 0, pph: 0, total: 0 },
  );

  const baris = [
    ['Jumlah dokumen', String(daftar.length)],
    ['DPP', `Rp ${rp(total.dpp)}`],
    ['PPN', `Rp ${rp(total.ppn)}`],
    ['PPh dipotong', `Rp ${rp(total.pph)}`],
  ].map(([a, b]) => [
    sel(a, { fontSize: 8 }),
    sel(b, { fontSize: 8, alignment: 'right' }),
  ]);

  baris.push([
    sel('Nilai dibayarkan', { fontSize: 8, bold: true, fillColor: BIRU_MUDA }),
    sel(`Rp ${rp(total.total)}`, {
      fontSize: 8,
      bold: true,
      alignment: 'right',
      fillColor: BIRU_MUDA,
    }),
  ]);

  return {
    table: { widths: ['*', 120], body: baris },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => '#bfbfbf',
      vLineColor: () => '#bfbfbf',
      paddingTop: () => 4,
      paddingBottom: () => 4,
    },
    margin: [0, 0, 0, 14],
  };
}

function tabelPerJenis(daftar: IRekapPO[]): any {
  const per = new Map<string, { n: number; dpp: number; total: number }>();
  for (const po of daftar) {
    const k = labelJenis(po.purchaseType);
    const n = nilaiDokumen(po);
    const s = per.get(k) || { n: 0, dpp: 0, total: 0 };
    per.set(k, { n: s.n + 1, dpp: s.dpp + n.dpp, total: s.total + n.total });
  }

  const body: any[] = [
    [
      kepalaSel('Jenis', 'left'),
      kepalaSel('Dokumen'),
      kepalaSel('DPP', 'right'),
      kepalaSel('Nilai dibayarkan', 'right'),
    ],
  ];
  for (const [nama, v] of Array.from(per.entries()).sort()) {
    body.push([
      sel(nama),
      sel(String(v.n), { alignment: 'center' }),
      sel(`Rp ${rp(v.dpp)}`, { alignment: 'right' }),
      sel(`Rp ${rp(v.total)}`, { alignment: 'right' }),
    ]);
  }

  return {
    table: { headerRows: 1, widths: ['*', 50, 90, 100], body },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => '#bfbfbf',
      vLineColor: () => '#bfbfbf',
      paddingTop: () => 3,
      paddingBottom: () => 3,
    },
    margin: [0, 0, 0, 14],
  };
}

function tabelDokumen(daftar: IRekapPO[], items: IRekapItem[]): any {
  const body: any[] = [
    [
      kepalaSel('No.'),
      kepalaSel('Tanggal'),
      kepalaSel('Nomor', 'left'),
      kepalaSel('Jenis', 'left'),
      kepalaSel('Vendor / Penerima', 'left'),
      kepalaSel('Baris'),
      kepalaSel('DPP', 'right'),
      kepalaSel('PPN', 'right'),
      kepalaSel('PPh', 'right'),
      kepalaSel('Total', 'right'),
      kepalaSel('Status'),
    ],
  ];

  daftar.forEach((po, i) => {
    const n = nilaiDokumen(po);
    const jumlahBaris = barisRekapDokumen(po, items).length;
    const draf = !sudahDisetujuiRekap(po);
    body.push([
      sel(String(i + 1), { alignment: 'center' }),
      sel(tanggalIndo(po.date), { alignment: 'center' }),
      sel(po.name),
      sel(labelJenis(po.purchaseType)),
      sel(namaPemasokRekap(po)),
      sel(String(jumlahBaris), { alignment: 'center' }),
      sel(rp(n.dpp), { alignment: 'right' }),
      sel(rp(n.ppn), { alignment: 'right' }),
      sel(rp(n.pph), { alignment: 'right' }),
      sel(rp(n.total), { alignment: 'right', bold: true }),
      sel(draf ? 'Draf' : 'Disetujui', {
        alignment: 'center',
        bold: draf,
        color: draf ? MERAH : undefined,
      }),
    ]);
  });

  return {
    table: {
      headerRows: 1,
      /*
       * Lebarnya SAMA dengan kedua tabel di atasnya.
       *
       * Keduanya memakai `'*'` sehingga selalu selebar halaman (781,89 pt
       * pada A4 mendatar dengan tepi 30). Tabel ini semula seluruhnya
       * berukuran tetap dan berjumlah 608 pt — 174 pt lebih sempit, dan
       * ketiganya tampak seperti tiga tabel yang tidak sejajar.
       *
       * Sisanya diberikan kepada `Jenis` dan `Vendor / Penerima`: keduanya
       * kolom teks, dan hanya keduanya yang isinya membungkus ke baris
       * berikutnya bila sempit. Kolom angka dibiarkan tetap — melebarkannya
       * hanya menambah ruang kosong di kiri angka yang rata kanan.
       */
      widths: [18, 46, 78, '*', '*', 26, 62, 52, 46, 66, 44],
      body,
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => '#bfbfbf',
      vLineColor: () => '#bfbfbf',
      paddingTop: () => 3,
      paddingBottom: () => 3,
    },
  };
}

/** Susun dan unduh rekap sebuah proyek sebagai PDF. */
export function unduhRekapPurchaseOrderPdf(
  proyek: string,
  daftar: IRekapPO[],
  items: IRekapItem[],
  rentang: RentangRekap = { dari: null, sampai: null },
): void {
  const hariIni = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const periode = labelRentang(rentang);

  const dd: any = {
    // MENDATAR: sebelas kolom tidak muat pada halaman tegak, dan memaksanya
    // menghasilkan angka yang terpotong justru pada kolom nilainya.
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [30, 64, 30, 42],
    /*
     * Calibri, sama dengan seluruh dokumen purchase order.
     *
     * Roboto memang tersedia sebagai cadangan, tetapi memakainya membuat
     * rekap terlihat berasal dari sistem yang berbeda ketika diletakkan
     * berdampingan dengan dokumen yang direkapnya.
     */
    defaultStyle: { font: 'Calibri', fontSize: 8 },

    header: () => ({
      margin: [30, 22, 30, 0],
      columns: [
        {
          stack: [
            {
              text: `REKAP PURCHASE ORDER — PROYEK ${proyek}`,
              fontSize: 12,
              bold: true,
              color: BIRU,
            },
            {
              text: 'PT Alpha Konstruksi Nusantara',
              fontSize: 7.5,
              color: ABU,
            },
          ],
        },
        {
          /*
           * Periodenya disebut PADA dokumennya, di setiap halaman.
           *
           * Rekap sepotong yang tidak menyebut periodenya terbaca sebagai
           * rekap seluruh proyek, dan penerimanya menyimpulkan proyek itu
           * hanya punya sekian pembelian.
           */
          stack: [
            { text: `Periode: ${periode}`, fontSize: 7.5, bold: true, color: BIRU },
            { text: `Disusun ${hariIni}`, fontSize: 7.5, color: ABU },
          ],
          alignment: 'right',
        },
      ],
    }),

    footer: (halaman: number, jumlah: number) => ({
      margin: [30, 8, 30, 0],
      columns: [
        {
          text:
            'Dokumen berstatus Draf BELUM disetujui dan belum mengikat.',
          fontSize: 7,
          color: ABU,
        },
        {
          text: `${halaman} / ${jumlah}`,
          fontSize: 7,
          color: ABU,
          alignment: 'right',
        },
      ],
    }),

    content: [
      { text: 'Ikhtisar', fontSize: 10, bold: true, color: BIRU, margin: [0, 0, 0, 6] },
      tabelIkhtisar(daftar),
      { text: 'Menurut jenis dokumen', fontSize: 10, bold: true, color: BIRU, margin: [0, 0, 0, 6] },
      tabelPerJenis(daftar),
      { text: 'Daftar dokumen', fontSize: 10, bold: true, color: BIRU, margin: [0, 0, 0, 6] },
      tabelDokumen(daftar, items),
      {
        text:
          'Catatan: nilai mengacu pada dokumen, termasuk mobilisasi dan ' +
          'demobilisasi yang dicatat pada baris tersendiri. Rincian per ' +
          'barang tersedia pada berkas Excel.',
        fontSize: 7,
        italics: true,
        color: ABU,
        margin: [0, 10, 0, 0],
      },
    ],
  };

  // pdfmake 0.2.x mengekspor { vfs }, versi lama mengekspor objeknya langsung
  const baseVfs = (pdfFonts as any).vfs ?? (pdfFonts as any);
  const { fonts, vfs } = documentFonts(baseVfs);
  const pdf = pdfMake.createPdf(dd, undefined, fonts as any, vfs as any);
  pdf.download(
    `Rekap_Purchase_Order_${proyek}_${potonganBerkas(rentang)}.pdf`,
  );
}
