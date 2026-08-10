import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/**
 * Pembuat berkas Excel untuk rekap pajak.
 *
 * SheetJS versi community tidak bisa mengatur gaya sel (tebal, warna, garis),
 * sehingga berkas yang dihasilkan tampak seadanya. Berkas ini memakai ExcelJS
 * yang mendukung gaya penuh, dan dibuat generik agar rekap PPN maupun PPh
 * memakai tampilan yang sama.
 */

export interface RecapColumn {
  /** Judul kolom. */
  header: string;
  /** Nama field pada objek baris. */
  key: string;
  /** Lebar kolom (satuan karakter Excel). */
  width: number;
  /** Rata teks isi kolom. */
  align?: 'left' | 'center' | 'right';
  /** Format angka Excel, mis. '#,##0'. Kolom ber-format ikut dijumlahkan. */
  numFmt?: string;
  /** Ikut baris total di bawah tabel. */
  total?: boolean;
}

export interface RecapOptions {
  fileName: string;
  sheetName: string;
  /** Judul besar di baris pertama, mis. 'REKAP PPN MASUKAN'. */
  title: string;
  /** Keterangan periode, mis. 'Periode: Agustus 2026'. */
  subtitle?: string;
  columns: RecapColumn[];
  rows: Record<string, any>[];
  /** Nama perusahaan pada kop tabel. */
  company?: string;
}

const BRAND = 'FF154DEC';
const HEADER_TEXT = 'FFFFFFFF';
const ZEBRA = 'FFF6F8FF';
const LINE = 'FFD7DDF0';

function thinBorder(): Partial<ExcelJS.Borders> {
  const side: ExcelJS.Border = { style: 'thin', color: { argb: LINE } };
  return { top: side, left: side, bottom: side, right: side };
}

/** Tulis satu lembar bergaya ke dalam workbook yang sudah ada. */
export function addRecapSheet(
  workbook: ExcelJS.Workbook,
  options: RecapOptions,
): void {
  const sheet = workbook.addWorksheet(options.sheetName, {
    views: [{ state: 'frozen', ySplit: 4 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  });

  const lastCol = options.columns.length;

  // --- kop laporan -------------------------------------------------------
  sheet.mergeCells(1, 1, 1, lastCol);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = options.title;
  titleCell.font = { name: 'Calibri', size: 14, bold: true };
  titleCell.alignment = { vertical: 'middle' };
  sheet.getRow(1).height = 22;

  sheet.mergeCells(2, 1, 2, lastCol);
  const subCell = sheet.getCell(2, 1);
  subCell.value = [options.company, options.subtitle]
    .filter(Boolean)
    .join('  •  ');
  subCell.font = { name: 'Calibri', size: 10, color: { argb: 'FF6B7280' } };

  // baris 3 sengaja dikosongkan sebagai pemisah

  // --- header tabel ------------------------------------------------------
  const headerRow = sheet.getRow(4);
  options.columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.header;
    cell.font = { name: 'Calibri', bold: true, color: { argb: HEADER_TEXT } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } };
    cell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    };
    cell.border = thinBorder();
  });
  headerRow.height = 24;

  // --- isi ---------------------------------------------------------------
  options.rows.forEach((row, r) => {
    const excelRow = sheet.getRow(5 + r);
    options.columns.forEach((col, i) => {
      const cell = excelRow.getCell(i + 1);
      cell.value = row[col.key] ?? null;
      cell.font = { name: 'Calibri', size: 11 };
      cell.alignment = {
        horizontal: col.align || 'left',
        vertical: 'middle',
      };
      cell.border = thinBorder();
      if (col.numFmt) cell.numFmt = col.numFmt;
      // selang-seling warna agar baris panjang tetap mudah diikuti
      if (r % 2 === 1) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: ZEBRA },
        };
      }
    });
    excelRow.height = 18;
  });

  // --- baris total -------------------------------------------------------
  const firstDataRow = 5;
  const lastDataRow = 4 + options.rows.length;
  const totalRowIndex = lastDataRow + 1;
  const totalRow = sheet.getRow(totalRowIndex);

  options.columns.forEach((col, i) => {
    const cell = totalRow.getCell(i + 1);
    if (i === 0) {
      cell.value = 'TOTAL';
    } else if (col.total && options.rows.length > 0) {
      const letter = sheet.getColumn(i + 1).letter;
      // memakai rumus SUM agar tetap benar bila baris disunting di Excel
      cell.value = {
        formula: `SUM(${letter}${firstDataRow}:${letter}${lastDataRow})`,
      };
    }
    cell.font = { name: 'Calibri', bold: true };
    cell.alignment = { horizontal: col.align || 'left', vertical: 'middle' };
    cell.border = {
      ...thinBorder(),
      top: { style: 'double', color: { argb: LINE } },
    };
    if (col.numFmt) cell.numFmt = col.numFmt;
  });
  totalRow.height = 20;

  // --- lebar kolom, filter, cetak ---------------------------------------
  options.columns.forEach((col, i) => {
    sheet.getColumn(i + 1).width = col.width;
  });
  sheet.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: lastDataRow > 4 ? lastDataRow : 5, column: lastCol },
  };
  sheet.pageSetup.printTitlesRow = '4:4';
}

