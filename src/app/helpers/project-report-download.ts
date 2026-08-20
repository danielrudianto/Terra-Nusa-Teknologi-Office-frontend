import type { Alignment, Margins } from 'pdfmake/interfaces';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { documentFonts } from '../constants/document-font.constant';
import { downloadRecapExcel } from './tax-recap-excel';

/**
 * Unduhan Laporan Proyek — Excel dan PDF.
 *
 * Isinya mengikuti apa yang terlihat di layar: ringkasan nilai, komposisi
 * biaya per kategori beserta rincian pemasoknya, dan arus per minggu.
 *
 * Angkanya TIDAK dihitung ulang di sini. Seluruhnya diterima jadi dari
 * komponen, yang sudah menghitungnya untuk ditampilkan — menghitung ulang
 * berarti dua rumus untuk satu angka, dan berkas unduhan bisa berbeda dari
 * layarnya tanpa ada yang menyadari.
 */

export interface BarisPemasokLaporan {
  nama: string;
  nilai: number;
}

export interface KategoriLaporan {
  kode: string;
  nama: string;
  nilai: number;
  pemasok: BarisPemasokLaporan[];
}

export interface MingguLaporan {
  label: string;
  biaya: number;
  tagihan: number;
  biayaKumulatif: number;
}

export interface DataLaporanProyek {
  kodeProyek: string;
  namaProyek: string;
  namaKlien?: string;
  /** DPP kontrak — dasar perhitungan margin. */
  nilaiKontrak: number;
  /** Nominal kontrak termasuk PPN, untuk keterangan. */
  nominalKontrak: number;
  /**
   * Biaya SEUMUR PROYEK — pasangan margin, tidak pernah disaring tahun.
   *
   * Semula bernama `totalBiaya`. Nama itu tidak menyebutkan cakupannya, dan
   * begitu ada dua cakupan, setiap pemakaiannya harus ditebak dari
   * sekitarnya — persis keadaan yang membuat tertukarnya mungkin.
   */
  biayaSeumurProyek: number;
  margin: number;
  tertagih: number;
  /**
   * Biaya TAHUN TERPILIH.
   *
   * Sama dengan `biayaSeumurProyek` selama periodenya "Seluruh periode". Begitu
   * satu tahun dipilih, rincian kategori di berkas ini hanya memuat tahun
   * itu — dan porsinya harus dibagi angka ini, bukan biaya seumur proyek,
   * kalau tidak jumlah seluruh porsinya tidak lagi seratus persen.
   */
  biayaPeriode?: number;
  kategori: KategoriLaporan[];
  mingguan: MingguLaporan[];
  /** Teks periode yang tampil di layar, mis. "Agustus 2026". */
  periode?: string;
}

const PERUSAHAAN = 'PT. ALPHA KONSTRUKSI NUSANTARA';

function rupiah(n: number): string {
  return `Rp ${Math.round(Number(n) || 0).toLocaleString('id-ID')}`;
}

function persen(bagian: number, dari: number): string {
  if (!dari) return '—';
  return `${((bagian / dari) * 100).toFixed(1)}%`;
}

function namaBerkas(d: DataLaporanProyek): string {
  const kode = (d.kodeProyek || 'PROYEK').replace(/[^\w.-]+/g, '-');
  return `Laporan Proyek ${kode}`;
}

/* ------------------------------------------------------------------ */
/* Excel                                                               */
/* ------------------------------------------------------------------ */

/**
 * Tiga lembar, bukan satu.
 *
 * Ringkasan, komposisi biaya, dan arus per minggu menjawab pertanyaan yang
 * berbeda dan punya bentuk kolom yang berbeda pula. Menumpuknya dalam satu
 * lembar memaksa kolom yang tidak berhubungan berbagi lebar, dan hasilnya
 * sulit disaring maupun dijumlah ulang.
 */
