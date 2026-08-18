/**
 * Lembar ringkasan pada unduhan kalender.
 *
 * Dipisahkan dari komponennya karena empat lembar ini tidak menyangkut
 * tampilan kalender sama sekali — dan menaruhnya di dalam komponen membuat
 * berkas yang sudah panjang bertambah seribu baris lagi.
 *
 * Memakai ExcelJS, bukan `xlsx`. Yang kedua tidak dapat memformat sel:
 * tidak ada kop, tidak ada kepala berwarna, tidak ada format rupiah — dan
 * hasilnya tampil jauh lebih buruk daripada rekap purchase order yang
 * memakai pustaka yang sama dengan berkas ini.
 */

import ExcelJS from 'exceljs';

import {
  ABU,
  BIRU,
  BIRU_MUDA,
  KolomExcel,
  RP,
  RP2,
  barisData,
  kepala,
  kop,
  tepi,
  tepiBlok,
} from './excel-gaya.helper';

export interface MutasiRekap {
  date: string;
  rekening: string;
  bank: string;
  keterangan: string;
  lawan: string;
  proyek: string;
  nilai: number;
  saldo: number;
}

export interface AkunRekap {
  id: number;
  nomor: string;
  atasNama: string;
  bank: string;
  saldoAwal: number;
  /** Saldo pada tiap tanggal; panjangnya sebanyak hari dalam bulan itu. */
  harian: number[];
}

export interface RencanaRekap {
  date: string;
  arah: 'masuk' | 'keluar';
  keterangan: string;
  kategori: string;
  proyek: string;
  rekening: string;
  nilai: number;
  status: string;
}

const SUB = (bulan: string, tahun: number) =>
  `PT Alpha Konstruksi Nusantara · ${bulan} ${tahun} · disusun ` +
  new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

// ----------------------------------------------------------------------

