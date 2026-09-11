import {
  DataRekap,
  berkasRekapTenderExcel,
} from './tender-rekap.helper';

/*
 * Unduhan Excel rekap tender: bentuknya, bukan hanya isinya.
 *
 * Isi lembar ini sudah benar sejak awal — yang tidak ada adalah kisi, dan
 * itulah yang membuatnya tidak terpakai. Pada enam pemasok, membaca satu
 * angka berarti melompat dari nama pemasok di kepala kolom ke baris belasan
 * baris di bawahnya; tanpa garis, mata tidak punya pegangan dan salah kolom
 * bukan kemungkinan melainkan kepastian. Untuk lembar yang seluruh gunanya
 * MEMBANDINGKAN antar kolom, itu menghapus gunanya.
 *
 * Tiga hal lain membuatnya tidak dapat dipakai sebagai lembar kerja:
 * tanggal ditulis sebagai teks, PPN ditulis "11%" sebagai teks, dan lebar
 * kolom 18 memotong angka ratusan juta menjadi `#######`.
 *
 * Semuanya lolos dari pengujian selama ini karena tidak ada satu pun uji yang
 * benar-benar membuka hasil unduhannya.
 */

function contoh(jumlahPemasok = 3): DataRekap {
  return {
    nomor: 1,
    nama: 'Crane R501',
    proyek: 'R501',
    jenis: 'jasa',
    tanggal: '2026-09-08',
    items: [
      { id: 1, name: 'Penyewaan crawler crane + operator', specification: '55ton, boom 34 m', quantity: 1, unit: 'bulan' },
    ],
    quotes: Array.from({ length: jumlahPemasok }, (_, i) => ({
      id: i + 1,
      supplierPrefix: 'PT.',
      supplierName: `Pemasok ${i + 1}`,
      paymentTerm: 'PPD',
      creditTerm: 3,
      includePpn: true,
      ppnPercentage: 11,
      deliveryMethod: 'franco',
      otherCost: 40_000_000,
      otherCostNote: 'Mobilisasi dan Demobilisasi',
      notes: 'Pelunasan setelah 200 jam',
      items: [{ tenderItemID: 1, price: 119_000_000 }],
    })),
  };
}