export async function unduhLaporanProyekExcel(
  d: DataLaporanProyek,
): Promise<void> {
  const periode = d.periode ? `Periode: ${d.periode}` : undefined;
  const judul = `${d.kodeProyek} — ${d.namaProyek}`;
  // Berkas lama tidak mengirimkannya; tanpa cadangan ini porsinya menjadi
  // `NaN%` alih-alih angka.
  const biayaPeriode = d.biayaPeriode ?? d.biayaSeumurProyek;

  const ringkasan = [
    { label: 'Nilai kontrak (DPP)', nilai: d.nilaiKontrak, ket: 'Dasar perhitungan margin' },
    { label: 'Nilai kontrak (termasuk PPN)', nilai: d.nominalKontrak, ket: '' },
    { label: 'Total biaya (seumur proyek)', nilai: d.biayaSeumurProyek, ket: persen(d.biayaSeumurProyek, d.nilaiKontrak) + ' dari kontrak' },
    { label: 'Margin atas kontrak (seumur proyek)', nilai: d.margin, ket: persen(d.margin, d.nilaiKontrak) + ' dari kontrak' },
    { label: 'Sudah tertagih', nilai: d.tertagih, ket: persen(d.tertagih, d.nilaiKontrak) + ' dari kontrak' },
  ];

  /*
   * Baris biaya periode HANYA muncul bila periodenya memang dipersempit.
   *
   * Pada rekap seluruh periode, angkanya sama persis dengan baris di
   * atasnya — dan dua baris berangka sama membuat yang membacanya mencari
   * beda yang tidak ada.
   */
  if (biayaPeriode !== d.biayaSeumurProyek) {
    ringkasan.push({
      label: `Biaya periode ${d.periode}`,
      nilai: biayaPeriode,
      ket: 'Dasar porsi pada lembar Komposisi Biaya',
    });
  }

  /*
   * Rincian pemasok ditulis sebagai baris tersendiri di bawah kategorinya,
   * bukan digabung ke satu sel.
   *
   * Digabung, isinya tidak dapat disaring maupun dijumlah ulang di Excel —
   * dan itulah alasan utama orang mengunduhnya ke Excel, bukan PDF.
   */
  const komposisi: Record<string, any>[] = [];
  d.kategori.forEach((k) => {
    komposisi.push({
      kategori: k.nama,
      pemasok: '',
      nilai: k.nilai,
      porsi: persen(k.nilai, biayaPeriode),
    });
    k.pemasok.forEach((p) =>
      komposisi.push({
        kategori: '',
        pemasok: p.nama,
        nilai: p.nilai,
        porsi: persen(p.nilai, k.nilai || 1),
      }),
    );
  });

  const arus = d.mingguan.map((m) => ({
    minggu: m.label,
    biaya: m.biaya,
    tagihan: m.tagihan,
    kumulatif: m.biayaKumulatif,
    sisa: d.nilaiKontrak - m.biayaKumulatif,
  }));

  await downloadRecapExcel(
    [
      {
        fileName: namaBerkas(d),
        sheetName: 'Ringkasan',
        title: `LAPORAN PROYEK — ${judul}`,
        subtitle: periode,
        company: PERUSAHAAN,
        rows: ringkasan,
        columns: [
          { header: 'Keterangan', key: 'label', width: 34 },
          { header: 'Nilai', key: 'nilai', width: 22, numFmt: '#,##0' },
          { header: 'Catatan', key: 'ket', width: 30 },
        ],
      },
      {
        fileName: namaBerkas(d),
        sheetName: 'Komposisi Biaya',
        title: 'KOMPOSISI BIAYA PER KATEGORI',
        subtitle: periode,
        company: PERUSAHAAN,
        rows: komposisi,
        columns: [
          { header: 'Kategori', key: 'kategori', width: 30 },
          { header: 'Pemasok', key: 'pemasok', width: 34 },
          { header: 'Nilai', key: 'nilai', width: 20, numFmt: '#,##0' },
          { header: 'Porsi', key: 'porsi', width: 12 },
        ],
      },
      {
        fileName: namaBerkas(d),
        sheetName: 'Arus per Minggu',
        title: 'ARUS BIAYA DAN TAGIHAN PER MINGGU',
        subtitle: periode,
        company: PERUSAHAAN,
        rows: arus,
        columns: [
          { header: 'Minggu', key: 'minggu', width: 26 },
          { header: 'Biaya', key: 'biaya', width: 20, numFmt: '#,##0' },
          { header: 'Tagihan', key: 'tagihan', width: 20, numFmt: '#,##0' },
          { header: 'Biaya kumulatif', key: 'kumulatif', width: 22, numFmt: '#,##0' },
          { header: 'Sisa kontrak', key: 'sisa', width: 22, numFmt: '#,##0' },
        ],
      },
    ],
    namaBerkas(d),
  );
}