/** Unduh berkas berisi satu atau beberapa lembar sekaligus. */
export async function downloadRecapExcel(
  sheets: RecapOptions | (RecapOptions | DetailSheetOptions)[],
  fileName?: string,
): Promise<void> {
  const list: any[] = Array.isArray(sheets) ? sheets : [sheets];
  const workbook = new ExcelJS.Workbook();
  workbook.creator = list[0]?.company || 'PT. Alpha Konstruksi Nusantara';
  workbook.created = new Date();

  list.forEach((opt) => {
    // lembar tabel punya `columns`; lembar rincian tidak
    if (opt.columns) addRecapSheet(workbook, opt);
    else addDetailSheet(workbook, opt);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `${fileName || list[0]?.fileName || 'Rekap'}.xlsx`,
  );
}

/** Satu baris pada lembar rincian: judul bagian, item, atau subtotal. */
export interface DetailRow {
  kind: 'section' | 'item' | 'total' | 'field' | 'note';
  label: string;
  /** field: nilainya; item/total: kuantitas, satuan, harga, jumlah. */
  value?: any;
  quantity?: any;
  unit?: string;
  rate?: number;
  amount?: number;
}

export interface DetailSheetOptions {
  sheetName: string;
  title: string;
  subtitle?: string;
  rows: DetailRow[];
}

/**
 * Lembar rincian (mis. slip gaji per karyawan): bukan tabel seragam,
 * melainkan campuran data identitas, judul bagian, dan baris item.
 */
export function addDetailSheet(
  workbook: ExcelJS.Workbook,
  options: DetailSheetOptions,
): void {
  const sheet = workbook.addWorksheet(options.sheetName, {
    pageSetup: { orientation: 'portrait', fitToPage: true, fitToWidth: 1 },
  });
  const LAST = 5;

  sheet.mergeCells(1, 1, 1, LAST);
  const t = sheet.getCell(1, 1);
  t.value = options.title;
  t.font = { name: 'Calibri', size: 13, bold: true };
  sheet.getRow(1).height = 20;

  if (options.subtitle) {
    sheet.mergeCells(2, 1, 2, LAST);
    const st = sheet.getCell(2, 1);
    st.value = options.subtitle;
    st.font = { name: 'Calibri', size: 10, color: { argb: 'FF6B7280' } };
  }

  let r = 4;
  options.rows.forEach((row) => {
    const line = sheet.getRow(r);
    if (row.kind === 'section') {
      sheet.mergeCells(r, 1, r, LAST);
      const c = line.getCell(1);
      c.value = row.label;
      c.font = { name: 'Calibri', bold: true, color: { argb: HEADER_TEXT } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } };
      c.alignment = { vertical: 'middle' };
      line.height = 20;
    } else if (row.kind === 'field') {
      line.getCell(1).value = row.label;
      line.getCell(1).font = { name: 'Calibri', bold: true };
      sheet.mergeCells(r, 2, r, LAST);
      line.getCell(2).value = row.value ?? '';
    } else if (row.kind === 'note') {
      sheet.mergeCells(r, 1, r, LAST);
      const c = line.getCell(1);
      c.value = row.label;
      c.font = { name: 'Calibri', italic: true, color: { argb: 'FF6B7280' } };
      c.alignment = { horizontal: 'center' };
      c.border = thinBorder();
    } else {
      const cells: any[] = [
        row.label,
        row.quantity ?? '',
        row.unit ?? '',
        row.rate ?? null,
        row.amount ?? null,
      ];
      cells.forEach((v, i) => {
        const c = line.getCell(i + 1);
        c.value = v;
        c.border = thinBorder();
        c.font = { name: 'Calibri', bold: row.kind === 'total' };
        if (i >= 3) {
          c.numFmt = '#,##0';
          c.alignment = { horizontal: 'right' };
        } else if (i > 0) {
          c.alignment = { horizontal: 'center' };
        }
      });
      if (row.kind === 'total') {
        // baris jumlah: sel label dilebarkan supaya angkanya menonjol
        sheet.mergeCells(r, 1, r, 4);
      }
    }
    r += 1;
  });

  [34, 10, 10, 16, 18].forEach((w, i) => {
    sheet.getColumn(i + 1).width = w;
  });
}

