import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { PDFDocument } from 'pdf-lib';

import { documentFonts } from '../constants/document-font.constant';
import type { HarianRekap, SelKalender } from './kalender-rekap-excel';

/**
 * Kalender kas sebagai PDF — untuk dibaca dan diedarkan, bukan diolah.
 *
 * Berkas Excel-nya tetap ada dan tetap yang dipakai untuk menyaring,
 * menjumlah, dan menyunting. Yang ini dibuat karena bentuk yang paling
 * sering DIKIRIM — ringkasan harian beserta kisi kalender tiap rekening —
 * berakhir dicetak atau dibuka di ponsel, dan berkas Excel berlembar-lembar
 * tidak bertahan pada keduanya.
 *
 * UKURAN KERTASNYA DUA MACAM, dan itu bukan hiasan:
 *
 * - Ringkasan harian pada A4. Tujuh kolom masih terbaca, dan A4 adalah
 *   kertas yang benar-benar ada di printer mana pun.
 * - Kisi kalender pada A3. Tujuh kolom hari yang masing-masing memuat daftar
 *   lawan transaksi beserta nominalnya tidak muat pada A4 tanpa mengecilkan
 *   hurufnya sampai tidak terbaca — dan kalender yang tidak terbaca tidak
 *   ada gunanya dicetak.
 *
 * pdfmake tidak dapat mencampur ukuran kertas DALAM satu dokumen: `pageSize`
 * berlaku untuk seluruh berkas. Karena itu keduanya disusun sebagai dua
 * dokumen terpisah, lalu digabung dengan pdf-lib menjadi satu berkas —
 * penerimanya tetap menerima satu lampiran, bukan dua.
 */

const BIRU = '#1f3864';
const BIRU_MUDA = '#d9e2f3';
const ABU = '#7f7f7f';
const MERAH = '#c00000';
/** Sama dengan `JINGGA_MUDA` di berkas Excel-nya (FFFCE4D6). */
const JINGGA_MUDA = '#fce4d6';
const GARIS = '#bfbfbf';

