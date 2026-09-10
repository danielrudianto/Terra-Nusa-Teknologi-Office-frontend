import { documentFonts } from '../constants/document-font.constant';
import {
  berkasRekapTender,
  DataRekap,
} from './tender-rekap.helper';

/**
 * Cetak PDF rekap tender benar-benar menghasilkan berkas.
 *
 * Dokumen perusahaan memakai Calibri, tetapi pdfmake hanya membawa Roboto.
 * Font tambahannya harus dikirim ke `createPdf(dd, layouts, fonts, vfs)`;
 * bila tidak, pdfmake melempar
 *
 *     Font 'Calibri' in style 'bold' is not defined
 *
 * saat MENYUSUN TATA LETAK — sebelum satu byte pun ditulis. Akibatnya tidak
 * ada berkas yang keluar dan tombolnya tampak tidak berfungsi; galatnya
 * hanya terlihat di konsol peramban.
 *
 * Karena itu yang diuji di sini bukan bentuk definisi dokumennya, melainkan
 * `getBuffer()` — satu-satunya cara membuktikan fontnya benar-benar termuat.
 */
describe('Rekap tender — PDF benar-benar tersusun', () => {
  const data: DataRekap = {
    nomor: 12,
    nama: 'Sewa crawler crane',
    proyek: 'R501',
    jenis: 'jasa',
    tanggal: '2026-09-01',
    uraian: 'Penyewaan crawler crane + operator',
    items: [
      { id: 1, name: 'Crawler crane 55 ton', specification: 'boom 34 m', quantity: 1, unit: 'bulan' },
    ],
    quotes: [
      {
        id: 1,
        supplierPrefix: 'PT.',
        supplierName: 'Recon Indonesia',
        paymentTerm: 'PPD',
        creditTerm: 3,
        includePpn: true,
        ppnPercentage: 11,
        deliveryMethod: 'franco',
        otherCost: 40000000,
        otherCostNote: 'Mobilisasi dan Demobilisasi',
        notes: 'Pelunasan setelah 200 jam',
        items: [{ tenderItemID: 1, price: 119000000 }],
      },
      {
        id: 2,
        supplierPrefix: 'PT.',
        supplierName: 'Indo Crane Pratama',
        paymentTerm: 'CASH',
        includePpn: true,
        ppnPercentage: 11,
        deliveryMethod: 'franco',
        otherCost: 55000000,
        items: [{ tenderItemID: 1, price: 103500000 }],
      },
    ],
  };

  it('menghasilkan berkas PDF, bukan galat font', (done) => {
    const pdf: any = berkasRekapTender(data);

    pdf.getBuffer((buffer: any) => {
      expect(buffer).toBeTruthy();
      expect(buffer.length).toBeGreaterThan(1000);
      done();
    });
  });

  it('Calibri punya berkas tersendiri untuk tebal', () => {
    // Galat aslinya menyebut style 'bold'. Mengarahkan bold ke berkas
    // regular akan membuat uji di atas lolos tetapi judul dan kepala tabel
    // tercetak tidak tebal — lolos, tetapi salah.
    const { fonts } = documentFonts({});

    expect(fonts.Calibri.normal).toBe('Calibri-Regular.ttf');
    expect(fonts.Calibri.bold).toBe('Calibri-Bold.ttf');
    expect(fonts.Calibri.bold).not.toBe(fonts.Calibri.normal);
  });
});