/**
 * Bentuk lembar tabel dari array objek (hasil pemetaan yang sudah ada).
 *
 * Kolomnya diturunkan dari kunci objek, sehingga pemetaan data yang sudah
 * berjalan tidak perlu ditulis ulang — cukup dibungkus. Kolom yang seluruh
 * isinya angka otomatis diberi format ribuan, rata kanan, dan ikut ditotal.
 */
export function sheetFromObjects(
  sheetName: string,
  title: string,
  rows: Record<string, any>[],
  subtitle?: string,
  headers?: string[],
  /** Format khusus per kolom, mis. { 'Tarif PPh': '0.00%' }. */
  formats?: Record<string, string>,
): RecapOptions {
  const keys =
    headers && headers.length
      ? headers
      : Array.from(
          rows.reduce((set: Set<string>, r) => {
            Object.keys(r || {}).forEach((k) => set.add(k));
            return set;
          }, new Set<string>()),
        );

  const columns: RecapColumn[] = keys.map((key) => {
    const values = rows
      .map((r) => r?.[key])
      .filter((v) => v !== null && v !== undefined && v !== '');
    const numeric =
      values.length > 0 && values.every((v) => typeof v === 'number');
    // Kolom tanggal perlu format sendiri; tanpa ini Excel menampilkan
    // angka serial, bukan tanggal.
    const isDate = values.length > 0 && values.every((v) => v instanceof Date);
    const longest = Math.max(
      key.length,
      ...values.map((v) => String(v).length),
      8,
    );
    const override = formats?.[key];
    return {
      header: key,
      key,
      width: Math.min(Math.max(longest + 2, 12), 40),
      ...(numeric
        ? { align: 'right' as const, numFmt: '#,##0', total: true }
        : {}),
      ...(isDate ? { align: 'center' as const, numFmt: 'dd mmm yyyy' } : {}),
      // format eksplisit menang atas hasil deteksi otomatis; persentase
      // tidak boleh ikut dijumlahkan pada baris total
      ...(override
        ? {
            numFmt: override,
            align: 'right' as const,
            total: !override.includes('%'),
          }
        : {}),
    };
  });

  return { fileName: sheetName, sheetName, title, subtitle, rows, columns };
}
