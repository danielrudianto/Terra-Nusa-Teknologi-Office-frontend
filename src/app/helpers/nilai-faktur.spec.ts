import {
  nilaiDibayarkan,
  nilaiTagihan,
  sisaFaktur,
} from './nilai-faktur.helper';
import {
  nilaiPurchaseOrder,
  poSudahSah,
} from './purchase-order-shared.helper';

/*
 * Satu dokumen, satu nilai.
 *
 * Dua rumus di bawah masing-masing pernah ditulis ulang di beberapa layar,
 * dan salinannya berselisih pada satu suku — cukup untuk membuat dua layar
 * menyebut angka berbeda atas dokumen yang sama, dan tidak cukup untuk
 * membuat siapa pun curiga.
 */

describe('nilai faktur penjualan', () => {
  const FAKTUR = {
    dpp: 1_000_000_000,
    ppn: 11,
    pphPercentage: 1.75,
    bpjs: 2_500_000,
  };

  it('yang ditagihkan adalah DPP + PPN', () => {
    expect(nilaiTagihan(FAKTUR)).toBe(1_110_000_000);
  });

  it('yang masuk ke rekening sudah dipotong PPh DAN BPJS', () => {
    /*
     * BPJS-nya yang menentukan.
     *
     * Dialog catat pembayaran dulu memakai `DPP + PPN − PPh` saja. Klien
     * mentransfer 1.090.000.000 — jumlah yang benar — server menandainya
     * LUNAS, dan dialognya masih menampilkan "Sisa Rp 2.500.000" tanpa satu
     * pun baris yang menerangkan dari mana angka itu.
     */
    expect(nilaiDibayarkan(FAKTUR)).toBe(1_090_000_000);
    expect(nilaiDibayarkan(FAKTUR)).not.toBe(1_092_500_000);
  });

  it('sisa menjadi nol ketika yang ditransfer sudah masuk seluruhnya', () => {
    expect(sisaFaktur(FAKTUR, 1_090_000_000)).toBe(0);
  });

  it('kolom kosong dibaca nol, bukan NaN', () => {
    expect(nilaiDibayarkan({ dpp: 100 })).toBe(100);
    expect(nilaiDibayarkan({})).toBe(0);
    expect(nilaiDibayarkan({ dpp: '1000' as any, ppn: '11' as any })).toBe(1110);
  });
});

describe('nilai dan keadaan purchase order', () => {
  it('biaya lain ikut dihitung', () => {
    /*
     * Purchase order penutupan asuransi (6.4.2): hampir seluruh nilainya ada
     * di `otherValue`. Tanpa suku itu, dokumen bernilai Rp 5.002.109 terbaca
     * Rp 35.000 — dan itulah yang tampil pada dialog ringkas PO di layar
     * pembelian, di sebelah pagu "sisa PO" yang menyebut angka yang benar.
     */
    expect(
      nilaiPurchaseOrder({ dpp: 35_000, ppn: 0, otherValue: 4_967_109 }),
    ).toBe(5_002_109);
  });

  it('PPN dihitung dari DPP, dan tarif kosong dibaca nol', () => {
    expect(nilaiPurchaseOrder({ dpp: 1_000_000, ppn: 11 })).toBe(1_110_000);
    expect(nilaiPurchaseOrder({ dpp: 1_000_000 })).toBe(1_000_000);
  });

  it('dokumen lama yang sah lewat `status` tetap terbaca disetujui', () => {
    // Sebagian dokumen tersimpan `status: "approved"` sementara `isApproved`
    // masih false. Memeriksa satu sumber saja menyebut dokumen yang sudah
    // ditandatangani sebagai draf.
    expect(poSudahSah(true, 'draft')).toBeTrue();
    expect(poSudahSah(false, 'approved')).toBeTrue();
    expect(poSudahSah(false, 'APPROVED')).toBeTrue();
    expect(poSudahSah(false, 'draft')).toBeFalse();
    expect(poSudahSah(undefined, undefined)).toBeFalse();
  });
});
