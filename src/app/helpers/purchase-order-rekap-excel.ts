import ExcelJS from 'exceljs';

import { purchaseTypeLabel } from '../constants/purchase-type-label.constant';
import {
  RentangRekap,
  labelRentang,
  potonganBerkas,
} from '../constants/rentang-rekap';
import { vendorDisplayName } from './purchase-order-shared.helper';

/**
 * Rekap purchase order sebuah proyek sebagai berkas Excel.
 *
 * Tiga lembar, masing-masing menjawab pertanyaan yang berbeda:
 *
 *   Ikhtisar    — berapa nilainya, terbagi menurut jenis dan keadaan
 *                 persetujuan;
 *   Rincian     — satu baris per barang/jasa, bentuk yang sama dengan berkas
 *                 List Kontrak Kerja yang selama ini dipakai;
 *   Per Dokumen — satu baris per purchase order.
 *
 * Nama jenis dibaca lewat `purchaseTypeLabel`, bukan disusun ulang di sini:
 * rekap ini dibaca berdampingan dengan layar Purchase Order, dan dua sebutan
 * untuk jenis yang sama membuat orang menyangka keduanya hal yang berbeda.
 *
 * Yang dipakai TERJEMAHANNYA, bukan konstanta `PURCHASE_TYPE_LABELS`.
 * Konstanta itu berbahasa Inggris, dan memakainya membuat satu kolom
 * berbunyi "Project supporting equipment and supplies" di tengah dokumen
 * yang seluruhnya berbahasa Indonesia — persis keadaan yang sempat terjadi.
 */

const BIRU = 'FF1F3864';
const BIRU_MUDA = 'FFD9E2F3';
const GARIS = 'FFBFBFBF';
const MERAH = 'FFC00000';
const ABU = 'FF7F7F7F';

// SALINAN yang sudah disamakan dengan `excel-gaya.helper`.
//
// Dulu `RP` di sini membulatkan ke rupiah penuh sementara `RP2` menyimpan
// sen, sehingga dua lembar pada BERKAS YANG SAMA menuliskan angka yang sama
// dengan ketelitian berbeda.
const RP = '#,##0.00;(#,##0.00);"-"';
const RP2 = RP;

/**
 * HITUNGAN — banyak dokumen, banyak baris barang. BUKAN rupiah.
 *
 * Diberi nama sendiri supaya bedanya dari `RP` terbaca di tempat
 * pemakaiannya, dan supaya `uangcek.py` tidak menuduhnya sebagai nominal yang
 * lupa didesimalkan.
 */
const HITUNGAN = '#,##0';
const PERSEN = '0.0%;;"-"';

/** Dokumen purchase order sebagaimana dikirim `/purchase-orders/rekap`. */
export interface IRekapPO {
  id: number;
  date: string;
  name: string;
  purchaseType: string;
  projectName: string;
  dpp: number | string;
  /*
   * Nilai DI LUAR dasar pajak yang tetap dibayarkan.
   *
   * Terisi pada penutupan pertanggungan (6.4.2): premi yang dititipkan
   * kepada broker untuk diteruskan kepada penanggung. Bukan objek PPN
   * maupun PPh, tetapi tetap uang yang keluar — rekap yang melewatkannya
   * hanya melaporkan ongkos pembuatan polisnya.
   */
  otherValue?: number | string | null;
  ppn: number | string;
  pphPercentage: number | string | null;
  status: string;
  isApproved: boolean | number;
  parentPurchaseOrderID: number | null;
  supplierName: string | null;
  supplierPrefix: string | null;
}

/** Baris barang/jasa milik sebuah dokumen. */
export interface IRekapItem {
  /** Dipakai mencocokkan baris anak dengan induknya. */
  id?: number | null;
  purchaseOrderID: number;
  task: string | null;
  quantity: number | string;
  price: number | string;
  unit: string | null;
  remarks_1: string | null;
  /** Terisi pada baris mobilisasi/demobilisasi; kosong pada baris biasa. */
  itemKind?: string | null;
  /** Baris alat yang biaya ini menempel padanya. */
  parentItemID?: number | null;
  itemDescription: string | null;
  sku: string | null;
  equipmentName: string | null;
}

interface IBaris {
  uraian: string;
  volume: number;
  harga: number;
  satuan: string;
}

