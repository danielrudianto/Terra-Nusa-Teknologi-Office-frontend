import ExcelJS from 'exceljs';

import {
  RentangRekap,
  labelRentang,
  potonganBerkas,
} from '../constants/rentang-rekap';
import { vendorDisplayName } from './purchase-order-shared.helper';

/**
 * Rekap certificate of payment sebagai berkas Excel.
 *
 * DISUSUN BERTINGKAT: PEMASOK -> SPK -> CoP.
 *
 * CoP selalu menyertifikasi SATU SPK, sehingga SISA PAGU hanya punya arti
 * per SPK: dijumlahkan lintas kontrak, angka itu menyebut batas yang tidak
 * pernah disepakati siapa pun. Sebaliknya "sudah berapa yang kita
 * sertifikasi ke vendor ini" adalah pertanyaan yang benar-benar ditanyakan —
 * saat menagih dan saat menawar ulang harga.
 *
 * Satu susunan bertingkat menjawab keduanya sekaligus. Memilih salah satu
 * berarti membuang pertanyaan yang lain, dan yang terbuang selalu ketahuan
 * belakangan — sesudah berkasnya dikirim.
 *
 * TIGA LEMBAR, dan ketiganya bukan salinan satu sama lain:
 *
 *   1. Ikhtisar   — satu baris per PEMASOK. Dibaca lebih dulu, dan sering
 *                   satu-satunya yang dibaca.
 *   2. Per SPK    — satu baris per SPK, berkelompok di bawah pemasoknya,
 *                   dengan subtotal pemasok. Di sinilah sisa pagu berada.
 *   3. Per CoP    — satu baris per dokumen. Yang menelusuri selisih membaca
 *                   lembar ini.
 *
 * Bentuk visualnya menyalin `purchase-order-rekap-excel.ts` — warna, kop,
 * kepala kolom, tepi. Keduanya diunduh orang yang sama pada hari yang sama,
 * dan berkas yang bentuknya berbeda terbaca seperti berasal dari dua sistem.
 */

const BIRU = 'FF1F3864';
const BIRU_MUDA = 'FFD9E2F3';
const GARIS = 'FFBFBFBF';
const ABU = 'FF7F7F7F';
const HIJAU = 'FF1F6B3B';

/** Rupiah. Nol tampil sebagai "-" — kolom penuh nol sukar dibaca. */
const RP = '#,##0.00;(#,##0.00);"-"';
const HITUNGAN = '#,##0';

/** Tahap perjalanan dokumen, dari kolom penandanya. */
export type TahapCop = 'draft' | 'bap' | 'dibuat' | 'disetujui' | 'ditagih';

export interface IRekapCop {
  id: number;
  name: string;
  number: number;
  date: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  projectName: string | null;
  grossAmount: number | string | null;
  deductionTotal: number | string | null;
  additionTotal: number | string | null;
  netAmount: number | string | null;
  isBapApproved: boolean | number | null;
  isCopCreated: boolean | number | null;
  isApproved: boolean | number | null;
  purchaseOrderID: number;
  purchaseOrderName: string | null;
  purchaseType: string | null;
  supplierID: number | null;
  supplierName: string | null;
  supplierPrefix: string | null;
  tagihanNomor: string | null;
  tagihanLunas: boolean | number | null;
}

export interface IRekapSpk {
  id: number;
  name: string | null;
  projectName: string | null;
  purchaseType: string | null;
  supplierID: number | null;
  supplierName: string | null;
  supplierPrefix: string | null;
  nilaiKontrak: number | string | null;
  tanpaPagu: boolean;
}

export type Penerjemah = { instant(kunci: string, param?: any): string };

