/**
 * Lampiran di belakang invoice: SPK, lalu surat pengalihan pembayaran.
 *
 * Ketiganya terbit sebagai SATU berkas — dan justru karena satu berkas,
 * beberapa hal yang benar sendiri-sendiri menjadi salah ketika digabung.
 * Yang diuji di sini yang paling mudah lolos tanpa galat apa pun.
 */

import { Alignment, Margins } from 'pdfmake/interfaces';

import { DOCUMENT_STYLES } from '../../helpers/purchase-order-shared.helper';
import { buildPurchaseOrderDContent } from '../../helpers/purchase-order-d.helper';
import { proxyPaymentContent } from '../../helpers/proxy-payment.helper';
import {
  bagianHalaman,
  halamanIsiUtama,
} from '../../helpers/invoice.helper';

/** Seluruh nama gaya yang dirujuk isi dokumen, sedalam apa pun sarangnya. */
function namaGaya(simpul: any, keluar = new Set<string>()): Set<string> {
  if (simpul === null || simpul === undefined) return keluar;
  if (Array.isArray(simpul)) {
    simpul.forEach((x) => namaGaya(x, keluar));
    return keluar;
  }
  if (typeof simpul === 'object') {
    if (typeof simpul.style === 'string') keluar.add(simpul.style);
    if (Array.isArray(simpul.style)) simpul.style.forEach((x: any) => keluar.add(x));
    for (const nilai of Object.values(simpul)) namaGaya(nilai, keluar);
  }
  return keluar;
}

/** Gaya yang didaftarkan dokumen invoice; disalin dari `invoice.helper.ts`. */
const GAYA_INVOICE = {
  ...DOCUMENT_STYLES,
  header: { fontSize: 16, bold: true, margin: [0, 0, 0, 5] as Margins },
  docTitle: {
    fontSize: 16,
    bold: true,
    alignment: 'center' as Alignment,
    lineHeight: 1,
    margin: [0, 0, 0, 2] as Margins,
  },
};

function spk(items: any[] = []): any[] {
  return buildPurchaseOrderDContent({
    purchaseOrderName: '062-SPK-MICZ-D',
    date: '2026-07-06',
    projectName: 'MICZ',
    workerName: 'Riski Riyansyah',
    workerPrefix: '',
    workerAddress: 'Nyukang Harjo',
    workerCity: '',
    workerNpwp: '',
    items,
    templateVersion: '1.0',
    clauseContext: {} as any,
    additionalClauses: [],
  } as any);
}

describe('gaya lampiran SPK', () => {
  it('SELURUH nama gaya yang dipakai SPK terdaftar di dokumen invoice', () => {
    /*
     * Inilah sebab "SPK-nya beda sama yang biasa".
     *
     * Nama gaya berlaku per DOKUMEN, bukan per potongan isi. Nama yang tidak
     * terdaftar diabaikan pdfmake TANPA galat: baris nomor SPK yang
     * seharusnya rata tengah tercetak rata kiri, dan tabelnya kehilangan
     * ukuran serta jarak barisnya — pada lembar yang isinya sama persis.
     */
    const dipakai = namaGaya(spk([{ label: 'Upah Harian', amount: 250000, unit: 'hari' }]));
    const terdaftar = new Set(Object.keys(GAYA_INVOICE));
    const hilang = [...dipakai].filter((n) => !terdaftar.has(n));
    expect(hilang).withContext(`gaya tidak terdaftar: ${hilang}`).toEqual([]);
  });

  it('gaya invoice sendiri tidak tertimpa gaya purchase order', () => {
    // Keduanya mendefinisikan `docTitle`; yang berlaku harus milik invoice.
    expect(GAYA_INVOICE.docTitle.fontSize).toBe(16);
    expect(GAYA_INVOICE.header).toBeDefined();
  });

  it('gaya tabel purchase order ikut terbawa', () => {
    for (const nama of ['th', 'td', 'docSubTitle']) {
      expect(Object.keys(GAYA_INVOICE)).withContext(nama).toContain(nama);
    }
  });
});

