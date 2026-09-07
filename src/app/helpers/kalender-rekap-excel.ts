/**
 * Lembar ringkasan pada unduhan kalender.
 *
 * Dipisahkan dari komponennya karena lembar-lembar ini tidak menyangkut
 * tampilan kalender sama sekali — dan menaruhnya di dalam komponen membuat
 * berkas yang sudah panjang bertambah seribu baris lagi.
 *
 * Isinya kini tiga: RINGKASAN HARIAN, RENCANA KAS, dan kisi kalender per
 * rekening. Lembar Naskah rekap, Saldo per rekening, dan Rincian transaksi
 * dihapus — ketiganya menyusun ulang angka yang sudah ada pada dua lembar
 * pertama, dan berkas yang menyebut hal sama tiga kali membuat penerimanya
 * harus memilih mana yang dipercaya.
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
  JINGGA_MUDA,
  KolomExcel,
  RP,
  RP2,
  barisData,
  kepala,
  kop,
  tepi,
  tepiBlok,
} from './excel-gaya.helper';

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

export interface HarianRekap {
  tanggal: string;
  ketMasuk: string;
  masuk: number;
  ketKeluar: string;
  keluar: number;
  selisih: number;
  saldoGabungan: number;
  /**
   * Baris ini RENCANA, bukan transaksi yang sudah terjadi.
   *
   * Disorot beda warna dan dikeluarkan dari baris TOTAL: yang di bawah
   * adalah jumlah uang yang benar-benar bergerak bulan itu, dan mencampurkan
   * rencana ke dalamnya membuat angka yang dilaporkan lebih besar daripada
   * yang sungguh terjadi. Saldo gabungannya tetap berjalan melewatinya —
   * itu memang gunanya.
   */
  rencana?: boolean;
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

  const BARIS_SALDO_AWAL = baris - 1;
  let totalMasuk = 0;
  let totalKeluar = 0;
  /** Baris yang IKUT total terlaksana — dipakai menyusun rumus SUM-nya. */
  const barisTerlaksana: number[] = [];

  for (const h of harian) {
    // Rencana TIDAK ikut baris TOTAL — lihat keterangan pada `HarianRekap`.
    if (!h.rencana) {
      totalMasuk += h.masuk;
      totalKeluar += h.keluar;
      barisTerlaksana.push(baris);
    }
    /*
     * Selisih dan saldo ditulis sebagai RUMUS, bukan angka jadi.
     *
     * Yang menerima berkas ini kerap menyesuaikan satu-dua angka —
     * pembayaran yang bergeser, nilai yang dibetulkan — lalu ingin tahu
     * saldonya jadi berapa. Dengan angka mati, seluruh kolom di bawahnya
     * harus dihitung ulang dengan tangan, dan itu tidak pernah benar-benar
     * dilakukan: yang terjadi adalah angka yang diubah tidak cocok lagi
     * dengan saldo di sebelahnya, tanpa ada yang menyadarinya.
     *
     * `result` tetap diisi supaya berkasnya menampilkan angka yang benar
     * bahkan sebelum Excel menghitung ulang — sebagian penampil (pratinjau
     * surel, ponsel) tidak pernah menghitung rumus sama sekali.
     */
    barisData(
      sheet,
      baris,
      kolom,
      [
        h.tanggal,
        h.ketMasuk,
        h.masuk || null,
        h.ketKeluar,
        h.keluar || null,
        // Selisih = pemasukan - pengeluaran pada baris ini.
        { formula: `C${baris}-E${baris}`, result: h.selisih },
        // Saldo berjalan = saldo baris sebelumnya + selisih baris ini.
        {
          formula: `G${baris - 1}+F${baris}`,
          result: h.saldoGabungan,
        },
      ],
      h.rencana ? { latar: JINGGA_MUDA } : {},
    );
    baris++;
  }

  /**
   * Rentang bersambung dari baris yang ikut dijumlah.
   *
   * Baris rencana berselang-seling di antara yang terlaksana, sehingga satu
   * `SUM(C6:C40)` akan ikut menjumlahkan yang belum terjadi. Yang ditulis
   * karena itu `SUM(C6:C12,C14:C20,...)` — melewati baris rencana secara
   * eksplisit, dan tetap dapat ditelusuri oleh yang membaca rumusnya.
   */
  const rentang = (huruf: string): string => {
    if (!barisTerlaksana.length) return '0';
    const bagian: string[] = [];
    let mulai = barisTerlaksana[0];
    let akhir = mulai;
    for (const r of barisTerlaksana.slice(1)) {
      if (r === akhir + 1) {
        akhir = r;
        continue;
      }
      bagian.push(mulai === akhir ? `${huruf}${mulai}` : `${huruf}${mulai}:${huruf}${akhir}`);
      mulai = akhir = r;
    }
    bagian.push(mulai === akhir ? `${huruf}${mulai}` : `${huruf}${mulai}:${huruf}${akhir}`);
    return `SUM(${bagian.join(',')})`;
  };

  const barisTotal = baris;
  const barisTerakhir = baris - 1;

  barisData(
    sheet,
    barisTotal,
    kolom,
    [
      // Disebut TERLAKSANA, bukan sekadar TOTAL: barisnya tidak mencakup
      // rencana, dan nama yang tidak menyebutkannya akan dibaca sebagai
      // jumlah seluruh baris di atasnya.
      'TOTAL TERLAKSANA',
      '',
      { formula: rentang('C'), result: totalMasuk },
      '',
      { formula: rentang('E'), result: totalKeluar },
      {
        formula: `C${barisTotal}-E${barisTotal}`,
        result: totalMasuk - totalKeluar,
      },
      // Saldo akhirnya justru IKUT rencana — ia menjawab "nanti jadi
      // berapa", dan itu pertanyaan yang berbeda dari "bulan ini bergerak
      // berapa". Karena itu ia menunjuk saldo baris TERAKHIR, bukan
      // menjumlah ulang kolomnya.
      {
        formula: `G${harian.length ? barisTerakhir : BARIS_SALDO_AWAL}`,
        result: harian[harian.length - 1]?.saldoGabungan ?? saldoAwal,
      },
    ],
    { tebal: true, latar: BIRU_MUDA },
  );
}