function angka(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function tepi(): Partial<ExcelJS.Borders> {
  const g = { style: 'thin' as const, color: { argb: GARIS } };
  return { top: g, left: g, bottom: g, right: g };
}

/** Tanggal `YYYY-MM-DD` -> `DD/MM/YYYY`; yang kosong menjadi "-". */
function tanggal(v: string | null | undefined): string {
  const m = String(v ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '-';
}

/** Periode kerja sebagai satu sel. */
function periodeKerja(c: IRekapCop): string {
  if (!c.periodStart && !c.periodEnd) return '-';
  return `${tanggal(c.periodStart)} – ${tanggal(c.periodEnd)}`;
}

/**
 * Tahap dokumen — DIBACA DARI PENANDANYA, bukan dari satu kolom status.
 *
 * Urutannya menurun: yang paling jauh perjalanannya menang. Diperiksa dari
 * belakang, sehingga dokumen yang sudah ditagihkan tidak terbaca sebagai
 * "disetujui" hanya karena penanda itu juga menyala.
 */
export function tahapCop(c: IRekapCop): TahapCop {
  if (c.tagihanNomor) return 'ditagih';
  if (c.isApproved) return 'disetujui';
  if (c.isCopCreated) return 'dibuat';
  if (c.isBapApproved) return 'bap';
  return 'draft';
}

/**
 * Nama pemasok seperti yang tercetak di dokumen lain.
 *
 * `vendorDisplayName`, bukan disusun sendiri: sebagian baris pemasok
 * menyimpan badan usahanya DI DALAM namanya (", CV." di ujung) SEKALIGUS
 * pada kolom `prefix`, dan menempelkannya begitu saja menghasilkan
 * "CV. Baja Selatan Mandiri, CV." — pada hampir semua barisnya.
 */
export function namaPemasokCop(
  nama: string | null | undefined,
  bentuk: string | null | undefined,
): string {
  const hasil = vendorDisplayName(nama || undefined, bentuk || undefined);
  return hasil === '-' ? String(nama ?? '-') : hasil;
}

/** Nilai bersih seluruh CoP pada satu daftar. */
export function totalBersih(daftar: IRekapCop[]): number {
  return daftar.reduce((j, c) => j + angka(c.netAmount), 0);
}

/**
 * SPK dikelompokkan per pemasok, dan CoP dikelompokkan per SPK.
 *
 * Disusun DI SINI, satu kali, bukan di tiap lembar: tiga lembar yang
 * mengelompokkan sendiri-sendiri adalah tiga kesempatan untuk berselisih,
 * dan yang berselisih bukan galat melainkan subtotal yang tidak sama antar
 * lembar dalam satu berkas.
 *
 * Urutannya mengikuti urutan datang dari server (`ORDER BY s.name, po.name,
 * c.number`), tidak diurutkan ulang — dua unduhan atas data yang sama tidak
 * boleh berbeda susunan.
 */
export interface KelompokSpk {
  spk: IRekapSpk;
  cop: IRekapCop[];
  disertifikasi: number;
}

export interface KelompokPemasok {
  supplierID: number | null;
  nama: string;
  spk: KelompokSpk[];
  disertifikasi: number;
  jumlahCop: number;
}

export function kelompokkan(
  daftar: IRekapCop[],
  spkDaftar: IRekapSpk[],
): KelompokPemasok[] {
  const perSpk = new Map<number, IRekapSpk>();
  for (const s of spkDaftar) perSpk.set(Number(s.id), s);

  const pemasok: KelompokPemasok[] = [];
  const indeksPemasok = new Map<string, KelompokPemasok>();
  const indeksSpk = new Map<string, KelompokSpk>();

  for (const c of daftar) {
    const kunciPemasok = String(c.supplierID ?? `~${c.supplierName ?? ''}`);
    let p = indeksPemasok.get(kunciPemasok);
    if (!p) {
      p = {
        supplierID: c.supplierID ?? null,
        nama: namaPemasokCop(c.supplierName, c.supplierPrefix),
        spk: [],
        disertifikasi: 0,
        jumlahCop: 0,
      };
      indeksPemasok.set(kunciPemasok, p);
      pemasok.push(p);
    }

    const kunciSpk = `${kunciPemasok}#${c.purchaseOrderID}`;
    let s = indeksSpk.get(kunciSpk);
    if (!s) {
      s = {
        spk:
          perSpk.get(Number(c.purchaseOrderID)) ??
          // SPK yang tidak ikut terkirim tetap mendapat barisnya sendiri,
          // dengan nilai kontrak nol dan ditandai tanpa pagu — lebih baik
          // daripada CoP-nya menghilang dari rekap tanpa sebab.
          {
            id: Number(c.purchaseOrderID),
            name: c.purchaseOrderName,
            projectName: c.projectName,
            purchaseType: c.purchaseType,
            supplierID: c.supplierID,
            supplierName: c.supplierName,
            supplierPrefix: c.supplierPrefix,
            nilaiKontrak: 0,
            tanpaPagu: true,
          },
        cop: [],
        disertifikasi: 0,
      };
      indeksSpk.set(kunciSpk, s);
      p.spk.push(s);
    }

    s.cop.push(c);
    s.disertifikasi += angka(c.netAmount);
    p.disertifikasi += angka(c.netAmount);
    p.jumlahCop += 1;
  }

  return pemasok;
}

// ---------------------------------------------------------------------------
// Penyusun lembar
// ---------------------------------------------------------------------------

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
  sheet.getRow(1).height = 30;

  sheet.mergeCells(2, 1, 2, kolomTerakhir);
  const s = sheet.getCell(2, 1);
  s.value = sub;
  s.font = { name: 'Arial', size: 9, color: { argb: 'FFFFFFFF' } };
  s.alignment = { vertical: 'middle', indent: 1 };
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

function sel(
  sheet: ExcelJS.Worksheet,
  baris: number,
  kolom: number,
  nilai: any,
  opsi: { fmt?: string; rata?: 'left' | 'center' | 'right'; abu?: boolean } = {},
): ExcelJS.Cell {
  const c = sheet.getCell(baris, kolom);
  c.value = nilai;
  c.font = {
    name: 'Arial',
    size: 9,
    color: { argb: opsi.abu ? ABU : 'FF000000' },
  };
  c.alignment = { horizontal: opsi.rata ?? 'left', vertical: 'middle' };
  c.border = tepi();
  if (opsi.fmt) c.numFmt = opsi.fmt;
  return c;
}

export function labelTahap(t: Penerjemah, tahap: TahapCop): string {
  const kunci: Record<TahapCop, string> = {
    draft: 'cop.keadaan_draft',
    bap: 'cop.keadaan_bap',
    dibuat: 'cop.keadaan_dibuat',
    disetujui: 'cop.keadaan_siap',
    ditagih: 'cop.keadaan_ditagih',
  };
  return t.instant(kunci[tahap]);
}

function lembarIkhtisar(
  wb: ExcelJS.Workbook,
  t: Penerjemah,
  judul: string,
  periode: string,
  kelompok: KelompokPemasok[],
): void {
  const sheet = wb.addWorksheet(t.instant('copRekap.lembarIkhtisar'));
  const kolom = [
    { nama: t.instant('copRekap.kolPemasok'), lebar: 38 },
    { nama: t.instant('copRekap.kolJumlahSpk'), lebar: 12 },
    { nama: t.instant('copRekap.kolJumlahCop'), lebar: 12 },
    { nama: t.instant('copRekap.kolKotor'), lebar: 18 },
    { nama: t.instant('copRekap.kolPotongan'), lebar: 16 },
    { nama: t.instant('copRekap.kolTambahan'), lebar: 16 },
    { nama: t.instant('copRekap.kolBersih'), lebar: 18 },
    { nama: t.instant('copRekap.kolBelumDitagih'), lebar: 18 },
  ];
  kop(sheet, kolom.length, judul, periode);
  kepala(sheet, 4, kolom);

  let baris = 5;
  const awal = baris;
  for (const p of kelompok) {
    const semua = p.spk.flatMap((s) => s.cop);
    const belum = semua
      .filter((c) => !c.tagihanNomor)
      .reduce((j, c) => j + angka(c.netAmount), 0);
    sel(sheet, baris, 1, p.nama);
    sel(sheet, baris, 2, p.spk.length, { fmt: HITUNGAN, rata: 'center' });
    sel(sheet, baris, 3, p.jumlahCop, { fmt: HITUNGAN, rata: 'center' });
    sel(sheet, baris, 4, semua.reduce((j, c) => j + angka(c.grossAmount), 0), {
      fmt: RP,
      rata: 'right',
    });
    sel(
      sheet,
      baris,
      5,
      semua.reduce((j, c) => j + angka(c.deductionTotal), 0),
      { fmt: RP, rata: 'right' },
    );
    sel(sheet, baris, 6, semua.reduce((j, c) => j + angka(c.additionTotal), 0), {
      fmt: RP,
      rata: 'right',
    });
    sel(sheet, baris, 7, p.disertifikasi, { fmt: RP, rata: 'right' });
    sel(sheet, baris, 8, belum, { fmt: RP, rata: 'right' });
    baris++;
  }

  const akhir = baris - 1;
  if (akhir >= awal) {
    for (let i = 1; i <= kolom.length; i++) {
      const c = sheet.getCell(baris, i);
      c.font = { name: 'Arial', size: 10, bold: true, color: { argb: BIRU } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BIRU_MUDA } };
      c.border = tepi();
      c.alignment = { horizontal: 'right', vertical: 'middle' };
    }
    const label = sheet.getCell(baris, 1);
    label.value = t.instant('copRekap.total');
    label.alignment = { horizontal: 'center', vertical: 'middle' };
    for (const i of [2, 3, 4, 5, 6, 7, 8]) {
      const huruf = sheet.getColumn(i).letter;
      const c = sheet.getCell(baris, i);
      /*
       * RUMUS BESERTA HASILNYA.
       *
       * `{formula}` tanpa `result` tampil KOSONG pada Excel yang membuka
       * berkas dalam Protected View — ia tidak menghitung apa pun sampai
       * penyuntingan diizinkan, dan yang terlihat hanyalah lembar ikhtisar
       * yang melompong tanpa sebab.
       */
      const rentang = `${huruf}${awal}:${huruf}${akhir}`;
      let jumlah = 0;
      for (let r = awal; r <= akhir; r++) {
        jumlah += angka(sheet.getCell(r, i).value);
      }
      c.value = { formula: `SUM(${rentang})`, result: jumlah } as any;
      c.numFmt = i === 2 || i === 3 ? HITUNGAN : RP;
    }
  }
}

function lembarPerSpk(
  wb: ExcelJS.Workbook,
  t: Penerjemah,
  judul: string,
  periode: string,
  kelompok: KelompokPemasok[],
): void {
  const sheet = wb.addWorksheet(t.instant('copRekap.lembarPerSpk'));
  const kolom = [
    { nama: t.instant('copRekap.kolSpk'), lebar: 26 },
    { nama: t.instant('copRekap.kolProyek'), lebar: 14 },
    { nama: t.instant('copRekap.kolJenis'), lebar: 10 },
    { nama: t.instant('copRekap.kolJumlahCop'), lebar: 12 },
    { nama: t.instant('copRekap.kolNilaiKontrak'), lebar: 20 },
    { nama: t.instant('copRekap.kolDisertifikasi'), lebar: 20 },
    { nama: t.instant('copRekap.kolSisaPagu'), lebar: 20 },
  ];
  kop(sheet, kolom.length, judul, periode);
  kepala(sheet, 4, kolom);

  let baris = 5;
  for (const p of kelompok) {
    // Kepala kelompok pemasok — satu baris melebar, supaya barisnya di
    // bawahnya terbaca sebagai miliknya tanpa mengulang namanya tujuh kali.
    sheet.mergeCells(baris, 1, baris, kolom.length);
    const k = sheet.getCell(baris, 1);
    k.value = p.nama;
    k.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    k.alignment = { vertical: 'middle', indent: 1 };
    for (let i = 1; i <= kolom.length; i++) {
      sheet.getCell(baris, i).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: BIRU },
      };
    }
    sheet.getRow(baris).height = 20;
    baris++;

    for (const s of p.spk) {
      const kontrak = angka(s.spk.nilaiKontrak);
      sel(sheet, baris, 1, s.spk.name ?? '-');
      sel(sheet, baris, 2, s.spk.projectName ?? '-', { rata: 'center' });
      sel(sheet, baris, 3, s.spk.purchaseType ?? '-', { rata: 'center' });
      sel(sheet, baris, 4, s.cop.length, { fmt: HITUNGAN, rata: 'center' });
      sel(sheet, baris, 5, s.spk.tanpaPagu ? '-' : kontrak, {
        fmt: s.spk.tanpaPagu ? undefined : RP,
        rata: 'right',
        abu: s.spk.tanpaPagu,
      });
      sel(sheet, baris, 6, s.disertifikasi, { fmt: RP, rata: 'right' });
      /*
       * SISA PAGU TIDAK DIISI ANGKA pada SPK tanpa plafon.
       *
       * Jenis D memang tidak berplafon — volumenya ditentukan di berita
       * acara. Menuliskan "0" atau bahkan nilai negatif di sana menyebut
       * batas yang tidak ada, dan angka yang tercetak selalu dibaca sebagai
       * kesepakatan.
       */
      const sisa = sel(
        sheet,
        baris,
        7,
        s.spk.tanpaPagu ? t.instant('copRekap.tanpaPagu') : kontrak - s.disertifikasi,
        {
          fmt: s.spk.tanpaPagu ? undefined : RP,
          rata: 'right',
          abu: s.spk.tanpaPagu,
        },
      );
      // Melewati pagu ditandai MERAH-nya sendiri, bukan didiamkan di antara
      // angka lain yang bentuknya sama.
      if (!s.spk.tanpaPagu && kontrak - s.disertifikasi < 0) {
        sisa.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFC00000' } };
      }
      baris++;
    }

    // Subtotal pemasok.
    for (let i = 1; i <= kolom.length; i++) {
      const c = sheet.getCell(baris, i);
      c.font = { name: 'Arial', size: 9, bold: true, color: { argb: BIRU } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BIRU_MUDA } };
      c.border = tepi();
      c.alignment = { horizontal: 'right', vertical: 'middle' };
    }
    const label = sheet.getCell(baris, 1);
    label.value = t.instant('copRekap.subtotalPemasok', { nama: p.nama });
    label.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    const jumlahCop = sheet.getCell(baris, 4);
    jumlahCop.value = p.jumlahCop;
    jumlahCop.numFmt = HITUNGAN;
    jumlahCop.alignment = { horizontal: 'center', vertical: 'middle' };
    const total = sheet.getCell(baris, 6);
    total.value = p.disertifikasi;
    total.numFmt = RP;
    baris += 2;
  }
}