/* ------------------------------------------------------------------ */
/* PDF                                                                 */
/* ------------------------------------------------------------------ */

function barisTabel(judul: string[], baris: any[][]) {
  return {
    table: {
      headerRows: 1,
      widths: judul.map((_, i) => (i === 0 ? '*' : 'auto')),
      body: [
        judul.map((h) => ({ text: h, style: 'th' })),
        ...baris,
      ],
    },
    layout: {
      hLineWidth: (i: number, node: any) =>
        i === 0 || i === 1 || i === node.table.body.length ? 0.8 : 0.3,
      vLineWidth: () => 0,
      hLineColor: () => '#D7DDF0',
      paddingTop: () => 4,
      paddingBottom: () => 4,
    },
    margin: [0, 0, 0, 14] as Margins,
  };
}

export function unduhLaporanProyekPdf(d: DataLaporanProyek): void {
  const kanan = { alignment: 'right' as Alignment };
  const biayaPeriode = d.biayaPeriode ?? d.biayaSeumurProyek;

  const barisRingkasan: any[][] = [
    ['Nilai kontrak (DPP)', { text: rupiah(d.nilaiKontrak), ...kanan }, { text: '100,0%', ...kanan }],
    ['Nilai kontrak (termasuk PPN)', { text: rupiah(d.nominalKontrak), ...kanan }, { text: '—', ...kanan }],
    ['Total biaya (seumur proyek)', { text: rupiah(d.biayaSeumurProyek), ...kanan }, { text: persen(d.biayaSeumurProyek, d.nilaiKontrak), ...kanan }],
    [
      { text: 'Margin atas kontrak (seumur proyek)', bold: true },
      { text: rupiah(d.margin), bold: true, ...kanan },
      { text: persen(d.margin, d.nilaiKontrak), bold: true, ...kanan },
    ],
    ['Sudah tertagih', { text: rupiah(d.tertagih), ...kanan }, { text: persen(d.tertagih, d.nilaiKontrak), ...kanan }],
  ];

  /*
   * Biaya periode disebut TERPISAH, tepat di bawah biaya seumur proyek.
   *
   * Rincian kategori di halaman berikutnya hanya memuat periode itu.
   * Tanpa barisnya, jumlah rincian tidak akan cocok dengan satu pun angka
   * pada ringkasan ini — dan yang mencocokkan akan menyangka berkasnya
   * salah hitung, bukan tersaring.
   */
  if (biayaPeriode !== d.biayaSeumurProyek) {
    barisRingkasan.push([
      { text: `Biaya periode ${d.periode}`, color: '#154DEC' },
      { text: rupiah(biayaPeriode), color: '#154DEC', ...kanan },
      { text: persen(biayaPeriode, d.nilaiKontrak), color: '#154DEC', ...kanan },
    ]);
  }

  const ringkasan = barisTabel(
    ['Keterangan', 'Nilai', 'Porsi'],
    barisRingkasan,
  );

  const barisKategori: any[][] = [];
  d.kategori.forEach((k) => {
    barisKategori.push([
      { text: k.nama, bold: true },
      { text: rupiah(k.nilai), bold: true, ...kanan },
      { text: persen(k.nilai, biayaPeriode), bold: true, ...kanan },
    ]);
    k.pemasok.forEach((p) =>
      barisKategori.push([
        { text: `    ${p.nama}`, color: '#5A6172' },
        { text: rupiah(p.nilai), color: '#5A6172', ...kanan },
        { text: '', ...kanan },
      ]),
    );
  });

  const arus = barisTabel(
    ['Minggu', 'Biaya', 'Tagihan', 'Kumulatif'],
    d.mingguan.map((m) => [
      m.label,
      { text: rupiah(m.biaya), ...kanan },
      { text: rupiah(m.tagihan), ...kanan },
      { text: rupiah(m.biayaKumulatif), ...kanan },
    ]),
  );

  const dd: any = {
    pageSize: 'A4',
    pageMargins: [40, 46, 40, 44] as Margins,
    content: [
      { text: PERUSAHAAN, style: 'company' },
      { text: 'LAPORAN PROYEK', style: 'docTitle' },
      {
        text: `${d.kodeProyek} — ${d.namaProyek}`,
        alignment: 'center' as Alignment,
        margin: [0, 0, 0, 2] as Margins,
      },
      ...(d.namaKlien
        ? [{ text: d.namaKlien, alignment: 'center' as Alignment, color: '#5A6172' }]
        : []),
      ...(d.periode
        ? [{ text: d.periode, alignment: 'center' as Alignment, color: '#5A6172' }]
        : []),
      { text: '', margin: [0, 0, 0, 14] as Margins },

      { text: 'Ringkasan', style: 'sec' },
      ringkasan,

      { text: 'Komposisi biaya per kategori', style: 'sec' },
      barisTabel(['Kategori / Pemasok', 'Nilai', 'Porsi'], barisKategori),

      { text: 'Arus per minggu', style: 'sec' },
      arus,

      /*
       * Catatan DPP ikut tercetak.
       *
       * Margin di sini dihitung dari DPP, bukan nominal kotor. Tanpa
       * keterangan itu, pembaca yang mencocokkan dengan nilai kontrak di
       * SPK akan menemukan selisih sekitar sebelas persen dan mengira
       * laporannya keliru.
       */
      {
        text:
          'Margin dihitung dari nilai kontrak DPP (di luar PPN) dikurangi ' +
          'biaya DPP. PPN keluaran titipan negara, PPN masukan dapat ' +
          'dikreditkan — keduanya bukan pendapatan dan bukan biaya proyek. ' +
          'Daftar margin proyek memakai dasar biaya yang sama, tetapi ' +
          'membandingkannya dengan yang SUDAH DITAGIHKAN, bukan nilai kontrak.',
        style: 'nota',
      },
    ],
    styles: {
      company: {
        fontSize: 10,
        bold: true,
        alignment: 'center' as Alignment,
        color: '#5A6172',
        margin: [0, 0, 0, 4] as Margins,
      },
      docTitle: {
        fontSize: 16,
        bold: true,
        alignment: 'center' as Alignment,
        margin: [0, 0, 0, 4] as Margins,
      },
      sec: {
        fontSize: 11,
        bold: true,
        margin: [0, 6, 0, 6] as Margins,
      },
      th: { bold: true, fontSize: 9.5 },
      nota: {
        fontSize: 8.5,
        italics: true,
        color: '#5A6172',
        margin: [0, 10, 0, 0] as Margins,
      },
    },
    defaultStyle: { font: 'Calibri', fontSize: 10, lineHeight: 1.15 },
    footer: (halaman: number, total: number) => ({
      text: `${halaman} / ${total}`,
      alignment: 'center' as Alignment,
      fontSize: 8,
      color: '#8A8F98',
      margin: [0, 12, 0, 0] as Margins,
    }),
  };

  const baseVfs = (pdfFonts as any).vfs ?? (pdfFonts as any);
  const { fonts, vfs } = documentFonts(baseVfs);
  pdfMake
    .createPdf(dd, undefined, fonts as any, vfs as any)
    .download(`${namaBerkas(d)}.pdf`);
}