function angka(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function tepi(): Partial<ExcelJS.Borders> {
  const sisi: ExcelJS.Border = { style: 'thin', color: { argb: GARIS } };
  return { top: sisi, left: sisi, bottom: sisi, right: sisi };
}

/**
 * Nama barang bisa datang dari katalog barang, alat sewa, atau diketik.
 *
 * Urutannya sama dengan dialog lihat purchase order, sehingga rekap dan layar
 * menyebut barang yang sama dengan nama yang sama.
 */
function namaBarang(it: IRekapItem): string {
  return (
    it.itemDescription || it.equipmentName || it.task || it.sku || '—'
  );
}

/**
 * Baris sebuah dokumen, TERMASUK mobilisasi dan demobilisasi.
 *
 * Keduanya kini BARIS SUNGGUHAN, bukan lagi dua angka yang menumpang pada
 * `remarks_4`/`remarks_5` baris alatnya — sehingga tidak perlu lagi
 * dimunculkan sendiri di sini; ia datang bersama baris lainnya, sudah
 * berurutan di bawah induknya.
 *
 * Yang masih perlu dikerjakan hanyalah menyebut ALAT mana yang dimobilisasi.
 * Tanpa itu, rekap proyek berisi deretan baris bernama "Mobilisasi" yang
 * tidak dapat dibedakan satu sama lain — dan rekap ini justru dibaca untuk
 * menelusuri ke mana biaya sebuah proyek pergi.
 */
export function barisRekapDokumen(po: IRekapPO, items: IRekapItem[]): IBaris[] {
  const namaInduk = new Map<number, string>();
  for (const it of items) {
    if (it.id != null && !it.itemKind) namaInduk.set(Number(it.id), namaBarang(it));
  }

  const hasil: IBaris[] = [];
  for (const it of items) {
    if (it.purchaseOrderID !== po.id) continue;
    const milik =
      it.itemKind && it.parentItemID != null
        ? namaInduk.get(Number(it.parentItemID))
        : null;
    hasil.push({
      uraian: milik ? `${namaBarang(it)} — ${milik}` : namaBarang(it),
      volume: angka(it.quantity),
      harga: angka(it.price),
      satuan: it.unit || '—',
    });
  }
  return hasil;
}

/**
 * Nama pemasok, sama persis dengan yang tercetak pada dokumennya.
 *
 * Memakai `vendorDisplayName` — bukan merangkai sendiri. Fungsi itu sudah
 * menangani tiga hal yang sebelumnya salah di sini:
 *
 *   - awalan GANDA, ketika nama di katalog sudah memuat "PT" atau "CV"
 *     sehingga hasilnya menjadi "PT. PT Adhimix";
 *   - titik yang ditambahkan pada awalan yang memang sudah punya titiknya;
 *   - prefiks non-entitas seperti "Pribadi", yang seharusnya tidak muncul
 *     sebagai bagian dari nama sama sekali.
 *
 * Rekap dibaca berdampingan dengan dokumen aslinya; nama yang ditulis
 * berbeda membuat keduanya tampak merujuk pemasok yang tidak sama.
 */
export function namaPemasokRekap(po: IRekapPO): string {
  /*
   * `?? undefined` — bukan melonggarkan tipe `vendorDisplayName`.
   *
   * Kolom di sini bertipe `string | null` karena memang begitu bentuknya di
   * basis data, sedangkan fungsi bersama itu memakai parameter opsional.
   * Menyesuaikan di titik pemanggilan membiarkan fungsi bersamanya tetap
   * ketat untuk seluruh pemakai lainnya.
   */
  const hasil = vendorDisplayName(
    po.supplierName ?? undefined,
    po.supplierPrefix ?? undefined,
  );
  return hasil === '-' ? '—' : hasil;
}

export function sudahDisetujuiRekap(po: IRekapPO): boolean {
  return (
    !!po.isApproved || String(po.status || '').toLowerCase() === 'approved'
  );
}

/**
 * Alih bahasa jenis dokumen, mengikuti bahasa aplikasi.
 *
 * Diterima sebagai ARGUMEN, bukan diambil sendiri: berkas ini fungsi lepas
 * tanpa suntikan Angular, dan menyalin peta terjemahannya ke sini berarti
 * dua tempat yang harus selalu sepakat.
 */
export type Penerjemah = { instant(kunci: string): string };

function labelJenis(t: Penerjemah, kode: string): string {
  return purchaseTypeLabel(t, kode) || kode || '—';
}

function kop(
  sheet: ExcelJS.Worksheet,
  kolomTerakhir: number,
  judul: string,
  sub: string,
): void {
  sheet.mergeCells(1, 1, 1, kolomTerakhir);
  const j = sheet.getCell(1, 1);
  j.value = judul;
  j.font = { name: 'Arial', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
  j.alignment = { vertical: 'middle', indent: 1 };
  j.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BIRU } };
  sheet.getRow(1).height = 30;

  sheet.mergeCells(2, 1, 2, kolomTerakhir);
  const s = sheet.getCell(2, 1);
  s.value = sub;
  s.font = { name: 'Arial', size: 9, color: { argb: 'FFFFFFFF' } };
  s.alignment = { vertical: 'middle', indent: 1 };
  s.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BIRU } };
  sheet.getRow(2).height = 18;

  for (let r = 1; r <= 2; r++) {
    for (let c = 1; c <= kolomTerakhir; c++) {
      sheet.getCell(r, c).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: BIRU },
      };
    }
  }
}