function lembarPerCop(
  wb: ExcelJS.Workbook,
  t: Penerjemah,
  judul: string,
  periode: string,
  daftar: IRekapCop[],
): void {
  const sheet = wb.addWorksheet(t.instant('copRekap.lembarPerCop'));
  const kolom = [
    { nama: t.instant('copRekap.kolNomor'), lebar: 24 },
    { nama: t.instant('copRekap.kolTanggal'), lebar: 12 },
    { nama: t.instant('copRekap.kolPeriode'), lebar: 22 },
    { nama: t.instant('copRekap.kolPemasok'), lebar: 30 },
    { nama: t.instant('copRekap.kolSpk'), lebar: 24 },
    { nama: t.instant('copRekap.kolProyek'), lebar: 12 },
    { nama: t.instant('copRekap.kolTahap'), lebar: 16 },
    { nama: t.instant('copRekap.kolKotor'), lebar: 18 },
    { nama: t.instant('copRekap.kolPotongan'), lebar: 16 },
    { nama: t.instant('copRekap.kolTambahan'), lebar: 16 },
    { nama: t.instant('copRekap.kolBersih'), lebar: 18 },
    { nama: t.instant('copRekap.kolTagihan'), lebar: 24 },
  ];
  kop(sheet, kolom.length, judul, periode);
  kepala(sheet, 4, kolom);

  let baris = 5;
  const awal = baris;
  for (const c of daftar) {
    sel(sheet, baris, 1, c.name ?? '-');
    sel(sheet, baris, 2, tanggal(c.date), { rata: 'center' });
    sel(sheet, baris, 3, periodeKerja(c), { rata: 'center' });
    sel(sheet, baris, 4, namaPemasokCop(c.supplierName, c.supplierPrefix));
    sel(sheet, baris, 5, c.purchaseOrderName ?? '-');
    sel(sheet, baris, 6, c.projectName ?? '-', { rata: 'center' });
    const tahap = tahapCop(c);
    const selTahap = sel(sheet, baris, 7, labelTahap(t, tahap), {
      rata: 'center',
    });
    if (tahap === 'ditagih') {
      selTahap.font = { name: 'Arial', size: 9, color: { argb: HIJAU } };
    } else if (tahap === 'draft') {
      selTahap.font = { name: 'Arial', size: 9, color: { argb: ABU } };
    }
    sel(sheet, baris, 8, angka(c.grossAmount), { fmt: RP, rata: 'right' });
    sel(sheet, baris, 9, angka(c.deductionTotal), { fmt: RP, rata: 'right' });
    sel(sheet, baris, 10, angka(c.additionTotal), { fmt: RP, rata: 'right' });
    sel(sheet, baris, 11, angka(c.netAmount), { fmt: RP, rata: 'right' });
    sel(sheet, baris, 12, c.tagihanNomor ?? '-', {
      abu: !c.tagihanNomor,
    });
    baris++;
  }

  const akhir = baris - 1;
  if (akhir >= awal) {
    for (let i = 1; i <= kolom.length; i++) {
      const c = sheet.getCell(baris, i);
      c.font = { name: 'Arial', size: 10, bold: true, color: { argb: BIRU } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BIRU_MUDA } };
      c.border = tepi();
      c.alignment = { horizontal: 'right', vertical: 'middle' };
    }
    const label = sheet.getCell(baris, 1);
    label.value = t.instant('copRekap.total');
    label.alignment = { horizontal: 'center', vertical: 'middle' };
    for (const i of [8, 9, 10, 11]) {
      const huruf = sheet.getColumn(i).letter;
      let jumlah = 0;
      for (let r = awal; r <= akhir; r++) jumlah += angka(sheet.getCell(r, i).value);
      const c = sheet.getCell(baris, i);
      c.value = {
        formula: `SUM(${huruf}${awal}:${huruf}${akhir})`,
        result: jumlah,
      } as any;
      c.numFmt = RP;
    }
  }

  // Baris kepala tetap terlihat saat digulir — lembar ini yang paling
  // panjang, dan dua belas kolomnya tidak dapat ditebak dari isinya.
  sheet.views = [{ state: 'frozen', ySplit: 4 }];
}

