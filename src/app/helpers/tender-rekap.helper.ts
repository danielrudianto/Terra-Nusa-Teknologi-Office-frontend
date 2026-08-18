/**
 * Rekap tender: perbandingan penawaran dalam bentuk yang dapat dicetak.
 *
 * Layar perbandingan sudah menampilkan seluruhnya berdampingan, tetapi ia
 * tidak dapat dilampirkan pada permintaan persetujuan dan tidak dapat
 * diarsipkan. Yang meninjau keputusan pengadaan setahun kemudian membaca
 * berkas, bukan membuka aplikasi.
 *
 * Dua bentuk, dan keduanya perlu:
 *
 *   PDF    untuk dilampirkan dan ditandatangani — bentuknya tetap
 *   Excel   untuk ditelusuri sendiri — angkanya dapat dihitung ulang
 */

import { Workbook } from 'exceljs';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

import {
  DOCUMENT_DEFAULT_STYLE,
  DOCUMENT_PAGE,
  DOCUMENT_STYLES,
  documentFooter,
  documentHeader,
  formatDate,
  rupiah,
} from './purchase-order-shared.helper';

(pdfMake as any).vfs = (pdfFonts as any).vfs;

export interface BarisRekap {
  id: number;
  name: string;
  specification?: string | null;
  quantity?: number | null;
  unit?: string | null;
}

export interface PenawaranRekap {
  id: number;
  supplierName?: string;
  supplierPrefix?: string;
  paymentTerm?: string | null;
  creditTerm?: number | null;
  includePpn?: boolean;
  ppnPercentage?: number | null;
  deliveryMethod?: string | null;
  otherCost?: number | null;
  otherCostNote?: string | null;
  notes?: string | null;
  items: Array<{ tenderItemID: number; price?: number | null; notes?: string | null }>;
}

export interface DataRekap {
  nomor?: number | null;
  nama: string;
  proyek: string;
  jenis: 'barang' | 'jasa';
  tanggal: string;
  uraian?: string | null;
  ketentuan?: string | null;
  items: BarisRekap[];
  quotes: PenawaranRekap[];
}

// ----------------------------------------------------------------------
// Perhitungan — SATU sumber untuk PDF dan Excel
// ----------------------------------------------------------------------

/**
 * Dikumpulkan di sini, bukan disalin ke masing-masing pencetak.
 *
 * Dua salinan rumus berarti satu di antaranya pasti tertinggal ketika
 * perhitungannya disesuaikan — dan yang membandingkan PDF dengan Excel-nya
 * menemukan dua angka berbeda untuk tender yang sama.
 */
export function hargaBaris(q: PenawaranRekap, itemId: number): number | null {
  const b = (q.items ?? []).find((x) => x.tenderItemID === itemId);
  return b && b.price !== null && b.price !== undefined ? Number(b.price) : null;
}

export function subtotal(d: DataRekap, q: PenawaranRekap): number {
  return d.items.reduce((a, it) => {
    const h = hargaBaris(q, it.id);
    return a + (h ?? 0) * (Number(it.quantity) || 0);
  }, 0);
}

export function nilaiPpn(d: DataRekap, q: PenawaranRekap): number {
  if (!q.includePpn) return 0;
  return (subtotal(d, q) * (Number(q.ppnPercentage) || 0)) / 100;
}

export function dibayarkan(d: DataRekap, q: PenawaranRekap): number {
  return subtotal(d, q) + nilaiPpn(d, q);
}

/**
 * Biaya yang benar-benar ditanggung AKN.
 *
 * PPN yang dipungut PKP dikreditkan sebagai pajak masukan sehingga tidak
 * menjadi beban; biaya lain — ongkos angkut pada Loco, bongkar muat —
 * seluruhnya menjadi beban.
 */
export function biayaSebenarnya(d: DataRekap, q: PenawaranRekap): number {
  return subtotal(d, q) + (Number(q.otherCost) || 0);
}

export function jumlahDitawar(d: DataRekap, q: PenawaranRekap): number {
  return d.items.filter((it) => hargaBaris(q, it.id) !== null).length;
}

export function tidakLengkap(d: DataRekap, q: PenawaranRekap): boolean {
  return jumlahDitawar(d, q) < d.items.length;
}