function rp(n: number): string {
  if (!n) return '';
  return n.toLocaleString('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Nominal bertanda: merah bila keluar, seperti pada kisi Excel-nya. */
function warnaNilai(n: number): string {
  return n < 0 ? MERAH : '#000000';
}

function tanggalPendek(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso || '';
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Kop yang sama untuk kedua dokumen, supaya keduanya terbaca satu berkas. */
function kop(judul: string, sub: string, disusun: string) {
  return (margin: number) => ({
    margin: [margin, 22, margin, 0],
    columns: [
      {
        stack: [
          { text: judul, fontSize: 12, bold: true, color: BIRU },
          { text: sub, fontSize: 7.5, color: ABU },
        ],
      },
      {
        stack: [
          {
            text: 'PT Alpha Konstruksi Nusantara',
            fontSize: 7.5,
            bold: true,
            color: BIRU,
          },
          { text: `Disusun ${disusun}`, fontSize: 7.5, color: ABU },
        ],
        alignment: 'right',
      },
    ],
  });
}

function kaki(margin: number) {
  return (halaman: number, jumlah: number) => ({
    margin: [margin, 8, margin, 0],
    columns: [
      {
        // Barisnya BERWARNA di halamannya; keterangan ini yang menyebut
        // artinya. Tanpa itu, yang menerima cetakannya hanya melihat
        // beberapa baris jingga tanpa tahu mengapa.
        text: 'Baris berlatar jingga adalah RENCANA — belum terjadi.',
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
  });
}

/**
 * Ringkasan harian — bentuk yang selama ini disusun tangan.
 *
 * Kolom, urutan, dan baris totalnya sengaja sama persis dengan lembar
 * Excel-nya: keduanya menjawab pertanyaan yang sama, dan dua bentuk berbeda
 * untuk satu angka membuat yang membandingkannya ragu mana yang benar.
 */
function isiHarian(harian: HarianRekap[], saldoAwal: number) {
  const lebar = ['auto', '*', 'auto', '*', 'auto', 'auto', 'auto'];
  const kepala = [
    'Tanggal',
    'Keterangan pemasukan',
    'Pemasukan (Rp)',
    'Keterangan pengeluaran',
    'Pengeluaran (Rp)',
    'Selisih (Rp)',
    'Saldo Gabungan (Rp)',
  ].map((t, i) => ({
    text: t,
    bold: true,
    fontSize: 7.5,
    color: BIRU,
    fillColor: BIRU_MUDA,
    alignment: i === 0 ? 'center' : i % 2 === 0 ? 'right' : 'left',
  }));

  const body: any[] = [kepala];

  body.push([
    { text: 'Saldo awal', bold: true, fillColor: BIRU_MUDA },
    { text: '', fillColor: BIRU_MUDA },
    { text: '', fillColor: BIRU_MUDA },
    { text: '', fillColor: BIRU_MUDA },
    { text: '', fillColor: BIRU_MUDA },
    { text: '', fillColor: BIRU_MUDA },
    {
      text: rp(saldoAwal),
      bold: true,
      alignment: 'right',
      fillColor: BIRU_MUDA,
    },
  ]);

  let totalMasuk = 0;
  let totalKeluar = 0;

  for (const h of harian) {
    // Rencana TIDAK ikut baris TOTAL — alasannya pada `HarianRekap`: yang di
    // bawah adalah uang yang benar-benar bergerak bulan itu.
    if (!h.rencana) {
      totalMasuk += h.masuk;
      totalKeluar += h.keluar;
    }
    const latar = h.rencana ? JINGGA_MUDA : undefined;
    body.push([
      { text: tanggalPendek(h.tanggal), alignment: 'center', fillColor: latar },
      { text: h.ketMasuk || '', fillColor: latar },
      { text: rp(h.masuk), alignment: 'right', fillColor: latar },
      { text: h.ketKeluar || '', fillColor: latar },
      { text: rp(h.keluar), alignment: 'right', fillColor: latar },
      {
        text: rp(h.selisih),
        alignment: 'right',
        color: warnaNilai(h.selisih),
        fillColor: latar,
      },
      {
        text: rp(h.saldoGabungan),
        alignment: 'right',
        color: warnaNilai(h.saldoGabungan),
        fillColor: latar,
      },
    ]);
  }

  const saldoAkhir = harian.length
    ? harian[harian.length - 1].saldoGabungan
    : saldoAwal;

  body.push([
    // TERLAKSANA, bukan sekadar TOTAL: barisnya tidak mencakup rencana.
    { text: 'TOTAL TERLAKSANA', bold: true, fillColor: BIRU_MUDA },
    { text: '', fillColor: BIRU_MUDA },
    {
      text: rp(totalMasuk),
      bold: true,
      alignment: 'right',
      fillColor: BIRU_MUDA,
    },
    { text: '', fillColor: BIRU_MUDA },
    {
      text: rp(totalKeluar),
      bold: true,
      alignment: 'right',
      fillColor: BIRU_MUDA,
    },
    {
      text: rp(totalMasuk - totalKeluar),
      bold: true,
      alignment: 'right',
      fillColor: BIRU_MUDA,
    },
    // Saldo akhirnya justru IKUT rencana — ia menjawab "nanti jadi berapa".
    {
      text: rp(saldoAkhir),
      bold: true,
      alignment: 'right',
      fillColor: BIRU_MUDA,
    },
  ]);

  return {
    table: { headerRows: 1, widths: lebar, body },
    layout: {
      hLineWidth: () => 0.4,
      vLineWidth: () => 0.4,
      hLineColor: () => GARIS,
      vLineColor: () => GARIS,
      paddingTop: () => 2.5,
      paddingBottom: () => 2.5,
      paddingLeft: () => 4,
      paddingRight: () => 4,
    },
  };
}

const HARI_NAMA = [
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
  'Minggu',
];

/**
 * Satu sel hari: tanggal dan saldo akhirnya di atas, transaksinya di bawah.
 *
 * Disusun sebagai tabel dua kolom di DALAM sel, bukan sebagai teks bertumpuk:
 * nominalnya harus rata kanan dan sejajar antar baris, dan tumpukan teks
 * biasa tidak memberikan itu.
 */
function selHari(
  hari: number | null,
  bulan: string,
  isi: SelKalender | undefined,
) {
  if (hari === null) {
    return { text: '', fillColor: '#fafafa' };
  }

  const baris: any[] = [
    [
      {
        text: `${hari} ${bulan}`,
        bold: true,
        fontSize: 7.5,
        fillColor: '#e8eefb',
      },
      {
        text: rp(isi?.saldoAkhir ?? 0),
        bold: true,
        fontSize: 6.5,
        color: ABU,
        alignment: 'right',
        fillColor: '#e8eefb',
      },
    ],
  ];

  for (const t of isi?.transaksi ?? []) {
    const latar = t.rencana ? JINGGA_MUDA : undefined;
    baris.push([
      { text: t.lawan || '-', fontSize: 6.5, fillColor: latar },
      {
        text: rp(t.nilai),
        fontSize: 6.5,
        alignment: 'right',
        color: warnaNilai(t.nilai),
        fillColor: latar,
      },
    ]);
  }

  // Hari tanpa transaksi tetap diberi satu baris kosong, supaya tinggi
  // selnya tidak mengerut dan barisan pekannya tetap sejajar.
  if (baris.length === 1) {
    baris.push([{ text: '', fontSize: 6.5 }, { text: '', fontSize: 6.5 }]);
  }

  return {
    table: { widths: ['*', 'auto'], body: baris },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      paddingTop: () => 1,
      paddingBottom: () => 1,
      paddingLeft: () => 2,
      paddingRight: () => 2,
    },
  };
}

/**
 * Kisi kalender satu rekening.
 *
 * Susunannya mengikuti kisi di layar dan di Excel: tujuh kolom hari, pekan
 * demi pekan ke bawah. Kolom tiap tanggal ditentukan dari hari pertamanya —
 * bukan dihitung mundur dari panjang pekannya, yang benar hanya pada pekan
 * pertama dan menggeser tanggal pada pekan terakhir yang tidak penuh.
 */
function kisiRekening(
  nomor: string,
  atasNama: string,
  sel: SelKalender[],
  bulan: string,
  hariPertama: number,
  totalHari: number,
  pertama: boolean,
) {
  const perHari: Record<number, SelKalender> = Object.create(null);
  for (const s of sel) perHari[s.hari] = s;

  const body: any[] = [
    HARI_NAMA.map((n) => ({
      text: n,
      bold: true,
      fontSize: 8,
      color: BIRU,
      fillColor: BIRU_MUDA,
      alignment: 'center',
    })),
  ];

  let hari = 1;
  let kolomAwal = hariPertama;
  while (hari <= totalHari) {
    const pekan: Array<number | null> = new Array(7).fill(null);
    for (let k = kolomAwal; k < 7 && hari <= totalHari; k++) {
      pekan[k] = hari++;
    }
    kolomAwal = 0;
    body.push(pekan.map((d) => selHari(d, bulan, d ? perHari[d] : undefined)));
  }

  return [
    {
      text: `KALENDER PEMBAYARAN — ${nomor}`,
      fontSize: 10,
      bold: true,
      color: BIRU,
      margin: [0, 0, 0, 1],
      // Tiap rekening mulai di halaman sendiri; dua kisi yang bersambung di
      // tengah halaman terbaca sebagai satu kalender yang bulannya berubah.
      pageBreak: pertama ? undefined : 'before',
    },
    {
      text: atasNama,
      fontSize: 7.5,
      color: ABU,
      margin: [0, 0, 0, 6],
    },
    {
      table: {
        headerRows: 1,
        widths: new Array(7).fill('*'),
        body,
        dontBreakRows: true,
      },
      layout: {
        hLineWidth: () => 0.8,
        vLineWidth: () => 0.8,
        hLineColor: () => BIRU,
        vLineColor: () => BIRU,
        paddingTop: () => 0,
        paddingBottom: () => 0,
        paddingLeft: () => 0,
        paddingRight: () => 0,
      },
    },
  ];
}

/** Rekening beserta kisinya, satu lampiran per rekening. */
export interface LampiranRekening {
  nomor: string;
  atasNama: string;
  sel: SelKalender[];
  /** Dipakai lembar Excel-nya; PDF membaca saldo dari tiap selnya. */
  saldoAwal: number;
}

function buatPdf(dd: any): Promise<Uint8Array> {
  const baseVfs = (pdfFonts as any).vfs ?? (pdfFonts as any);
  const { fonts, vfs } = documentFonts(baseVfs);
  return new Promise((resolve) => {
    pdfMake
      .createPdf(dd, undefined, fonts as any, vfs as any)
      .getBuffer((buf: any) => resolve(new Uint8Array(buf)));
  });
}

/**
 * Kalender kas satu bulan sebagai satu berkas PDF.
 *
 * Mengembalikan `Blob`, bukan langsung mengunduh: yang memanggilnya sudah
 * punya cara sendiri menamai dan menyimpan berkas (`saveAs`), dan dua jalur
 * unduh yang berbeda untuk dua format membuat namanya cepat berselisih.
 */
export async function berkasKalenderPdf(
  harian: HarianRekap[],
  saldoAwal: number,
  lampiran: LampiranRekening[],
  bulan: string,
  tahun: number,
  hariPertama: number,
  totalHari: number,
): Promise<Blob> {
  const disusun = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const sub = `${bulan} ${tahun}`;

  const ddHarian: any = {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [24, 58, 24, 34],
    defaultStyle: { font: 'Calibri', fontSize: 7.5 },
    header: kop('RINGKASAN HARIAN', sub, disusun)(24),
    footer: kaki(24),
    content: [isiHarian(harian, saldoAwal)],
  };

  const dokumen: Uint8Array[] = [await buatPdf(ddHarian)];

  if (lampiran.length) {
    const ddKisi: any = {
      // A3: tujuh kolom hari yang memuat daftar nama beserta nominalnya
      // tidak muat pada A4 tanpa mengecilkan hurufnya sampai tidak terbaca.
      pageSize: 'A3',
      pageOrientation: 'landscape',
      pageMargins: [24, 58, 24, 34],
      defaultStyle: { font: 'Calibri', fontSize: 7 },
      header: kop('LAMPIRAN — KALENDER PER REKENING', sub, disusun)(24),
      footer: kaki(24),
      content: lampiran.flatMap((l, i) =>
        kisiRekening(
          l.nomor,
          l.atasNama,
          l.sel,
          bulan,
          hariPertama,
          totalHari,
          i === 0,
        ),
      ),
    };
    dokumen.push(await buatPdf(ddKisi));
  }

  // Satu berkas, dua ukuran kertas. pdf-lib menyalin halaman apa adanya,
  // termasuk ukurannya — itulah yang membuat A4 dan A3 dapat berdampingan.
  const gabungan = await PDFDocument.create();
  for (const bytes of dokumen) {
    const sumber = await PDFDocument.load(bytes);
    const halaman = await gabungan.copyPages(sumber, sumber.getPageIndices());
    for (const h of halaman) gabungan.addPage(h);
  }

  const hasil = await gabungan.save();
  return new Blob([hasil as unknown as BlobPart], {
    type: 'application/pdf',
  });
}