function kepala(
  sheet: ExcelJS.Worksheet,
  baris: number,
  kolom: { nama: string; lebar: number }[],
): void {
  kolom.forEach((k, i) => {
    const c = sheet.getCell(baris, i + 1);
    c.value = k.nama;
    c.font = { name: 'Arial', size: 9, bold: true, color: { argb: BIRU } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BIRU_MUDA } };
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    c.border = tepi();
    sheet.getColumn(i + 1).width = k.lebar;
  });
  sheet.getRow(baris).height = 30;
}

function totalkan(
  sheet: ExcelJS.Worksheet,
  baris: number,
  jumlahKolom: number,
  kolomAngka: number[],
  awal: number,
  akhir: number,
): void {
  for (let i = 1; i <= jumlahKolom; i++) {
    const c = sheet.getCell(baris, i);
    c.font = { name: 'Arial', size: 10, bold: true, color: { argb: BIRU } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BIRU_MUDA } };
    c.border = tepi();
    c.alignment = { horizontal: 'right', vertical: 'middle' };
  }
  const label = sheet.getCell(baris, 1);
  label.value = 'TOTAL';
  label.alignment = { horizontal: 'center', vertical: 'middle' };

  for (const i of kolomAngka) {
    const huruf = sheet.getColumn(i).letter;
    const c = sheet.getCell(baris, i);
    // Rumus, bukan hasil hitungan: menyaring baris di Excel harus tetap
    // menghasilkan total yang benar.
    c.value = { formula: `SUM(${huruf}${awal}:${huruf}${akhir})` } as any;
    c.numFmt = RP;
  }
}

