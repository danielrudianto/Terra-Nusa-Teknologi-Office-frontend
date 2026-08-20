/**
 * Nilai baris: perkalian, atau jumlah yang DITULIS.
 *
 * Harga satuan tersimpan empat desimal, dan sebagian pekerjaan tidak pernah
 * bulat pada ketelitian itu: 7.000 liter seharga Rp 300.000 berarti
 * Rp 42,857142… per liter. Yang paling dekat yang dapat disimpan adalah
 * 42,8571 — menghasilkan Rp 299.999,70 pada dokumen yang ditandatangani.
 *
 * Menambah desimal tidak menyelesaikannya: 300.000 ÷ 7.000 pecahan berulang
 * yang tidak pernah habis. Yang menyelesaikan hanya menuliskan jumlahnya —
 * dan itu dibatasi, supaya tidak berubah menjadi pintu memasukkan angka yang
 * tidak ada hubungannya dengan volume dan harganya.
 */

import {
  TOLERANSI_PEMBULATAN,
  jumlahBaris,
  nilaiBaris,
  nilaiHitung,
  pembulatanSah,
} from './nilai-baris.helper';

const AIR = { quantity: 7000, price: 42.8571 };

describe('nilai baris', () => {
  it('tanpa jumlah tertulis, dihitung dari volume kali harga', () => {
    expect(nilaiBaris(AIR)).toBeCloseTo(299999.7, 2);
  });

  it('jumlah tertulis DIPAKAI apa adanya', () => {
    // Inilah keluhannya: yang diminta 300.000, bukan 299.999,70.
    expect(nilaiBaris({ ...AIR, amount: 300000 })).toBe(300000);
  });

  it('dokumen lama tidak berubah sedikit pun', () => {
    /*
     * Penjaga terpenting. Seluruh baris yang sudah ada tidak punya `amount`,
     * dan pencetakan ulangnya harus menghasilkan angka yang sama persis
     * dengan lembar yang sudah ditandatangani.
     */
    for (const kosong of [null, undefined, '']) {
      expect(nilaiBaris({ ...AIR, amount: kosong }))
        .withContext(String(kosong))
        .toBeCloseTo(nilaiHitung(AIR), 4);
    }
  });

  it('jumlah tertulis NOL tetap dipakai, bukan dianggap kosong', () => {
    // Baris bernilai nol memang mungkin — barang bonus, misalnya.
    expect(nilaiBaris({ quantity: 3, price: 1000, amount: 0 })).toBe(0);
  });

  it('nilai yang tidak terbaca jatuh ke nol, bukan NaN', () => {
    // NaN yang lolos ke dokumen tercetak sebagai "NaN" pada lembar yang
    // ditandatangani.
    expect(nilaiBaris({ quantity: 'x', price: 'y' })).toBe(0);
    expect(nilaiBaris({ quantity: 3, price: 1000, amount: 'x' })).toBe(0);
  });
});

describe('batas pembulatan', () => {
  it('selisih kecil diterima', () => {
    expect(pembulatanSah(300000, AIR)).toBeTrue();
  });

  it('selisih tepat di batas masih diterima', () => {
    const hitung = nilaiHitung(AIR);
    expect(pembulatanSah(hitung + TOLERANSI_PEMBULATAN, AIR)).toBeTrue();
    expect(pembulatanSah(hitung - TOLERANSI_PEMBULATAN, AIR)).toBeTrue();
  });

  it('selisih di luar batas DITOLAK', () => {
    /*
     * Tanpa batas ini, isian jumlah berubah menjadi pintu memasukkan angka
     * apa pun — dan dokumen dapat menyatakan nilai yang tidak ada
     * hubungannya dengan volume kali harganya. Yang membacanya mengalikan
     * keduanya, mendapat angka lain, lalu menanyakan mana yang benar.
     */
    const hitung = nilaiHitung(AIR);
    expect(pembulatanSah(hitung + TOLERANSI_PEMBULATAN + 0.01, AIR)).toBeFalse();
    expect(pembulatanSah(500000, AIR)).toBeFalse();
  });

  it('kosong selalu sah', () => {
    for (const kosong of [null, undefined, '']) {
      expect(pembulatanSah(kosong, AIR)).withContext(String(kosong)).toBeTrue();
    }
  });
});

describe('jumlah seluruh baris', () => {
  it('memakai aturan yang sama per baris', () => {
    const daftar = [
      { ...AIR, amount: 300000 },
      { quantity: 3, price: 180000 },
    ];
    expect(jumlahBaris(daftar)).toBe(840000);
  });

  it('daftar kosong bernilai nol', () => {
    expect(jumlahBaris([])).toBe(0);
    expect(jumlahBaris(undefined)).toBe(0);
  });
});