// ----------------------------------------------------------------------


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

  const BARIS_PERTAMA = AWAL + 1;

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
  /*
   * Jumlah di kaki daftar, sebagai RUMUS.
   *
   * Lembar ini sebelumnya hanya deretan baris tanpa satu pun angka jumlah —
   * yang membacanya harus menyorot kolom nilai sendiri untuk tahu berapa
   * seluruhnya, dan itu ikut menjumlahkan yang TERLEWAT.
   *
   * `SUMIFS` memisahkan arahnya dan mengecualikan yang terlewat, sehingga
   * angkanya cocok dengan yang tampil di layar kalender. Ditulis sebagai
   * rumus supaya tetap benar ketika barisnya disunting atau disaring.
   */
  const barisAkhir = AWAL + rencana.length;
  const R = `$G$${BARIS_PERTAMA}:$G$${barisAkhir}`;
  const ARAH = `$B$${BARIS_PERTAMA}:$B$${barisAkhir}`;
  const STATUS = `$H$${BARIS_PERTAMA}:$H$${barisAkhir}`;

  const jumlah = (arah: 'masuk' | 'keluar') =>
    rencana
      .filter((r) => r.arah === arah && r.status !== 'Terlewat')
      .reduce((t, r) => t + Number(r.nilai || 0), 0);

  const totalMasuk = jumlah('masuk');
  const totalKeluar = jumlah('keluar');
  const totalTerlewat = rencana
    .filter((r) => r.status === 'Terlewat')
    .reduce((t, r) => t + Number(r.nilai || 0), 0);

  let b = barisAkhir + 2;
  const barisJumlah = (
    label: string,
    rumus: string,
    hasil: number,
    tebal = false,
  ) => {
    const cLabel = sheet.getCell(b, 6);
    cLabel.value = label;
    cLabel.font = { name: 'Arial', size: 9, bold: tebal };
    cLabel.alignment = { horizontal: 'right', vertical: 'middle' };
    const cNilai = sheet.getCell(b, 7);
    cNilai.value = { formula: rumus, result: hasil } as any;
    cNilai.numFmt = RP2;
    cNilai.font = { name: 'Arial', size: 9, bold: tebal };
    cNilai.alignment = { horizontal: 'right', vertical: 'middle' };
    cNilai.border = tepi();
    b++;
  };

  barisJumlah(
    'Rencana masuk',
    `SUMIFS(${R},${ARAH},"Masuk",${STATUS},"<>Terlewat")`,
    totalMasuk,
  );
  barisJumlah(
    'Rencana keluar',
    `SUMIFS(${R},${ARAH},"Keluar",${STATUS},"<>Terlewat")`,
    totalKeluar,
  );
  barisJumlah(
    'Bersih',
    `G${b - 2}-G${b - 1}`,
    totalMasuk - totalKeluar,
    true,
  );
  // Yang terlewat disebut TERPISAH, tidak dijumlahkan ke dalam bersih: ia
  // sudah lewat tanggalnya dan belum tentu jadi.
  barisJumlah(
    'Terlewat (tidak dihitung)',
    `SUMIF(${STATUS},"Terlewat",${R})`,
    totalTerlewat,
  );

}


// ----------------------------------------------------------------------