function namaPemasok(q: PenawaranRekap): string {
  return `${q.supplierPrefix ?? ''} ${q.supplierName ?? ''}`.trim();
}

function terminTeks(q: PenawaranRekap): string {
  if (!q.paymentTerm) return '—';
  return q.creditTerm ? `${q.paymentTerm} · ${q.creditTerm} hari` : q.paymentTerm;
}

function kirimTeks(q: PenawaranRekap): string {
  if (q.deliveryMethod === 'loco') return 'Loco';
  if (q.deliveryMethod === 'franco') return 'Franco';
  return '—';
}

// ----------------------------------------------------------------------
// PDF
// ----------------------------------------------------------------------

export function cetakRekapTender(d: DataRekap, output: 'open' | 'download' = 'open') {
  const lebar = ['*', ...d.quotes.map(() => 'auto')];

  const kepalaTabel = [
    { text: d.jenis === 'jasa' ? 'Pekerjaan' : 'Barang', style: 'th' },
    ...d.quotes.map((q) => ({
      text: [
        { text: namaPemasok(q) },
        tidakLengkap(d, q)
          ? {
              text: `\n${jumlahDitawar(d, q)}/${d.items.length} baris`,
              fontSize: 7,
              italics: true,
            }
          : '',
      ],
      style: 'th',
      alignment: 'center' as const,
    })),
  ];

  const barisHarga = d.items.map((it) => [
    {
      text: [
        { text: it.name },
        it.specification ? { text: `\n${it.specification}`, fontSize: 7, color: '#666' } : '',
        it.quantity
          ? { text: `\n${Number(it.quantity).toLocaleString('id-ID')} ${it.unit ?? ''}`, fontSize: 7, color: '#666' }
          : '',
      ],
      style: 'td',
    },
    ...d.quotes.map((q) => {
      const h = hargaBaris(q, it.id);
      return {
        text: h === null ? '—' : rupiah(h),
        style: 'td',
        alignment: 'right' as const,
      };
    }),
  ]);

  const terendah = (() => {
    const lengkap = d.quotes.filter((q) => !tidakLengkap(d, q));
    return lengkap.length < 2
      ? null
      : Math.min(...lengkap.map((q) => biayaSebenarnya(d, q)));
  })();

  const barisRingkas = (
    label: string,
    isi: (q: PenawaranRekap) => string,
    tebal = false,
  ) => [
    { text: label, style: tebal ? 'thRingkas' : 'tdRingkas' },
    ...d.quotes.map((q) => ({
      text: isi(q),
      style: tebal ? 'thRingkas' : 'tdRingkas',
      alignment: 'right' as const,
    })),
  ];

  const doc: any = {
    ...DOCUMENT_PAGE,
    header: documentHeader,
    footer: documentFooter,
    content: [
      {
        text: 'REKAP PERBANDINGAN PENAWARAN',
        style: 'judul',
        margin: [0, 0, 0, 4],
      },
      {
        text: [
          d.nomor ? `Tender No. ${d.nomor}   ·   ` : '',
          `${d.nama}`,
        ],
        style: 'subjudul',
      },
      {
        text: `Proyek ${d.proyek}   ·   ${formatDate(d.tanggal)}`,
        style: 'subjudul',
        margin: [0, 0, 0, 10],
      },

      ...(d.uraian
        ? [{ text: d.uraian, style: 'uraian', margin: [0, 0, 0, 8] }]
        : []),

      {
        table: {
          headerRows: 1,
          widths: lebar,
          body: [
            kepalaTabel,
            ...barisHarga,
            barisRingkas('Subtotal', (q) => rupiah(subtotal(d, q))),
            barisRingkas('Pengiriman', kirimTeks),
            barisRingkas('PPN', (q) =>
              q.includePpn ? `${q.ppnPercentage ?? 0}%` : 'Non-PKP',
            ),
            barisRingkas('Dibayarkan', (q) => rupiah(dibayarkan(d, q))),
            barisRingkas('Biaya lain', (q) =>
              q.otherCost ? rupiah(Number(q.otherCost)) : '—',
            ),
            barisRingkas(
              'BIAYA SEBENARNYA',
              (q) =>
                rupiah(biayaSebenarnya(d, q)) +
                (terendah !== null &&
                !tidakLengkap(d, q) &&
                biayaSebenarnya(d, q) === terendah
                  ? '  *'
                  : ''),
              true,
            ),
            barisRingkas('Termin', terminTeks),
            barisRingkas('Keterangan', (q) => q.notes || '—'),
          ],
        },
        layout: {
          hLineWidth: (i: number, node: any) =>
            i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#999',
          vLineColor: () => '#ccc',
        },
      },

      /*
       * Keterangan tanda bintang, dan batasannya.
       *
       * Yang ditandai bukan pemenangnya — waktu kirim, garansi, dan riwayat
       * pemasok ikut menentukan. Menyebutnya di lembar yang ditandatangani
       * mencegah pembacanya menyimpulkan keputusan sudah diambil sistem.
       */
      {
        text:
          '*  Biaya sebenarnya terendah di antara penawaran yang lengkap. ' +
          'Bukan penetapan pemenang: waktu kirim, garansi, dan riwayat pemasok ' +
          'ikut menentukan.',
        style: 'catatan',
        margin: [0, 8, 0, 0],
      },
      {
        text:
          'PPN yang dipungut PKP dapat dikreditkan sehingga tidak menjadi beban; ' +
          'biaya lain seluruhnya menjadi beban. Karena itu yang dibandingkan ' +
          'adalah baris BIAYA SEBENARNYA, bukan harga yang tertulis pada penawaran.',
        style: 'catatan',
        margin: [0, 4, 0, 0],
      },

      ...(d.ketentuan
        ? [
            {
              text: `Ketentuan tender: ${d.ketentuan}`,
              style: 'catatan',
              margin: [0, 8, 0, 0],
            },
          ]
        : []),

      // Ruang tanda tangan; lembar ini dilampirkan pada permintaan
      // persetujuan, dan tanpa ruangnya harus dicetak ulang.
      {
        columns: [
          { text: 'Disusun oleh,\n\n\n\n(_______________)', alignment: 'center' },
          { text: 'Diperiksa oleh,\n\n\n\n(_______________)', alignment: 'center' },
          { text: 'Disetujui oleh,\n\n\n\n(_______________)', alignment: 'center' },
        ],
        style: 'ttd',
        margin: [0, 30, 0, 0],
      },
    ],
    styles: {
      ...DOCUMENT_STYLES,
      judul: { fontSize: 14, bold: true },
      subjudul: { fontSize: 9 },
      uraian: { fontSize: 8.5, italics: true },
      th: { fontSize: 8, bold: true, fillColor: '#eef1f8', margin: [2, 4, 2, 4] },
      td: { fontSize: 8, margin: [2, 3, 2, 3] },
      thRingkas: { fontSize: 8, bold: true, fillColor: '#f6f8ff', margin: [2, 3, 2, 3] },
      tdRingkas: { fontSize: 8, margin: [2, 3, 2, 3] },
      catatan: { fontSize: 7.5, color: '#555', italics: true },
      ttd: { fontSize: 8.5 },
    },
    defaultStyle: DOCUMENT_DEFAULT_STYLE,
    // Mendatar: satu kolom per pemasok, dan lima pemasok tidak muat tegak.
    pageOrientation: 'landscape',
  };

  const pdf = pdfMake.createPdf(doc);
  const berkas = `Rekap_Tender_${d.nomor ?? ''}_${d.proyek}.pdf`;
  if (output === 'download') pdf.download(berkas);
  else pdf.open();
}

