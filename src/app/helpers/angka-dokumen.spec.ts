/**
 * Penulisan angka pada dokumen purchase order.
 *
 * Dua aturan yang BERBEDA dengan sengaja:
 *
 *   NOMINAL  selalu dua desimal — "1.000.000,00"
 *   VOLUME   mengikuti angkanya — "10", tetapi "2,5" bila memang 2,5
 *
 * Sebelumnya keduanya melewati pemformat yang sama, dan pemformat itu
 * membulatkan ke rupiah penuh. Akibatnya dua-duanya salah pada satu dokumen:
 * PPN 11% tercetak bulat sehingga tidak pernah cocok dengan perkaliannya
 * sendiri, dan volume 2,5 m3 tercetak "3".
 */

import {
  angkaSatuan,
  rupiah,
  rupiahDokumen,
} from './purchase-order-shared.helper';

describe('nominal pada dokumen', () => {
  it('SELALU dua desimal, walau angkanya bulat', () => {
    /*
     * Kolom nominal yang sebagian barisnya berdesimal dan sebagian tidak
     * sulit dibandingkan sekilas — dan pada dokumen yang ditandatangani,
     * dibandingkan sekilas itulah yang terjadi.
     */
    expect(rupiahDokumen(1_000_000)).toBe('1.000.000,00');
    expect(rupiahDokumen(0)).toBe('0,00');
  });

  it('tidak lagi membulatkan PPN', () => {
    // 11% dari 1.234.567 = 135.802,37 — inilah yang dulu tercetak "135.802".
    expect(rupiahDokumen(1_234_567 * 0.11)).toBe('135.802,37');
  });

  it('membulatkan desimal ketiga, bukan memotongnya', () => {
    expect(rupiahDokumen(1.005)).toBe('1,01');
    expect(rupiahDokumen(1.004)).toBe('1,00');
  });

  it('nilai tak terbaca menjadi nol, bukan NaN', () => {
    // "NaN" yang tercetak pada dokumen yang mengikat vendor jauh lebih buruk
    // daripada nol yang jelas salah.
    expect(rupiahDokumen(null)).toBe('0,00');
    expect(rupiahDokumen(undefined)).toBe('0,00');
    expect(rupiahDokumen('bukan angka')).toBe('0,00');
  });

  it('nominal besar tetap memakai pemisah ribuan', () => {
    expect(rupiahDokumen(1_234_567_890.5)).toBe('1.234.567.890,50');
  });
});

describe('volume dan satuan', () => {
  it('angka bulat ditulis TANPA desimal', () => {
    // "10,00 set" terbaca seperti ketelitian yang tidak ada — dan pada satuan
    // seperti set atau unit, pecahan memang mustahil.
    expect(angkaSatuan(10)).toBe('10');
    expect(angkaSatuan(1)).toBe('1');
  });

  it('desimal yang memang ada tetap ditulis', () => {
    expect(angkaSatuan(2.5)).toBe('2,5');
    expect(angkaSatuan(0.25)).toBe('0,25');
  });

  it('tidak dibulatkan ke bilangan bulat', () => {
    // Inilah kekeliruan yang diperbaiki: volume 2,5 m3 tercetak "3" karena
    // melewati pemformat NOMINAL.
    expect(angkaSatuan(2.5)).not.toBe('3');
  });

  it('nilai tak terbaca menjadi nol', () => {
    expect(angkaSatuan(null)).toBe('0');
    expect(angkaSatuan('bukan angka')).toBe('0');
  });
});

describe('pemformat lama tetap ada untuk dokumen lain', () => {
  it('`rupiah()` masih tanpa desimal', () => {
    /*
     * Faktur penjualan, rekap tender, dan unduhan laporan proyek masih
     * memakainya. Diuji supaya perubahan pada dokumen purchase order tidak
     * diam-diam ikut mengubah ketiganya.
     */
    expect(rupiah(1_000_000)).toBe('1.000.000');
    expect(rupiah(1_234_567 * 0.11)).toBe('135.802');
  });
});

/**
 * Pemakaiannya pada dokumen yang sesungguhnya.
 *
 * Pengujian di atas menguji fungsinya; yang ini memastikan pembuat dokumen
 * BENAR-BENAR memanggilnya. Fungsi yang benar tetapi tidak dipanggil
 * menghasilkan dokumen yang persis sama seperti sebelumnya, dan tidak ada
 * satu pun pengujian yang gagal karenanya.
 */

import { buildPurchaseOrderDContent } from './purchase-order-d.helper';

function semuaTeks(simpul: any, keluar: string[] = []): string[] {
  if (simpul === null || simpul === undefined) return keluar;
  if (typeof simpul === 'string') {
    keluar.push(simpul);
    return keluar;
  }
  if (Array.isArray(simpul)) {
    simpul.forEach((x) => semuaTeks(x, keluar));
    return keluar;
  }
  if (typeof simpul === 'object') {
    Object.values(simpul).forEach((x) => semuaTeks(x, keluar));
  }
  return keluar;
}

describe('nominal pada dokumen SPK yang dirakit', () => {
  it('nominal upah tercetak dengan dua desimal', () => {
    const teks = semuaTeks(
      buildPurchaseOrderDContent({
        purchaseOrderName: '035-SPK-BPBP-D',
        projectName: 'BPBP',
        date: '2026-04-01',
        workerName: 'Budi',
        items: [{ label: 'Upah harian', amount: 150_000, unit: 'hari' }],
        clauseContext: {},
      } as any),
    );

    expect(teks.some((t) => t === '150.000,00')).toBeTrue();
    expect(teks.some((t) => t === '150.000')).toBeFalse();
  });
});