export async function unduhRekapCop(
  /** Kode proyek, atau nama pemasok — yang dicetak di kepala berkas. */
  subjek: string,
  daftar: IRekapCop[],
  spkDaftar: IRekapSpk[],
  /*
   * WAJIB, bukan pilihan. Bila boleh dilewatkan, yang lupa mengirimkannya
   * mendapat berkas berbahasa Inggris tanpa satu pun galat — dan bedanya
   * baru ketahuan setelah berkasnya sampai ke penerima.
   */
  t: Penerjemah,
  rentang: RentangRekap = { dari: null, sampai: null },
  sudut: 'proyek' | 'pemasok' = 'proyek',
): Promise<void> {
  const judul =
    sudut === 'pemasok'
      ? `${t.instant('copRekap.judulBerkas')} — PEMASOK ${subjek}`
      : `${t.instant('copRekap.judulBerkas')} — PROYEK ${subjek}`;
  // Periodenya dicetak pada KETIGA lembar: lembarnya dipisah dan dikirim
  // satu-satu, dan lembar yang beredar tanpa menyebut periodenya terbaca
  // sebagai rekap seluruh proyek.
  const periode = labelRentang(rentang);

  const kelompok = kelompokkan(daftar, spkDaftar);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'TerraBot';
  wb.created = new Date();

  lembarIkhtisar(wb, t, judul, periode, kelompok);
  lembarPerSpk(wb, t, judul, periode, kelompok);
  lembarPerCop(wb, t, judul, periode, daftar);

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  // Spasi dan tanda baca dibuang: nama pemasok hampir selalu mengandung
  // keduanya, dan nama berkas bertitik dipotong sebagian klien surel.
  const potonganSubjek =
    subjek.replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '') || 'rekap';
  a.download = `Rekap_CoP_${potonganSubjek}_${potonganBerkas(rentang)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