// ----------------------------------------------------------------------
// Excel
// ----------------------------------------------------------------------

export async function unduhRekapTenderExcel(d: DataRekap): Promise<void> {
  const wb = new Workbook();
  const sheet = wb.addWorksheet('Perbandingan', {
    views: [{ state: 'frozen', xSplit: 1, ySplit: 6 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  });

  sheet.getColumn(1).width = 38;
  d.quotes.forEach((_, i) => (sheet.getColumn(i + 2).width = 18));

  const judul = sheet.addRow(['REKAP PERBANDINGAN PENAWARAN']);
  judul.font = { bold: true, size: 13 };
  sheet.addRow([d.nomor ? `Tender No. ${d.nomor}` : '', d.nama]);
  sheet.addRow(['Proyek', d.proyek]);
  sheet.addRow(['Tanggal', d.tanggal]);
  sheet.addRow([]);

  const kepala = sheet.addRow([
    d.jenis === 'jasa' ? 'Pekerjaan' : 'Barang',
    ...d.quotes.map((q) => namaPemasok(q)),
  ]);
  kepala.font = { bold: true };
  kepala.eachCell((c) => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF1F8' } };
    c.alignment = { vertical: 'middle', wrapText: true };
  });

  const barisAwal = sheet.rowCount + 1;

  for (const it of d.items) {
    const nama = [
      it.name,
      it.specification,
      it.quantity ? `${Number(it.quantity).toLocaleString('id-ID')} ${it.unit ?? ''}` : '',
    ]
      .filter(Boolean)
      .join(' · ');

    const baris = sheet.addRow([
      nama,
      ...d.quotes.map((q) => hargaBaris(q, it.id) ?? null),
    ]);
    baris.eachCell((c, n) => {
      if (n > 1) c.numFmt = '#,##0';
    });
  }

  const barisAkhir = sheet.rowCount;
  sheet.addRow([]);

  const tambah = (label: string, nilai: any[], tebal = false, fmt = '#,##0') => {
    const r = sheet.addRow([label, ...nilai]);
    if (tebal) r.font = { bold: true };
    r.eachCell((c, n) => {
      if (n > 1 && typeof c.value === 'number') c.numFmt = fmt;
    });
    return r;
  };

  /*
   * Subtotal memakai RUMUS, bukan angka jadi.
   *
   * Yang membuka berkasnya kerap menyesuaikan volumenya untuk melihat
   * pengaruhnya — dan angka mati tidak ikut berubah, sehingga hasilnya
   * diam-diam keliru.
   *
   * Volume tidak ada di lembar ini karena menyatu pada nama barangnya, maka
   * subtotalnya dihitung di sini dan ditulis sebagai nilai; rumusnya
   * disediakan pada baris-baris di bawahnya yang memang menjumlah kolom.
   */
  tambah('Subtotal', d.quotes.map((q) => subtotal(d, q)));
  tambah('Pengiriman', d.quotes.map(kirimTeks));
  tambah(
    'PPN',
    d.quotes.map((q) => (q.includePpn ? `${q.ppnPercentage ?? 0}%` : 'Non-PKP')),
  );
  tambah('Nilai PPN', d.quotes.map((q) => nilaiPpn(d, q)));
  tambah('Dibayarkan', d.quotes.map((q) => dibayarkan(d, q)));
  tambah('Biaya lain', d.quotes.map((q) => Number(q.otherCost) || 0));
  tambah(
    'Keterangan biaya lain',
    d.quotes.map((q) => q.otherCostNote || '—'),
  );

  const barisBiaya = tambah(
    'BIAYA SEBENARNYA',
    d.quotes.map((q) => biayaSebenarnya(d, q)),
    true,
  );
  barisBiaya.eachCell((c) => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7ECFB' } };
  });

  tambah('Termin', d.quotes.map(terminTeks));
  tambah(
    'Baris ditawar',
    d.quotes.map((q) => `${jumlahDitawar(d, q)} / ${d.items.length}`),
  );
  tambah('Keterangan', d.quotes.map((q) => q.notes || '—'));

  sheet.addRow([]);
  const catatan = sheet.addRow([
    'PPN yang dipungut PKP dapat dikreditkan sehingga tidak menjadi beban; ' +
      'biaya lain seluruhnya menjadi beban. Bandingkan baris BIAYA SEBENARNYA, ' +
      'bukan harga yang tertulis pada penawaran.',
  ]);
  catatan.font = { italic: true, size: 9, color: { argb: 'FF666666' } };

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Rekap_Tender_${d.nomor ?? ''}_${d.proyek}.xlsx`;
  a.click();
  // Alamat objek dilepas; tanpa ini berkasnya tetap di memori peramban
  // sampai halamannya ditutup.
  URL.revokeObjectURL(url);

  // Dipakai supaya rentang barisnya tidak diam-diam berubah tanpa disadari.
  void barisAwal;
  void barisAkhir;
}