describe('unduhan Excel rekap tender', () => {
  describe('kisi', () => {
    it('memberi garis pada SETIAP sel tabelnya', async () => {
      const d = contoh();
      const wb = await berkasRekapTenderExcel(d);
      const ws = wb.getWorksheet('Perbandingan')!;

      // Baris 5 ke bawah adalah tabelnya sendiri — tidak ada sel gabungan di
      // sana, jadi setiap sel harus terkurung penuh. Baris 1-4 (kop) dan
      // baris terakhir (catatan) memakai rentang gabungan, yang garisnya
      // digambar pada tepi rentang, bukan per sel.
      const telanjang: string[] = [];
      for (let r = 5; r < ws.rowCount; r++) {
        for (let c = 1; c <= d.quotes.length + 1; c++) {
          const b = ws.getCell(r, c).border;
          if (!b?.top || !b?.bottom || !b?.left || !b?.right) {
            telanjang.push(`${r}:${c}`);
          }
        }
      }

      expect(telanjang)
        .withContext(
          'sel tanpa garis membuat kisinya putus; pada enam pemasok, ' +
            'baris yang tidak terkurung adalah baris yang salah dibaca',
        )
        .toEqual([]);
    });

    it('menutup bingkai kiri DAN kanan blok judul yang digabung', async () => {
      /*
       * Seluruh sel dalam satu rentang gabungan berbagi gaya sel induknya.
       * Menyetel garisnya per kolom — seperti pada baris biasa — membuat
       * tulisan terakhir menang, sehingga bingkai kiri blok judul berpindah
       * menjadi bingkai kanan dan kotaknya terbuka di sisi kiri.
       */
      const wb = await berkasRekapTenderExcel(contoh());
      const ws = wb.getWorksheet('Perbandingan')!;
      const b = ws.getCell(1, 1).border;

      expect(b?.left?.style).toBe('medium');
      expect(b?.right?.style).toBe('medium');
    });

    it('menebalkan bingkai luar dan pemisah baris kepala', async () => {
      const wb = await berkasRekapTenderExcel(contoh());
      const ws = wb.getWorksheet('Perbandingan')!;

      expect(ws.getCell(1, 1).border?.top?.style).toBe('medium');
      expect(ws.getCell(2, 1).border?.left?.style).toBe('medium');
      expect(ws.getCell(5, 1).border?.top?.style).toBe('medium');
      expect(ws.getCell(5, 1).border?.bottom?.style).toBe('medium');
      expect(ws.getCell(ws.rowCount, 1).border?.bottom?.style).toBe('medium');
    });

    it('memberi warna nyata pada garisnya, bukan `auto`', async () => {
      /*
       * ExcelJS menulis `<color auto="1"/>` bila satu objek sisi dipakai
       * bersama beberapa sel — dan `auto` nyaris tak terlihat di sebagian
       * penampil. Garisnya terpasang, tetapi lembarnya tampil tanpa kotak.
       * Sudah pernah terjadi pada kisi kalender.
       */
      const wb = await berkasRekapTenderExcel(contoh());
      const ws = wb.getWorksheet('Perbandingan')!;
      const warna = (ws.getCell(6, 2).border?.top as any)?.color?.argb;
      expect(warna).toBeTruthy();
    });
  });

  describe('nilai yang dapat dihitung', () => {
    it('menulis tanggal sebagai Date, bukan teks', async () => {
      const wb = await berkasRekapTenderExcel(contoh());
      const ws = wb.getWorksheet('Perbandingan')!;
      const sel = ws.getCell(4, 2);

      expect(sel.value instanceof Date)
        .withContext('tanggal berupa teks tidak dapat diurutkan atau dihitung selisihnya')
        .toBe(true);
      expect(sel.numFmt).toBeTruthy();
    });

    it('mengembalikan teks aslinya bila tanggalnya tidak terbaca', async () => {
      const d = contoh();
      d.tanggal = 'belum ditentukan';
      const wb = await berkasRekapTenderExcel(d);
      const ws = wb.getWorksheet('Perbandingan')!;

      expect(ws.getCell(4, 2).value).toBe('belum ditentukan');
    });

    it('menulis PPN sebagai pecahan berformat persen, bukan teks "11%"', async () => {
      const wb = await berkasRekapTenderExcel(contoh());
      const ws = wb.getWorksheet('Perbandingan')!;

      // Baris ringkasan: 5 kepala + 1 barang + 1 pemisah + Subtotal, Pengiriman, PPN
      const barisPpn = 5 + 1 + 1 + 3;
      const sel = ws.getCell(barisPpn, 2);

      expect(ws.getCell(barisPpn, 1).value).toBe('PPN');
      expect(sel.value)
        .withContext('teks "11%" tidak dapat dikalikan; rumusnya menjawab #VALUE!')
        .toBe(0.11);
      expect(sel.numFmt).toBe('0%');
    });

    it('membedakan Non-PKP dari nol persen', async () => {
      const d = contoh(1);
      d.quotes[0].includePpn = false;
      const wb = await berkasRekapTenderExcel(d);
      const ws = wb.getWorksheet('Perbandingan')!;

      const barisPpn = 5 + 1 + 1 + 3;
      expect(ws.getCell(barisPpn, 2).value)
        .withContext('tidak memungut PPN dan memungut 0% adalah dua keadaan berbeda')
        .toBe('Non-PKP');
    });

    it('memberi format ribuan pada seluruh baris rupiah', async () => {
      const wb = await berkasRekapTenderExcel(contoh());
      const ws = wb.getWorksheet('Perbandingan')!;

      const tanpaFormat: string[] = [];
      for (let r = 6; r <= ws.rowCount; r++) {
        for (let c = 2; c <= 4; c++) {
          const sel = ws.getCell(r, c);
          if (typeof sel.value === 'number' && sel.value > 1000 && !sel.numFmt) {
            tanpaFormat.push(`${r}:${c}`);
          }
        }
      }

      expect(tanpaFormat)
        .withContext('angka ratusan juta tanpa pemisah ribuan tidak dapat dibaca sekilas')
        .toEqual([]);
    });
  });

  describe('yang membuatnya terbaca', () => {
    it('memberi kolom pemasok lebar yang cukup untuk ratusan juta', async () => {
      const d = contoh();
      const wb = await berkasRekapTenderExcel(d);
      const ws = wb.getWorksheet('Perbandingan')!;

      for (let c = 2; c <= d.quotes.length + 1; c++) {
        expect(ws.getColumn(c).width ?? 0)
          .withContext(`kolom ${c} terlalu sempit; Excel menampilkan #######`)
          .toBeGreaterThanOrEqual(22);
      }
    });

    it('memberi tinggi tetap pada baris keterangan yang dibungkus', async () => {
      /*
       * Tinggi otomatis tidak berlaku pada sel terbungkus yang datang dari
       * berkas — Excel baru menghitungnya saat selnya disunting tangan.
       * Tanpa tinggi yang disetel, keterangan tiga kalimat tampil sebagai
       * satu baris terpotong; padahal justru keterangan itulah yang paling
       * menentukan: uang muka 70%, BBM ditanggung siapa.
       */
      const wb = await berkasRekapTenderExcel(contoh());
      const ws = wb.getWorksheet('Perbandingan')!;

      let barisKeterangan = -1;
      for (let r = 1; r <= ws.rowCount; r++) {
        if (ws.getCell(r, 1).value === 'Keterangan') barisKeterangan = r;
      }

      expect(barisKeterangan).toBeGreaterThan(0);
      expect(ws.getRow(barisKeterangan).height ?? 0).toBeGreaterThanOrEqual(60);
      expect(ws.getCell(barisKeterangan, 2).alignment?.wrapText).toBe(true);
    });

    it('membekukan kolom nama dan seluruh blok kepala', async () => {
      const wb = await berkasRekapTenderExcel(contoh());
      const ws = wb.getWorksheet('Perbandingan')!;
      const v: any = ws.views[0];

      expect(v.state).toBe('frozen');
      expect(v.xSplit).toBe(1);
      expect(v.ySplit)
        .withContext('menggulir ke pemasok keenam tidak boleh menghilangkan nama barisnya')
        .toBe(5);
    });

    it('menggabungkan judul dan catatan selebar seluruh tabel', async () => {
      const d = contoh(4);
      const wb = await berkasRekapTenderExcel(d);
      const ws = wb.getWorksheet('Perbandingan')!;

      const gabungan = (ws as any).model?.merges ?? [];
      const lebarPenuh = `A1:${String.fromCharCode(64 + d.quotes.length + 1)}1`;
      expect(gabungan).toContain(lebarPenuh);
    });
  });

  describe('isinya tetap utuh', () => {
    it('menulis seluruh pemasok dan barisnya', async () => {
      const d = contoh(6);
      const wb = await berkasRekapTenderExcel(d);
      const ws = wb.getWorksheet('Perbandingan')!;

      for (let i = 0; i < 6; i++) {
        expect(ws.getCell(5, i + 2).value).toBe(`PT. Pemasok ${i + 1}`);
      }
      expect(String(ws.getCell(6, 1).value)).toContain('crawler crane');
    });

    it('BIAYA SEBENARNYA menyertakan biaya lain dan mengabaikan PPN', async () => {
      const wb = await berkasRekapTenderExcel(contoh(1));
      const ws = wb.getWorksheet('Perbandingan')!;

      let baris = -1;
      for (let r = 1; r <= ws.rowCount; r++) {
        if (ws.getCell(r, 1).value === 'BIAYA SEBENARNYA') baris = r;
      }

      expect(baris).toBeGreaterThan(0);
      expect(ws.getCell(baris, 2).value).toBe(119_000_000 + 40_000_000);
      expect(ws.getCell(baris, 2).font?.bold).toBe(true);
    });

    it('menutup lembar dengan catatan cara membacanya', async () => {
      const wb = await berkasRekapTenderExcel(contoh());
      const ws = wb.getWorksheet('Perbandingan')!;
      const akhir = String(ws.getCell(ws.rowCount, 1).value ?? '');

      expect(akhir).toContain('BIAYA SEBENARNYA');
    });
  });
});