export interface SelKalender {
  hari: number;
  /**
   * Isi satu hari. `rencana` menandai baris yang BELUM terjadi.
   *
   * Ditandai per baris, bukan per hari: satu tanggal kerap memuat keduanya —
   * pembayaran yang sudah jalan dan rencana yang menyusul — dan yang
   * membacanya perlu tahu baris mana yang mana.
   */
  transaksi: Array<{ lawan: string; nilai: number; rencana?: boolean }>;
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
/** Huruf kolom Excel dari nomornya (1 → A, 27 → AA). */
function hurufKolom(n: number): string {
  let sisa = n;
  let hasil = '';
  while (sisa > 0) {
    const m = (sisa - 1) % 26;
    hasil = String.fromCharCode(65 + m) + hasil;
    sisa = Math.floor((sisa - m) / 26);
  }
  return hasil;
}

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

  /*
   * Saldo awal ditulis pada selnya SENDIRI.
   *
   * Dua alasan. Pertama, kisi ini sebelumnya tidak pernah menyebut saldo
   * pembukanya sama sekali — angka pada tanggal pertama muncul entah dari
   * mana. Kedua, ia menjadi pangkal rantai rumus saldo di bawah: mengubah
   * satu sel ini membuat seluruh bulan ikut menyesuaikan.
   */
  const BARIS_AWAL = 5;
  sheet.getCell(BARIS_AWAL, 1).value = 'Saldo awal';
  sheet.getCell(BARIS_AWAL, 1).font = { name: 'Arial', size: 9, bold: true };
  const selSaldoAwal = sheet.getCell(BARIS_AWAL, 2);
  selSaldoAwal.value = saldoAwal;
  selSaldoAwal.numFmt = RP2;
  selSaldoAwal.font = { name: 'Arial', size: 9, bold: true };
  selSaldoAwal.alignment = { horizontal: 'right', vertical: 'middle' };
  /** Alamat mutlak; dirujuk rumus saldo hari pertama. */
  const ALAMAT_SALDO_AWAL = `$B$${BARIS_AWAL}`;

  const perHari: Record<number, SelKalender> = Object.create(null);
  for (const s of sel) perHari[s.hari] = s;

  /*
   * Tinggi tiap pekan mengikuti hari TERPADAT di pekan itu.
   *
   * Tinggi tetap membuat hari dengan dua puluh transaksi terpotong, dan hari
   * kosong menyisakan ruang putih sepertiga halaman.
   */
  let baris = BARIS_AWAL + 2;
  let hari = 1;
  let kolomAwal = hariPertama;
  /*
   * Alamat sel saldo hari SEBELUMNYA, mengikuti urutan tanggal.
   *
   * Kisinya dibaca kiri-ke-kanan lalu turun, tetapi rantai saldonya
   * mengikuti tanggal — dan keduanya memang searah. Yang disimpan alamatnya,
   * bukan nilainya: itulah yang membuat rumusnya hidup.
   */
  let alamatSaldoSebelumnya = ALAMAT_SALDO_AWAL;

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

      /*
       * Saldo akhir hari ini sebagai RUMUS: saldo kemarin + isi hari ini.
       *
       * Sebelumnya angka mati. Menyesuaikan satu nominal di kisi ini lalu
       * membaca saldo di sebelahnya menghasilkan angka yang tidak lagi
       * benar — dan tidak ada apa pun di layar yang menunjukkannya.
       *
       * Kolom nominal hari ini bersambung ke bawah dari `baris + 1` sampai
       * `baris + maksTrx`; sel kosong diabaikan SUM.
       */
      const kolomNilai = hurufKolom(kiri + 1);
      const rumusSaldo =
        `${alamatSaldoSebelumnya}+SUM(` +
        `${kolomNilai}${baris + 1}:${kolomNilai}${baris + maksTrx})`;

      const cSaldo = sheet.getCell(baris, kiri + 1);
      cSaldo.value = { formula: rumusSaldo, result: isi?.saldoAkhir ?? 0 } as any;
      alamatSaldoSebelumnya = `${kolomNilai}${baris}`;
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
        // Baris RENCANA disorot; yang sudah terjadi dibiarkan polos. Yang
        // diberi warna adalah yang belum pasti — itu yang perlu diperiksa.
        const sorot: ExcelJS.Fill | undefined = t?.rencana
          ? {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: JINGGA_MUDA },
            }
          : undefined;

        const cNama = sheet.getCell(baris + 1 + n, kiri);
        cNama.value = t?.lawan ?? null;
        cNama.font = { name: 'Arial', size: 8 };
        cNama.alignment = { vertical: 'middle', indent: 1, wrapText: true };
        cNama.border = tepiBlok({ kiri: true, bawah: akhir });
        if (sorot) cNama.fill = sorot;

        const cNilai = sheet.getCell(baris + 1 + n, kiri + 1);
        cNilai.value = t ? t.nilai : null;
        cNilai.numFmt = RP2;
        cNilai.font = { name: 'Arial', size: 8 };
        cNilai.alignment = { horizontal: 'right', vertical: 'middle' };
        cNilai.border = tepiBlok({ kanan: true, bawah: akhir });
        if (sorot) cNilai.fill = sorot;
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