export function lembarRincian(
  wb: ExcelJS.Workbook,
  data: MutasiRekap[],
  bulan: string,
  tahun: number,
): void {
  if (!data.length) return;

  const kolom: KolomExcel[] = [
    { nama: 'Tanggal', lebar: 12, rata: 'center' },
    { nama: 'Rekening', lebar: 20, rata: 'left' },
    { nama: 'Bank', lebar: 22, rata: 'left' },
    { nama: 'Keterangan', lebar: 38, rata: 'left' },
    { nama: 'Lawan transaksi', lebar: 28, rata: 'left' },
    { nama: 'Proyek', lebar: 12, rata: 'center' },
    { nama: 'Masuk (Rp)', lebar: 16, rata: 'right', format: RP },
    { nama: 'Keluar (Rp)', lebar: 16, rata: 'right', format: RP },
    { nama: 'Saldo rekening (Rp)', lebar: 19, rata: 'right', format: RP2 },
  ];

  const sheet = wb.addWorksheet('Rincian transaksi', {
    views: [{ state: 'frozen', ySplit: 4 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  });

  kop(sheet, kolom.length, 'RINCIAN TRANSAKSI', SUB(bulan, tahun));
  const AWAL = 4;
  kepala(sheet, AWAL, kolom);

  data.forEach((m, i) => {
    barisData(sheet, AWAL + 1 + i, kolom, [
      m.date,
      m.rekening,
      m.bank,
      m.keterangan,
      m.lawan,
      m.proyek,
      m.nilai > 0 ? m.nilai : null,
      m.nilai < 0 ? Math.abs(m.nilai) : null,
      m.saldo,
    ]);
  });

  // Penyaring otomatis — itu yang membuat lembar ini berguna dibanding kisi
  // kalendernya: mencari satu pemasok cukup satu klik.
  sheet.autoFilter = {
    from: { row: AWAL, column: 1 },
    to: { row: AWAL + data.length, column: kolom.length },
  };
}

// ----------------------------------------------------------------------

export interface HarianRekap {
  tanggal: string;
  ketMasuk: string;
  masuk: number;
  ketKeluar: string;
  keluar: number;
  selisih: number;
  saldoGabungan: number;
}

/**
 * Ringkasan harian gabungan — bentuk yang selama ini disusun tangan.
 *
 * Satu baris per tanggal, dengan SALDO GABUNGAN seluruh rekening di kolom
 * terakhir. Itu angka yang sebenarnya dicari: bukan saldo satu rekening,
 * melainkan berapa uang yang ada seluruhnya pada tanggal itu.
 *
 * Keterangannya digabung menjadi satu sel per arah — daftar nama pada satu
 * hari kerap panjang, dan memisahkannya per baris membuat tanggalnya
 * berulang belasan kali.
 */
export function lembarHarian(
  wb: ExcelJS.Workbook,
  harian: HarianRekap[],
  saldoAwal: number,
  bulan: string,
  tahun: number,
): void {
  if (!harian.length) return;

  const kolom: KolomExcel[] = [
    { nama: 'Tanggal', lebar: 13, rata: 'center' },
    { nama: 'Keterangan pemasukan', lebar: 46, rata: 'left' },
    { nama: 'Total Pemasukan (Rp)', lebar: 19, rata: 'right', format: RP2 },
    { nama: 'Keterangan pengeluaran', lebar: 46, rata: 'left' },
    { nama: 'Total Pengeluaran (Rp)', lebar: 19, rata: 'right', format: RP2 },
    { nama: 'Selisih (Rp)', lebar: 18, rata: 'right', format: RP2 },
    { nama: 'Saldo Gabungan (Rp)', lebar: 21, rata: 'right', format: RP2 },
  ];

  const sheet = wb.addWorksheet('Ringkasan harian', {
    views: [{ state: 'frozen', ySplit: 4 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  });

  kop(sheet, kolom.length, 'RINGKASAN HARIAN', SUB(bulan, tahun));
  const AWAL = 4;
  kepala(sheet, AWAL, kolom);

  let baris = AWAL + 1;

  // Saldo awal disebut sebagai barisnya sendiri: tanpa itu, angka pada
  // tanggal pertama tampak muncul entah dari mana.
  barisData(
    sheet,
    baris++,
    kolom,
    ['Saldo awal', '', null, '', null, null, saldoAwal],
    { tebal: true, latar: BIRU_MUDA },
  );

  let totalMasuk = 0;
  let totalKeluar = 0;

  for (const h of harian) {
    totalMasuk += h.masuk;
    totalKeluar += h.keluar;
    barisData(sheet, baris++, kolom, [
      h.tanggal,
      h.ketMasuk,
      h.masuk || null,
      h.ketKeluar,
      h.keluar || null,
      h.selisih,
      h.saldoGabungan,
    ]);
  }

  barisData(
    sheet,
    baris,
    kolom,
    [
      'TOTAL',
      '',
      totalMasuk,
      '',
      totalKeluar,
      totalMasuk - totalKeluar,
      harian[harian.length - 1]?.saldoGabungan ?? saldoAwal,
    ],
    { tebal: true, latar: BIRU_MUDA },
  );
}

export function lembarSaldo(
  wb: ExcelJS.Workbook,
  akun: AkunRekap[],
  totalHari: number,
  bulan: string,
  tahun: number,
): void {
  if (!akun.length) return;

  const kolom: KolomExcel[] = [
    { nama: 'Rekening', lebar: 22, rata: 'left' },
    { nama: 'Atas nama', lebar: 24, rata: 'left' },
    { nama: 'Saldo awal (Rp)', lebar: 17, rata: 'right', format: RP2 },
    ...Array.from({ length: totalHari }, (_, i) => ({
      nama: String(i + 1),
      lebar: 15,
      rata: 'right' as const,
      format: RP2,
    })),
  ];

  const sheet = wb.addWorksheet('Saldo per rekening', {
    // Dibekukan pada kolom rekening DAN baris kepala: dengan 31 kolom
    // tanggal, yang menggulir ke kanan kehilangan barisnya.
    views: [{ state: 'frozen', xSplit: 2, ySplit: 4 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  });

  kop(sheet, kolom.length, 'SALDO PER REKENING', SUB(bulan, tahun));
  const AWAL = 4;
  kepala(sheet, AWAL, kolom);

  const perBank: Record<string, AkunRekap[]> = Object.create(null);
  for (const a of akun) (perBank[a.bank] ??= []).push(a);

  let baris = AWAL + 1;
  const totalHarian = new Array(totalHari).fill(0);
  let totalAwal = 0;

  for (const [bank, daftar] of Object.entries(perBank)) {
    const subHarian = new Array(totalHari).fill(0);
    let subAwal = 0;

    for (const a of daftar) {
      subAwal += a.saldoAwal;
      totalAwal += a.saldoAwal;
      a.harian.forEach((v, i) => {
        subHarian[i] += v;
        totalHarian[i] += v;
      });
      barisData(sheet, baris++, kolom, [
        a.nomor,
        a.atasNama,
        a.saldoAwal,
        ...a.harian,
      ]);
    }

    // Subtotal per bank: itu yang disebut pertama pada rekap harian.
    barisData(
      sheet,
      baris++,
      kolom,
      [`Total ${bank}`, '', subAwal, ...subHarian],
      { tebal: true, latar: BIRU_MUDA },
    );
    baris += 1;
  }

  barisData(
    sheet,
    baris,
    kolom,
    ['TOTAL SELURUH REKENING', '', totalAwal, ...totalHarian],
    { tebal: true, latar: BIRU_MUDA },
  );
}

// ----------------------------------------------------------------------

export function lembarNaskah(
  wb: ExcelJS.Workbook,
  akun: AkunRekap[],
  hariRekap: number,
  tanggalRekap: string,
  bulan: string,
  tahun: number,
): void {
  if (!akun.length) return;

  const sheet = wb.addWorksheet('Naskah rekap', {
    pageSetup: { orientation: 'portrait', fitToPage: true, fitToWidth: 1 },
  });

  kop(sheet, 2, 'REKAP SALDO', SUB(bulan, tahun));

  const rp = (n: number) =>
    'Rp ' +
    new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);

  sheet.getColumn(1).width = 54;
  sheet.getColumn(2).width = 24;

  let baris = 4;

  /*
   * Setiap baris berisi diberi GARIS.
   *
   * Tanpa garis, dua kolom angka yang berjauhan sulit dipasangkan dengan
   * keterangannya — mata melompat baris, dan rekap yang dibaca cepat justru
   * paling mudah salah baca.
   *
   * Baris kosong TIDAK digaris: ia pemisah antar bank, dan menggarisnya
   * membuat pemisahnya hilang.
   */
  const tulis = (kiri: string, kanan = '', tebal = false) => {
    const a = sheet.getCell(baris, 1);
    a.value = kiri;
    a.font = { name: 'Arial', size: 10, bold: tebal };
    a.alignment = { vertical: 'middle', indent: 1 };

    const b = sheet.getCell(baris, 2);
    b.value = kanan;
    b.font = { name: 'Arial', size: 10, bold: tebal };
    b.alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };

    if (kiri || kanan) {
      a.border = tepi();
      b.border = tepi();
      if (tebal) {
        const latar: ExcelJS.Fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: BIRU_MUDA },
        };
        a.fill = latar;
        b.fill = latar;
      }
    }
    sheet.getRow(baris).height = 18;
    baris += 1;
  };

  tulis(`Saldo per tanggal ${tanggalRekap}:`, '', true);
  baris += 1;

  const perBank: Record<string, AkunRekap[]> = Object.create(null);
  for (const a of akun) (perBank[a.bank] ??= []).push(a);

  let huruf = 'a';
  const subtotal: Array<{ bank: string; nilai: number }> = [];

  for (const [bank, daftar] of Object.entries(perBank)) {
    let sub = 0;
    // Satu rekening tidak dirinci bernomor; dua atau lebih dirinci, persis
    // seperti rekap yang selama ini ditulis tangan.
    if (daftar.length > 1) {
      tulis(`${huruf}. Rekening di ${bank}:`);
      daftar.forEach((a, i) => {
        const nilai = a.harian[hariRekap - 1] ?? 0;
        sub += nilai;
        tulis(`      ${i + 1}. ${a.nomor}`, rp(nilai));
      });
      tulis(`      Total saldo di ${bank}`, rp(sub), true);
    } else {
      const a = daftar[0];
      sub = a.harian[hariRekap - 1] ?? 0;
      tulis(`${huruf}. Rekening di ${bank}`, rp(sub));
    }

    subtotal.push({ bank, nilai: sub });
    huruf = String.fromCharCode(huruf.charCodeAt(0) + 1);
    baris += 1;
  }

  /*
   * Total KUMULATIF, bukan satu total di akhir.
   *
   * Rekap yang selama ini ditulis menyebut "total BRI dan Mandiri", lalu
   * "total BRI, Mandiri, dan Stephanie" — sebagian rekening bukan milik
   * perusahaan dan kerap perlu disebut terpisah.
   */
  let kumulatif = 0;
  const terkumpul: string[] = [];
  subtotal.forEach((x, i) => {
    kumulatif += x.nilai;
    terkumpul.push(x.bank);
    if (i === 0) return;
    const sebutan =
      terkumpul.length > 2
        ? terkumpul.slice(0, -1).join(', ') +
          ', dan ' +
          terkumpul[terkumpul.length - 1]
        : terkumpul.join(' dan ');
    tulis(`Total rekening ${sebutan}`, rp(kumulatif), true);
  });

  if (subtotal.length === 1) {
    tulis('Total seluruh rekening', rp(kumulatif), true);
  }
}

// ----------------------------------------------------------------------

export function lembarRencana(
  wb: ExcelJS.Workbook,
  rencana: RencanaRekap[],
  bulan: string,
  tahun: number,
): void {
  if (!rencana.length) return;

  const kolom: KolomExcel[] = [
    { nama: 'Tanggal', lebar: 12, rata: 'center' },
    { nama: 'Arah', lebar: 10, rata: 'center' },
    { nama: 'Keterangan', lebar: 38, rata: 'left' },
    { nama: 'Kategori', lebar: 16, rata: 'left' },
    { nama: 'Proyek', lebar: 14, rata: 'center' },
    { nama: 'Rekening', lebar: 20, rata: 'left' },
    { nama: 'Nominal (Rp)', lebar: 18, rata: 'right', format: RP },
    { nama: 'Status', lebar: 14, rata: 'center' },
  ];

  const sheet = wb.addWorksheet('Rencana kas', {
    views: [{ state: 'frozen', ySplit: 4 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  });

  kop(sheet, kolom.length, 'RENCANA KAS', SUB(bulan, tahun));
  const AWAL = 4;
  kepala(sheet, AWAL, kolom);

  rencana.forEach((r, i) => {
    barisData(
      sheet,
      AWAL + 1 + i,
      kolom,
      [
        r.date,
        r.arah === 'masuk' ? 'Masuk' : 'Keluar',
        r.keterangan,
        r.kategori,
        r.proyek,
        r.rekening,
        r.nilai,
        r.status,
      ],
      // Yang TERLEWAT diredupkan: ia tidak ikut dihitung, dan tanpa
      // pembeda itu jumlah di lembar ini tidak cocok dengan yang di layar.
      r.status === 'Terlewat' ? { latar: 'FFF2F2F2' } : {},
    );
    if (r.status === 'Terlewat') {
      for (let c = 1; c <= kolom.length; c++) {
        sheet.getCell(AWAL + 1 + i, c).font = {
          name: 'Arial',
          size: 9,
          italic: true,
          color: { argb: ABU },
        };
      }
    }
  });

  sheet.autoFilter = {
    from: { row: AWAL, column: 1 },
    to: { row: AWAL + rencana.length, column: kolom.length },
  };
}


// ----------------------------------------------------------------------

export interface SelKalender {
  hari: number;
  transaksi: Array<{ lawan: string; nilai: number }>;
  saldoAkhir: number;
}

/**
 * Kisi kalender satu rekening.
 *
 * Ditulis ulang dengan ExcelJS supaya seluruh lembar berada di SATU berkas.
 * Dua pustaka berarti dua berkas terunduh, dan yang menerimanya harus
 * membuka keduanya berdampingan untuk melihat hal yang bersambung.
 *
 * Bentuknya tujuh kolom hari, tiga kolom per hari: tanggal beserta saldo
 * akhirnya di atas, lalu daftar lawan transaksi dan nominalnya di bawah.
 */
export function lembarKalender(
  wb: ExcelJS.Workbook,
  nomor: string,
  atasNama: string,
  saldoAwal: number,
  sel: SelKalender[],
  bulan: string,
  tahun: number,
  hariPertama: number,
  totalHari: number,
): void {
  // Nama lembar Excel dibatasi 31 karakter dan tidak boleh memuat `/ \ ? * [ ]`.
  const namaLembar = nomor.replace(/[\\/?*[\]]/g, '-').slice(0, 31);
  const sheet = wb.addWorksheet(namaLembar, {
    /*
     * `paperSize` sengaja TIDAK disetel.
     *
     * ExcelJS mengetiknya sebagai enum `PaperSize`, bukan angka — dan `8`
     * untuk A3 ditolak pemeriksa tipe. `fitToWidth: 1` sudah membuat isinya
     * muat selebar kertas apa pun yang dipilih saat mencetak, sehingga
     * menyebut ukurannya tidak menambah apa-apa.
     *
     * Rekap purchase order pun tidak menyetelnya, dan hasil cetaknya benar.
     */
    pageSetup: {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
    },
  });

  const KOLOM_PER_HARI = 2;
  // Tinggi terkecil satu pekan; lihat alasannya di bawah.
  const MIN_BARIS_PEKAN = 5;
  const TOTAL_KOLOM = 7 * KOLOM_PER_HARI;

  kop(
    sheet,
    TOTAL_KOLOM,
    `KALENDER PEMBAYARAN — ${nomor}`,
    `${atasNama} · ${SUB(bulan, tahun)}`,
  );

  const hariNama = [
    'Senin',
    'Selasa',
    'Rabu',
    'Kamis',
    'Jumat',
    'Sabtu',
    'Minggu',
  ];
  hariNama.forEach((n, i) => {
    const kiri = i * KOLOM_PER_HARI + 1;
    sheet.mergeCells(4, kiri, 4, kiri + KOLOM_PER_HARI - 1);
    const c = sheet.getCell(4, kiri);
    c.value = n;
    c.font = { name: 'Arial', size: 9, bold: true, color: { argb: BIRU } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BIRU_MUDA } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.border = tepi();
    sheet.getColumn(kiri).width = 30;
    sheet.getColumn(kiri + 1).width = 16;
  });
  sheet.getRow(4).height = 20;

  const perHari: Record<number, SelKalender> = Object.create(null);
  for (const s of sel) perHari[s.hari] = s;

  /*
   * Tinggi tiap pekan mengikuti hari TERPADAT di pekan itu.
   *
   * Tinggi tetap membuat hari dengan dua puluh transaksi terpotong, dan hari
   * kosong menyisakan ruang putih sepertiga halaman.
   */
  let baris = 5;
  let hari = 1;
  let kolomAwal = hariPertama;

  while (hari <= totalHari) {
    /*
     * Kolom tiap tanggal disimpan bersama tanggalnya.
     *
     * Sebelumnya dihitung `7 - pekan.length + idx`, yang benar hanya pada
     * pekan PERTAMA — di pekan terakhir yang juga tidak penuh, rumus itu
     * mendorong tanggalnya ke kanan: 31 Agustus 2026 jatuh Senin tetapi
     * tercetak di kolom Minggu.
     */
    const pekan: Array<{ hari: number; kolom: number }> = [];
    for (let k = kolomAwal; k < 7 && hari <= totalHari; k++) {
      pekan.push({ hari: hari++, kolom: k });
    }
    kolomAwal = 0;

    /*
     * Tinggi tiap pekan paling sedikit LIMA baris.
     *
     * Pekan yang hanya punya satu transaksi menghasilkan sel setipis satu
     * baris, dan kalender yang tinggi selnya berubah-ubah antar pekan sulit
     * dibaca — mata kehilangan garis mendatarnya.
     */
    const maksTrx = Math.max(
      MIN_BARIS_PEKAN,
      ...pekan.map((x) => perHari[x.hari]?.transaksi.length ?? 0),
    );

    pekan.forEach(({ hari: d, kolom }) => {
      const kiri = kolom * KOLOM_PER_HARI + 1;
      const isi = perHari[d];

      /*
       * Tiap hari adalah satu BLOK bergaris tebal.
       *
       * Garis tipis seragam membuat kisinya menjadi tabel biasa: batas antar
       * hari tidak lagi terbaca, dan yang mencari satu tanggal harus
       * menghitung kolom. Yang tebal hanya batas bloknya; di dalamnya tetap
       * samar supaya angkanya yang menonjol.
       */
      const cTgl = sheet.getCell(baris, kiri);
      cTgl.value = `${d} ${bulan}`;
      cTgl.font = { name: 'Arial', size: 9, bold: true };
      cTgl.alignment = { vertical: 'middle', indent: 1 };
      cTgl.border = tepiBlok({ kiri: true, atas: true });
      cTgl.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF2F5FC' },
      };

      const cSaldo = sheet.getCell(baris, kiri + 1);
      cSaldo.value = isi?.saldoAkhir ?? null;
      cSaldo.numFmt = RP2;
      cSaldo.font = { name: 'Arial', size: 8, bold: true, color: { argb: ABU } };
      cSaldo.alignment = { horizontal: 'right', vertical: 'middle' };
      cSaldo.border = tepiBlok({ kanan: true, atas: true });
      cSaldo.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF2F5FC' },
      };

      for (let n = 0; n < maksTrx; n++) {
        const t = isi?.transaksi[n];
        const akhir = n === maksTrx - 1;

        const cNama = sheet.getCell(baris + 1 + n, kiri);
        cNama.value = t?.lawan ?? null;
        cNama.font = { name: 'Arial', size: 8 };
        cNama.alignment = { vertical: 'middle', indent: 1, wrapText: true };
        cNama.border = tepiBlok({ kiri: true, bawah: akhir });

        const cNilai = sheet.getCell(baris + 1 + n, kiri + 1);
        cNilai.value = t ? t.nilai : null;
        cNilai.numFmt = RP2;
        cNilai.font = { name: 'Arial', size: 8 };
        cNilai.alignment = { horizontal: 'right', vertical: 'middle' };
        cNilai.border = tepiBlok({ kanan: true, bawah: akhir });
      }
    });

    /*
     * Kolom hari DI LUAR bulan diberi latar redup.
     *
     * Sel yang benar-benar kosong tanpa garis membuat kisinya terputus di
     * pekan pertama dan terakhir — dan yang membacanya kehilangan pegangan
     * tepat di tempat tanggalnya paling mudah salah baca.
     */
    const terpakai = new Set(pekan.map((x) => x.kolom));
    for (let k = 0; k < 7; k++) {
      if (terpakai.has(k)) continue;
      const kiri = k * KOLOM_PER_HARI + 1;
      for (let r = 0; r <= maksTrx; r++) {
        for (let c = 0; c < KOLOM_PER_HARI; c++) {
          const sel = sheet.getCell(baris + r, kiri + c);
          sel.border = tepiBlok({
            kiri: c === 0,
            kanan: c === KOLOM_PER_HARI - 1,
            atas: r === 0,
            bawah: r === maksTrx,
          });
          sel.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFAFAFA' },
          };
        }
      }
    }

    sheet.getRow(baris).height = 20;
    baris += maksTrx + 1;
  }

  // Saldo awal disebut di kaki: tanpa itu, saldo akhir pada tanggal pertama
  // tampak muncul entah dari mana.
  const cKaki = sheet.getCell(baris + 1, 1);
  cKaki.value = 'Saldo awal bulan';
  cKaki.font = { name: 'Arial', size: 9, bold: true };
  const cNilaiAwal = sheet.getCell(baris + 1, 2);
  cNilaiAwal.value = saldoAwal;
  cNilaiAwal.numFmt = RP2;
  cNilaiAwal.font = { name: 'Arial', size: 9, bold: true };
  cNilaiAwal.alignment = { horizontal: 'right' };
}