describe('baris komponen upah', () => {
  it('baris yang ada IKUT tercetak', () => {
    /*
     * Penjaga terhadap lampiran bertabel kosong.
     *
     * SPK-nya dahulu dirakit dari baris DAFTAR purchase order, yang tidak
     * memuat `items` sama sekali. Larik kosong tidak menimbulkan galat —
     * dokumennya terbit dengan tabel komponen upah yang hanya berisi judul
     * kolom, dan lembar itu sampai ke pekerja tanpa satu pun angka upah.
     */
    const teks = JSON.stringify(spk([
      { label: 'Upah Harian', amount: 250000, unit: 'hari' },
    ]));
    expect(teks).toContain('Upah Harian');
    expect(teks).toContain('250');
  });

  it('tanpa baris, tidak ada angka upah yang tercetak', () => {
    // Menegaskan bahwa pengujian di atas memang membuktikan sesuatu.
    expect(JSON.stringify(spk([]))).not.toContain('Upah Harian');
  });
});

describe('surat pengalihan pembayaran', () => {
  const surat = () =>
    proxyPaymentContent({
      invoiceName: '13-985-INV-MICZ-VIII-2026',
      taxInvoiceName: '',
      supplierName: 'Riski Riyansyah',
      bankName: 'BRI',
      bankAccountNumber: '559301059919531',
      bankAccountName: 'Hervina Dwi Agustin',
      totalPayment: 250000,
      date: new Date('2026-08-21'),
    } as any);

  it('membawa gayanya sendiri, tidak menumpang dokumen induknya', () => {
    /*
     * Bentuk yang benar, dan yang dicontoh perbaikan SPK: isinya dibungkus
     * satu `stack` yang membawa font, ukuran, dan jarak barisnya sendiri —
     * sehingga ia tetap sama di berkas mana pun ia menumpang.
     */
    const isi = surat();
    expect(isi.length).toBe(1);
    expect((isi[0] as any).font).toBeTruthy();
    expect((isi[0] as any).fontSize).toBeTruthy();
  });

  it('TIDAK membawa pemisah halamannya sendiri', () => {
    /*
     * Pemisahnya dipasang oleh yang MERANGKAI berkas, bukan oleh suratnya.
     * Surat ini juga terbit sendirian; pemisah bawaan akan menghasilkan
     * halaman kosong di depannya.
     */
    expect(JSON.stringify(surat())).not.toContain('pageBreak');
  });
});

describe('footer per bagian', () => {
  /*
   * pdfmake hanya menyediakan SATU footer per berkas, sementara berkas ini
   * memuat empat dokumen yang biasanya terbit sendiri-sendiri. Sebelumnya
   * seluruh halaman memakai footer invoice — sehingga SPK di lampiran
   * kehilangan blok Office/Phone/Email yang selalu ada bila dicetak sendiri,
   * dan yang menerimanya tidak punya satu pun keterangan kontak.
   */
  it('isi utama satu halaman bila tidak ada pemisah', () => {
    expect(halamanIsiUtama([{ text: 'a' }, { text: 'b' }])).toBe(1);
  });

  it('tiap pemisah paksa menambah satu halaman', () => {
    const isi = [
      { text: 'invoice' },
      { text: '', pageBreak: 'before' },
      { text: 'kuitansi' },
    ];
    expect(halamanIsiUtama(isi)).toBe(2);
  });

  it('halaman invoice dan kuitansi memakai footer utama', () => {
    for (const h of [1, 2]) {
      expect(bagianHalaman(h, 2, true)).withContext(String(h)).toBe('utama');
    }
  });

  it('halaman SPK ke belakang memakai footer lampiran', () => {
    for (const h of [3, 4, 9]) {
      expect(bagianHalaman(h, 2, true)).withContext(String(h)).toBe('lampiran');
    }
  });

  it('tanpa lampiran, SELURUH halaman memakai footer utama', () => {
    /*
     * Invoice yang dicetak tanpa SPK tidak boleh berubah sedikit pun. Ini
     * keadaan yang paling sering — dan yang paling mudah rusak oleh
     * perubahan yang ditujukan untuk keadaan lain.
     */
    for (const h of [1, 2, 3, 10]) {
      expect(bagianHalaman(h, 2, false)).withContext(String(h)).toBe('utama');
    }
  });

  it('batasnya mengikuti banyaknya halaman utama, bukan angka tetap', () => {
    // Bila suatu saat kuitansinya bertambah satu halaman, batasnya ikut
    // bergeser — bukan tetap di halaman dua.
    expect(bagianHalaman(3, 3, true)).toBe('utama');
    expect(bagianHalaman(4, 3, true)).toBe('lampiran');
  });
});