function lembarRincian(
  wb: ExcelJS.Workbook,
  t: Penerjemah,
  judulSubjek: string,
  periode: string,
  daftar: IRekapPO[],
  items: IRekapItem[],
): void {
  const sheet = wb.addWorksheet('Rincian', {
    views: [{ state: 'frozen', ySplit: 4 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  });
  const kolom = [
    { nama: 'No.', lebar: 5, rata: 'center' },
    { nama: 'Tanggal', lebar: 11, rata: 'center' },
    { nama: 'Nomor', lebar: 20, rata: 'left' },
    { nama: 'Kode', lebar: 7, rata: 'center' },
    { nama: 'Jenis', lebar: 26, rata: 'left' },
    { nama: 'Vendor / Penerima', lebar: 28, rata: 'left' },
    { nama: 'Nama Barang/Jasa', lebar: 42, rata: 'left' },
    { nama: 'Volume', lebar: 10, rata: 'right' },
    { nama: 'Satuan', lebar: 10, rata: 'center' },
    { nama: 'Harga Satuan (Rp)', lebar: 15, rata: 'right' },
    { nama: 'DPP (Rp)', lebar: 15, rata: 'right' },
    { nama: 'PPN (Rp)', lebar: 13, rata: 'right' },
    // Dahulu 'PBBKB (Rp)' — pajak bahan bakar yang tidak pernah berlaku bagi
    // purchase order, dan karena itu selalu nol. Ruangnya dipakai nilai yang
    // memang ada: premi yang dititipkan pada SPK penutupan pertanggungan.
    { nama: 'Nilai Lain (Rp)', lebar: 14, rata: 'right' },
    { nama: 'PPh (Rp)', lebar: 12, rata: 'right' },
    { nama: 'Total (Rp)', lebar: 15, rata: 'right' },
    { nama: 'Status', lebar: 11, rata: 'center' },
  ];
  kop(
    sheet,
    kolom.length,
    `REKAP PURCHASE ORDER — ${judulSubjek}`,
    `Periode: ${periode} · PT Alpha Konstruksi Nusantara · disusun ` +
      new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
  );
  const AWAL = 4;
  kepala(sheet, AWAL, kolom);

  let baris = AWAL + 1;
  let urut = 0;
  for (const po of daftar) {
    const ppn = angka(po.ppn);
    const pph = angka(po.pphPercentage);
    /*
     * Nilai lain melekat pada DOKUMEN, bukan pada barisnya.
     *
     * Karena itu ia ditulis sekali saja, di baris pertama dokumennya.
     * Mengulanginya pada setiap baris membuat penjumlahan kolomnya berlipat
     * sebanyak barisnya.
     */
    let lain = angka(po.otherValue);
    for (const b of barisRekapDokumen(po, items)) {
      urut += 1;
      sheet.getCell(baris, 1).value = urut;
      sheet.getCell(baris, 2).value = po.date;
      sheet.getCell(baris, 3).value = po.name;
      sheet.getCell(baris, 4).value = po.purchaseType;
      sheet.getCell(baris, 5).value = labelJenis(t, po.purchaseType);
      sheet.getCell(baris, 6).value = namaPemasokRekap(po);
      sheet.getCell(baris, 7).value = b.uraian;
      sheet.getCell(baris, 8).value = b.volume;
      sheet.getCell(baris, 9).value = b.satuan;
      sheet.getCell(baris, 10).value = b.harga;
      sheet.getCell(baris, 11).value = {
        formula: `H${baris}*J${baris}`,
      } as any;
      // Tarif pajak melekat pada DOKUMEN, bukan barisnya; dikalikan ke DPP
      // baris agar penjumlahan kolomnya tetap sama dengan nilai dokumen.
      sheet.getCell(baris, 12).value = {
        formula: `ROUND(K${baris}*${ppn}/100,2)`,
      } as any;
      sheet.getCell(baris, 13).value = lain;
      lain = 0;
      sheet.getCell(baris, 14).value = {
        formula: `ROUND(K${baris}*${pph}/100,2)`,
      } as any;
      sheet.getCell(baris, 15).value = {
        formula: `K${baris}+L${baris}+M${baris}-N${baris}`,
      } as any;
      sheet.getCell(baris, 16).value = sudahDisetujuiRekap(po) ? 'Disetujui' : 'Draf';

      kolom.forEach((k, i) => {
        const c = sheet.getCell(baris, i + 1);
        c.font = { name: 'Arial', size: 9 };
        c.alignment = { horizontal: k.rata as any, vertical: 'middle' };
        c.border = tepi();
      });
      for (const i of [11, 12, 13, 14, 15]) {
        sheet.getCell(baris, i).numFmt = RP;
      }
      sheet.getCell(baris, 10).numFmt = RP2;
      sheet.getCell(baris, 8).numFmt = '#,##0.##';
      if (!sudahDisetujuiRekap(po)) {
        sheet.getCell(baris, 16).font = {
          name: 'Arial',
          size: 9,
          bold: true,
          color: { argb: MERAH },
        };
      }
      baris += 1;
    }
  }

  const akhir = baris - 1;
  if (akhir >= AWAL + 1) {
    totalkan(sheet, baris, kolom.length, [11, 12, 13, 14, 15], AWAL + 1, akhir);
    sheet.autoFilter = { from: { row: AWAL, column: 1 }, to: { row: akhir, column: kolom.length } };
  }

  const catatan = sheet.getCell(baris + 2, 1);
  sheet.mergeCells(baris + 2, 1, baris + 2, kolom.length);
  catatan.value =
    'Catatan: kode dan nama jenis mengikuti sebutan resmi di aplikasi. ' +
    'Mobilisasi dan demobilisasi alat dicatat sebagai baris tersendiri, sama ' +
    'seperti pada dokumen yang ditandatangani — total lembar ini karena itu ' +
    'sama persis dengan lembar Per Dokumen.';
  catatan.font = { name: 'Arial', size: 8, italic: true, color: { argb: ABU } };
  catatan.alignment = { vertical: 'middle', wrapText: true };
  sheet.getRow(baris + 2).height = 26;
}

function lembarPerDokumen(
  wb: ExcelJS.Workbook,
  t: Penerjemah,
  judulSubjek: string,
  periode: string,
  daftar: IRekapPO[],
  items: IRekapItem[],
): { awal: number; akhir: number } {
  const sheet = wb.addWorksheet('Per Dokumen', {
    views: [{ state: 'frozen', ySplit: 4 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  });
  const kolom = [
    { nama: 'No.', lebar: 5, rata: 'center' },
    { nama: 'Tanggal', lebar: 11, rata: 'center' },
    { nama: 'Nomor', lebar: 20, rata: 'left' },
    { nama: 'Kode', lebar: 7, rata: 'center' },
    { nama: 'Jenis', lebar: 26, rata: 'left' },
    { nama: 'Vendor / Penerima', lebar: 30, rata: 'left' },
    { nama: 'Baris', lebar: 7, rata: 'center' },
    { nama: 'DPP (Rp)', lebar: 16, rata: 'right' },
    { nama: 'PPN %', lebar: 8, rata: 'center' },
    { nama: 'PPN (Rp)', lebar: 14, rata: 'right' },
    { nama: 'PPh %', lebar: 8, rata: 'center' },
    { nama: 'PPh (Rp)', lebar: 13, rata: 'right' },
    // Kolomnya sendiri, bukan disembunyikan ke dalam Total: yang membaca
    // rekap ini mencocokkan Total dari angka-angka di kirinya.
    { nama: 'Nilai Lain (Rp)', lebar: 14, rata: 'right' },
    { nama: 'Total (Rp)', lebar: 16, rata: 'right' },
    { nama: 'Status', lebar: 11, rata: 'center' },
    { nama: 'Pemeriksaan', lebar: 34, rata: 'left' },
  ];
  kop(
    sheet,
    kolom.length,
    `REKAP PER DOKUMEN — ${judulSubjek}`,
    `Periode: ${periode} · Satu baris per purchase order. ` +
      'Kolom Pemeriksaan kosong bila jumlah ' +
      'barisnya sudah sama dengan nilai dokumen.',
  );
  const AWAL = 4;
  kepala(sheet, AWAL, kolom);

  let baris = AWAL + 1;
  daftar.forEach((po, i) => {
    const rows = barisRekapDokumen(po, items);
    const jumlahBaris = rows.reduce((a, b) => a + b.volume * b.harga, 0);
    const dpp = angka(po.dpp);
    const selisih = Math.round((dpp - jumlahBaris) * 100) / 100;

    sheet.getCell(baris, 1).value = i + 1;
    sheet.getCell(baris, 2).value = po.date;
    sheet.getCell(baris, 3).value = po.name;
    sheet.getCell(baris, 4).value = po.purchaseType;
    sheet.getCell(baris, 5).value = labelJenis(t, po.purchaseType);
    sheet.getCell(baris, 6).value = namaPemasokRekap(po);
    sheet.getCell(baris, 7).value = rows.length;
    sheet.getCell(baris, 8).value = dpp;
    sheet.getCell(baris, 9).value = angka(po.ppn) / 100;
    sheet.getCell(baris, 10).value = {
      formula: `ROUND(H${baris}*I${baris},2)`,
    } as any;
    sheet.getCell(baris, 11).value = angka(po.pphPercentage) / 100;
    sheet.getCell(baris, 12).value = {
      formula: `ROUND(H${baris}*K${baris},2)`,
    } as any;
    sheet.getCell(baris, 13).value = angka(po.otherValue);
    sheet.getCell(baris, 14).value = {
      formula: `H${baris}+J${baris}-L${baris}+M${baris}`,
    } as any;
    sheet.getCell(baris, 15).value = sudahDisetujuiRekap(po) ? 'Disetujui' : 'Draf';

    // Kolom ini KOSONG bila sehat.
    //
    // Terisi berarti penjumlahan barisnya tidak sama dengan nilai dokumennya
    // — ada baris yang belum terbaca rekap ini, dan angkanya tidak boleh
    // dipakai sebelum diperiksa.
    if (Math.abs(selisih) > 1) {
      sheet.getCell(baris, 16).value =
        `PERIKSA — jumlah baris berbeda Rp ${selisih.toLocaleString('id-ID')} ` +
        `dari nilai dokumen`;
    }

    kolom.forEach((k, idx) => {
      const c = sheet.getCell(baris, idx + 1);
      c.font = { name: 'Arial', size: 9 };
      c.alignment = {
        horizontal: k.rata as any,
        vertical: 'middle',
        wrapText: idx + 1 === 16,
      };
      c.border = tepi();
    });
    for (const idx of [8, 10, 12, 13, 14]) sheet.getCell(baris, idx).numFmt = RP;
    for (const idx of [9, 11]) sheet.getCell(baris, idx).numFmt = PERSEN;
    if (!sudahDisetujuiRekap(po)) {
      sheet.getCell(baris, 15).font = {
        name: 'Arial',
        size: 9,
        bold: true,
        color: { argb: MERAH },
      };
    }
    if (Math.abs(selisih) > 1) {
      sheet.getCell(baris, 16).font = {
        name: 'Arial',
        size: 8,
        italic: true,
        color: { argb: 'FFC55A11' },
      };
    }
    baris += 1;
  });

  const akhir = baris - 1;
  if (akhir >= AWAL + 1) {
    totalkan(sheet, baris, kolom.length, [8, 10, 12, 13, 14], AWAL + 1, akhir);
    sheet.autoFilter = { from: { row: AWAL, column: 1 }, to: { row: akhir, column: kolom.length } };
  }
  return { awal: AWAL + 1, akhir };
}

function lembarIkhtisar(
  wb: ExcelJS.Workbook,
  t: Penerjemah,
  judulSubjek: string,
  periode: string,
  daftar: IRekapPO[],
  /*
   * Baris barangnya ikut DIBUTUHKAN di sini.
   *
   * "Jumlah baris barang/jasa" dijumlahkan dari kolom G lembar Per Dokumen,
   * dan nilai tersimpannya harus dihitung dari sumber yang sama —
   * `barisRekapDokumen`, persis seperti di sana. Menghitungnya dari sesuatu
   * yang lain berarti angka tersimpan dan angka hasil hitung ulang Excel
   * dapat berbeda.
   */
  items: IRekapItem[],
  awal: number,
  akhir: number,
): void {
  const sheet = wb.addWorksheet('Ikhtisar', {
    pageSetup: { orientation: 'portrait', fitToPage: true },
  });
  kop(
    sheet,
    4,
    `IKHTISAR — ${judulSubjek}`,
    `Periode: ${periode} · ` +
      'Dihitung dari lembar Per Dokumen. Mengubah data di sana memperbarui ' +
      'angka di lembar ini.',
  );

  /*
   * RUMUS BESERTA HASILNYA, bukan rumus saja.
   *
   * ExcelJS menulis `{ formula }` tanpa nilai tersimpan. Excel membuka
   * berkas yang diunduh dari peramban dalam PROTECTED VIEW, dan di sana ia
   * TIDAK menghitung apa pun — sel berumus tanpa nilai tersimpan tampil
   * KOSONG. Yang menerima rekapnya melihat lembar Ikhtisar yang seluruhnya
   * kosong dan menyimpulkan datanya tidak ada.
   *
   * Tidak ada galat: berkasnya sah, rumusnya benar, dan begitu Protected
   * View dilepas angkanya muncul. Yang membacanya tidak pernah sampai ke
   * sana.
   *
   * Rumusnya TETAP ditulis, tidak diganti angka mati: lembar ini memang
   * dimaksudkan ikut berubah ketika lembar Per Dokumen disunting, dan itu
   * disebutkan pada keterangan di bawah kop-nya.
   */
  const F = (rumus: string, hasil: number) =>
    ({ formula: rumus, result: hasil } as any);

  /*
   * Angka satu dokumen, dihitung SAMA PERSIS dengan rumus di lembar Per
   * Dokumen — termasuk pembulatannya.
   *
   * `ROUND(H*I,2)` di sana harus berpadanan dengan `bulat2` di sini; kalau
   * tidak, nilai tersimpan dan nilai hasil hitung ulang Excel berbeda, dan
   * angkanya BERUBAH di depan mata orang yang menekan "Enable Editing".
   */
  const bulat2 = (n: number) => Math.round(n * 100) / 100;
  const nilaiPo = (po: IRekapPO) => {
    const dpp = angka(po.dpp);
    const ppn = bulat2(dpp * (angka(po.ppn) / 100));
    const pph = bulat2(dpp * (angka(po.pphPercentage) / 100));
    const lain = angka(po.otherValue);
    return {
      dpp,
      ppn,
      pph,
      lain,
      total: dpp + ppn - pph + lain,
      baris: barisRekapDokumen(po, items).length,
    };
  };
  const semua = daftar.map(nilaiPo);
  const jumlah = (ambil: (v: ReturnType<typeof nilaiPo>) => number) =>
    semua.reduce((a, v) => a + ambil(v), 0);
  sheet.getCell(4, 1).value = 'Nilai keseluruhan';
  sheet.getCell(4, 1).font = {
    name: 'Arial',
    size: 11,
    bold: true,
    color: { argb: BIRU },
  };

  const ringkas: [string, string, number, string][] = [
    [
      'Jumlah dokumen',
      `COUNTA('Per Dokumen'!C${awal}:C${akhir})`,
      daftar.length,
      HITUNGAN,
    ],
    [
      'Jumlah baris barang/jasa',
      `SUM('Per Dokumen'!G${awal}:G${akhir})`,
      jumlah((v) => v.baris),
      HITUNGAN,
    ],
    ['DPP', `SUM('Per Dokumen'!H${awal}:H${akhir})`, jumlah((v) => v.dpp), RP],
    ['PPN', `SUM('Per Dokumen'!J${awal}:J${akhir})`, jumlah((v) => v.ppn), RP],
    [
      'PPh dipotong',
      `SUM('Per Dokumen'!L${awal}:L${akhir})`,
      jumlah((v) => v.pph),
      RP,
    ],
    // Kolom Total bergeser ke N sejak Nilai Lain punya kolomnya sendiri di M.
    // Rujukan yang tertinggal di M tidak menimbulkan galat: ia hanya
    // menjumlah kolom yang lain, dan angkanya tetap tampak masuk akal.
    [
      'Nilai lain (premi dititipkan)',
      `SUM('Per Dokumen'!M${awal}:M${akhir})`,
      jumlah((v) => v.lain),
      RP,
    ],
    [
      'Nilai dibayarkan',
      `SUM('Per Dokumen'!N${awal}:N${akhir})`,
      jumlah((v) => v.total),
      RP,
    ],
  ];
  let r = 5;
  for (const [label, rumus, hasil, fmt] of ringkas) {
    sheet.getCell(r, 1).value = label;
    sheet.getCell(r, 1).font = { name: 'Arial', size: 10 };
    const c = sheet.getCell(r, 2);
    c.value = F(rumus, hasil);
    c.numFmt = fmt;
    c.font = {
      name: 'Arial',
      size: 10,
      bold: label === 'Nilai dibayarkan',
    };
    c.alignment = { horizontal: 'right' };
    for (const i of [1, 2]) {
      sheet.getCell(r, i).border = tepi();
      if (label === 'Nilai dibayarkan') {
        sheet.getCell(r, i).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: BIRU_MUDA },
        };
      }
    }
    r += 1;
  }

  const kelompok = (
    judul: string,
    nilai: string[],
    kolomSumber: string,
    /** Nama kelompok untuk tiap dokumen, seurutan dengan `daftar`. */
    kelompokDokumen: string[],
  ): void => {
    r += 1;
    sheet.getCell(r, 1).value = judul;
    sheet.getCell(r, 1).font = {
      name: 'Arial',
      size: 11,
      bold: true,
      color: { argb: BIRU },
    };
    r += 1;
    ['Kelompok', 'Dokumen', 'DPP (Rp)', 'Nilai dibayarkan (Rp)'].forEach(
      (nama, i) => {
        const c = sheet.getCell(r, i + 1);
        c.value = nama;
        c.font = { name: 'Arial', size: 9, bold: true, color: { argb: BIRU } };
        c.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: BIRU_MUDA },
        };
        c.alignment = { horizontal: 'center' };
        c.border = tepi();
      },
    );
    r += 1;
    for (const v of nilai) {
      const anggota = semua.filter((_, i) => kelompokDokumen[i] === v);
      sheet.getCell(r, 1).value = v;
      sheet.getCell(r, 2).value = F(
        `COUNTIF('Per Dokumen'!${kolomSumber}${awal}:${kolomSumber}${akhir},A${r})`,
        anggota.length,
      );
      sheet.getCell(r, 3).value = F(
        `SUMIF('Per Dokumen'!${kolomSumber}${awal}:${kolomSumber}${akhir},A${r},'Per Dokumen'!H${awal}:H${akhir})`,
        anggota.reduce((a, x) => a + x.dpp, 0),
      );
      /*
       * Kolom N, bukan M.
       *
       * Judul kolomnya "Nilai dibayarkan", dan itu Total — kolom N di lembar
       * Per Dokumen. M adalah "Nilai Lain (premi dititipkan)", yang pada
       * hampir semua dokumen bernilai NOL. Jadi kolom ini menampilkan nol
       * di seluruh barisnya, dan yang membacanya menyimpulkan tidak ada
       * yang dibayarkan sama sekali.
       *
       * Tidak pernah ketahuan karena sel berumus tanpa nilai tersimpan
       * tampil kosong di Protected View — kekeliruannya tertutup oleh
       * kekeliruan yang lain.
       */
      sheet.getCell(r, 4).value = F(
        `SUMIF('Per Dokumen'!${kolomSumber}${awal}:${kolomSumber}${akhir},A${r},'Per Dokumen'!N${awal}:N${akhir})`,
        anggota.reduce((a, x) => a + x.total, 0),
      );
      for (let i = 1; i <= 4; i++) {
        const c = sheet.getCell(r, i);
        c.font = {
          name: 'Arial',
          size: 9,
          bold: v === 'Draf',
          color: { argb: v === 'Draf' ? MERAH : 'FF000000' },
        };
        c.border = tepi();
        c.alignment = { horizontal: i === 1 ? 'left' : 'right' };
      }
      // Kolom 2 adalah HITUNGAN dokumen, bukan rupiah — tanpa desimal.
      sheet.getCell(r, 2).numFmt = HITUNGAN;
      for (const i of [3, 4]) sheet.getCell(r, i).numFmt = RP;
      r += 1;
    }
  };

  const jenisDipakai = Array.from(
    new Set(daftar.map((p) => labelJenis(t, p.purchaseType))),
  ).sort();
  kelompok(
    'Menurut jenis dokumen',
    jenisDipakai,
    // E = Jenis.
    'E',
    daftar.map((p) => labelJenis(t, p.purchaseType)),
  );
  kelompok(
    'Menurut keadaan persetujuan',
    ['Disetujui', 'Draf'],
    /*
     * O, bukan N.
     *
     * N adalah kolom Total — sebuah ANGKA. `COUNTIF(N…, "Disetujui")`
     * mencocokkan teks dengan kolom angka dan selalu menjawab nol, untuk
     * kedua barisnya. Kolom Status ada di O.
     *
     * Rumus yang selalu nol tidak pernah melempar galat, dan di Protected
     * View selnya kosong sama sekali — jadi tidak ada satu pun tanda bahwa
     * pembagian "Disetujui / Draf" tidak pernah menghitung apa pun.
     */
    'O',
    daftar.map((p) => (sudahDisetujuiRekap(p) ? 'Disetujui' : 'Draf')),
  );

  r += 1;
  sheet.getCell(r, 1).value =
    'Catatan: seluruh angka dihitung dari lembar Per Dokumen. Dokumen ' +
    'berstatus Draf BELUM disetujui dan belum mengikat.';
  sheet.getCell(r, 1).font = {
    name: 'Arial',
    size: 8,
    italic: true,
    color: { argb: ABU },
  };

  sheet.getColumn(1).width = 38;
  sheet.getColumn(2).width = 18;
  sheet.getColumn(3).width = 20;
  sheet.getColumn(4).width = 22;
}

