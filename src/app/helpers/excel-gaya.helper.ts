/**
 * Gaya bersama untuk berkas Excel.
 *
 * Dikumpulkan di sini setelah unduhan kalender ternyata tampil jauh lebih
 * buruk daripada rekap purchase order: yang satu memakai `xlsx` yang tidak
 * dapat memformat sel sama sekali, yang satu memakai ExcelJS dengan kop,
 * kepala berwarna, dan format rupiah.
 *
 * Dua pustaka berarti dua tampilan, dan yang membukanya menyimpulkan salah
 * satunya belum selesai dikerjakan.
 */

import ExcelJS from 'exceljs';

export const BIRU = 'FF1F3864';
export const BIRU_MUDA = 'FFD9E2F3';
export const ABU = 'FF7F7F7F';
export const GARIS = 'FFBFBFBF';

/** Rupiah; nilai negatif dalam kurung, nol sebagai tanda hubung. */
export const RP = '#,##0;(#,##0);"-"';

/** Rupiah dengan dua desimal; dipakai saldo yang menyimpan sen. */
export const RP2 = '#,##0.00;(#,##0.00);"-"';

export const TANGGAL = 'dd-mmm-yyyy';

export function tepi(): Partial<ExcelJS.Borders> {
  const sisi: ExcelJS.Border = { style: 'thin', color: { argb: GARIS } };
  return { top: sisi, left: sisi, bottom: sisi, right: sisi };
}

/**
 * Kop dua baris: judul dan keterangannya, berlatar biru.
 *
 * Dipakai pada SETIAP lembar, bukan hanya yang pertama — lembar yang dicetak
 * atau dikirim terpisah harus tetap menyebut isinya sendiri.
 */
export function kop(
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
  sheet.getRow(1).height = 30;

  sheet.mergeCells(2, 1, 2, kolomTerakhir);
  const s = sheet.getCell(2, 1);
  s.value = sub;
  s.font = { name: 'Arial', size: 9, color: { argb: 'FFFFFFFF' } };
  s.alignment = { vertical: 'middle', indent: 1 };
  sheet.getRow(2).height = 18;

  // Latar disetel pada SELURUH sel kop, bukan hanya yang bergabung.
  //
  // Sel yang digabung hanya mewarnai sel kiri-atasnya; sisanya tetap putih
  // dan kopnya tampak terpotong di tengah.
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

export interface KolomExcel {
  nama: string;
  lebar: number;
  rata?: 'left' | 'center' | 'right';
  format?: string;
}

/** Baris kepala berwarna, sekaligus menyetel lebar kolomnya. */
export function kepala(
  sheet: ExcelJS.Worksheet,
  baris: number,
  kolom: KolomExcel[],
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

/**
 * Tulis satu baris data beserta gayanya.
 *
 * Perataan dan formatnya diambil dari definisi KOLOMNYA, bukan disetel per
 * sel: menyetelnya per sel berarti kolom baru harus disesuaikan di dua
 * tempat, dan yang kedua pasti tertinggal.
 */
export function barisData(
  sheet: ExcelJS.Worksheet,
  baris: number,
  kolom: KolomExcel[],
  nilai: any[],
  opsi: { tebal?: boolean; latar?: string } = {},
): void {
  kolom.forEach((k, i) => {
    const c = sheet.getCell(baris, i + 1);
    c.value = nilai[i] ?? null;
    c.font = {
      name: 'Arial',
      size: 9,
      bold: !!opsi.tebal,
      color: { argb: 'FF000000' },
    };
    c.alignment = { horizontal: k.rata ?? 'left', vertical: 'middle' };
    c.border = tepi();
    if (k.format) c.numFmt = k.format;
    if (opsi.latar) {
      c.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: opsi.latar },
      };
    }
  });
}