/**
 * Susun dan unduh rekap purchase order sebuah proyek.
 *
 * Lembar Ikhtisar dibuat PERTAMA. Rumusnya merujuk lembar Per Dokumen, dan
 * rentang barisnya dihitung dari jumlah dokumen alih-alih menunggu lembar itu
 * selesai — sehingga tidak ada lembar yang perlu dipindah urutannya.
 */
export async function unduhRekapPurchaseOrder(
  /** Kode proyek, atau nama pemasok — yang dicetak di kepala berkas. */
  subjek: string,
  daftar: IRekapPO[],
  items: IRekapItem[],
  /*
   * WAJIB, bukan pilihan.
   *
   * Bila boleh dilewatkan, yang lupa mengirimkannya mendapat berkas
   * berbahasa Inggris tanpa satu pun galat — dan bedanya baru ketahuan
   * setelah berkasnya sampai ke penerima.
   */
  t: Penerjemah,
  rentang: RentangRekap = { dari: null, sampai: null },
  /*
   * Sudut pandang rekapnya.
   *
   * Bawaannya `'proyek'` — seluruh pemanggil lama tidak menyebutnya, dan
   * berkas yang mereka hasilkan harus persis sama seperti sebelumnya.
   *
   * Yang dibedakan hanya SEBUTANNYA. Rekap pemasok yang kepalanya berbunyi
   * "PROYEK PT Sumber Rezeki" bukan berkas yang salah hitung, melainkan
   * berkas yang salah baca — dan ia dikirim ke luar.
   */
  sudut: 'proyek' | 'pemasok' = 'proyek',
): Promise<void> {
  // `kepala` sudah dipakai sebagai nama fungsi penyusun baris judul
  // kolom di berkas ini; menamai ini sama akan menaunginya.
  const judulSubjek =
    sudut === 'pemasok' ? `PEMASOK ${subjek}` : `PROYEK ${subjek}`;
  /*
   * Periodenya dicetak pada KETIGA lembar.
   *
   * Lembarnya dipisah dan dikirim satu-satu — biasanya lembar Per Dokumen
   * saja. Menyebut periodenya hanya pada lembar pertama berarti lembar yang
   * beredar tidak menyebutkannya sama sekali, dan rekap sepotong terbaca
   * sebagai rekap seluruh proyek.
   */
  const periode = labelRentang(rentang);
  const wb = new ExcelJS.Workbook();
  wb.creator = 'TerraBot';
  wb.created = new Date();

  /*
   * Rentang baris lembar Per Dokumen dihitung LEBIH DULU, di sini.
   *
   * Rumus di lembar Ikhtisar merujuk rentang itu, sehingga sebelumnya
   * Ikhtisar harus dibuat paling akhir lalu dipindahkan ke depan. Pemindahan
   * itu bergantung pada rincian ExcelJS yang tidak dijamin ada.
   *
   * Menghitung rentangnya sendiri membuat urutan pembuatan bebas: Ikhtisar
   * dapat dibuat pertama, dan lembarnya tersusun dalam urutan yang benar
   * tanpa dipindah sama sekali.
   */
  const AWAL_DATA = 5;
  const akhirDokumen = AWAL_DATA + daftar.length - 1;

  lembarIkhtisar(
    wb,
    t,
    judulSubjek,
    periode,
    daftar,
    items,
    AWAL_DATA,
    akhirDokumen,
  );
  lembarRincian(wb, t, judulSubjek, periode, daftar, items);
  const { awal, akhir } = lembarPerDokumen(wb, t, judulSubjek, periode, daftar, items);

  // Bila keduanya berbeda, rumus Ikhtisar menunjuk rentang yang salah dan
  // angkanya diam-diam keliru — lebih baik gagal terang-terangan.
  if (awal !== AWAL_DATA || akhir !== akhirDokumen) {
    throw new Error(
      `Rentang lembar Per Dokumen tidak sesuai perkiraan: ` +
        `${awal}-${akhir}, diperkirakan ${AWAL_DATA}-${akhirDokumen}`,
    );
  }

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  /*
   * Nama berkas: spasi dan tanda baca dibuang.
   *
   * Kode proyek tidak pernah mengandung spasi, nama pemasok hampir selalu —
   * "PT. Sumber Rezeki" menjadi nama berkas dengan titik dan spasi di
   * tengahnya, yang dipotong sebagian klien surel dan berubah bentuk saat
   * diunggah ke berbagi berkas.
   */
  const potonganSubjek =
    subjek.replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '') || 'rekap';
  a.download =
    `Rekap_Purchase_Order_${potonganSubjek}_${potonganBerkas(rentang)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
