/**
 * Usulan kode objek PPh.
 *
 * Salah kode tidak menghasilkan galat apa pun: dokumennya terbit, potongannya
 * dihitung dengan tarif yang keliru, dan baru ketahuan saat pelaporan —
 * ketika pembayarannya sudah berjalan. Karena itu yang dijaga di sini bukan
 * tampilannya, melainkan bahwa kode yang diusulkan memang ADA dan memang
 * kode yang dimaksud.
 */

import { availablePPh } from '../utils/pph';
import { USULAN_PPH, usulanPPhUntuk } from './usulan-pph';

const KATALOG = new Map(availablePPh.map((p) => [p.code, p]));

describe('usulan PPh', () => {
  it('setiap kode yang diusulkan ada di katalognya', () => {
    /*
     * Pemilihnya melewati kode yang tidak ditemukan supaya tidak menggagalkan
     * seluruh dialog. Yang mengisi karena itu kehilangan usulan tanpa pernah
     * tahu bahwa dahulu ada.
     */
    const hilang: string[] = [];
    for (const [jenis, daftar] of Object.entries(USULAN_PPH)) {
      for (const u of daftar) {
        if (!KATALOG.has(u.code)) hilang.push(`${jenis}: ${u.code}`);
      }
    }
    expect(hilang).toEqual([]);
  });

  it('tiap usulan menyertakan alasannya', () => {
    // Tanpa alasan, usulan hanya memindahkan kode ke atas tanpa memberi
    // dasar untuk memilihnya — dan yang memilih di lapangan bukan orang
    // perpajakan.
    for (const daftar of Object.values(USULAN_PPH)) {
      for (const u of daftar) {
        expect(u.alasan.trim().length).toBeGreaterThan(10);
      }
    }
  });

  it('tidak ada kode yang diusulkan dua kali untuk satu jenis', () => {
    for (const [jenis, daftar] of Object.entries(USULAN_PPH)) {
      const kode = daftar.map((u) => u.code);
      expect(new Set(kode).size).withContext(jenis).toBe(kode.length);
    }
  });

  it('jenis yang tidak dipetakan menghasilkan daftar kosong, bukan galat', () => {
    // Lebih baik tanpa usulan daripada usulan yang salah.
    expect(usulanPPhUntuk('ZZZ')).toEqual([]);
    expect(usulanPPhUntuk(null)).toEqual([]);
    expect(usulanPPhUntuk(undefined)).toEqual([]);
  });

  /*
   * SPK tenaga kerja (PO-D) dan faktur atasnya.
   *
   * Fakturnya menagihkan pekerjaan pada SPK yang sama. Bila keduanya
   * menawarkan pasangan kode yang berbeda, bukti potong tidak cocok dengan
   * dokumennya — dan itu baru ketahuan saat pelaporan.
   *
   * Dulu keduanya ditulis terpisah dan isinya memang sempat berbeda; kini
   * daftar faktur DITURUNKAN dari usulan ini. Pengujian di bawah menjaga isi
   * usulannya, sehingga keduanya tidak dapat bergeser diam-diam.
   */
  describe('PO-D — tenaga kerja', () => {
    const kode = usulanPPhUntuk('D').map((u) => u.code);

    it('menawarkan dua kode yang disepakati', () => {
      expect(kode).toEqual(['21-100-35', '21-100-20']);
    });

    it('keduanya PPh 21, bukan PPh 23', () => {
      // Yang dibayar orang perseorangan, bukan badan usaha.
      for (const k of kode) {
        expect(KATALOG.get(k)!.type).withContext(k).toBe('PPh 21');
      }
    });
  });

  /*
   * PO-B — sewa alat.
   *
   * Alat berat termasuk "harta selain tanah dan bangunan", sehingga
   * pemotongannya PPh 23 atas sewa harta — BUKAN PPh 21.
   *
   * Bedanya satu digit pada kodenya: `24-100-02` sewa harta, sedangkan
   * `21-100-02` penerima pensiun. Keduanya kode yang sah, dan memilih yang
   * keliru tidak menimbulkan galat apa pun.
   */
  describe('PO-B — sewa alat', () => {
    it('usulan teratasnya sewa harta, PPh 23', () => {
      const teratas = usulanPPhUntuk('B')[0];
      expect(teratas.code).toBe('24-100-02');
      expect(KATALOG.get(teratas.code)!.type).toBe('PPh 23');
      expect(KATALOG.get(teratas.code)!.taxObjectName.toLowerCase()).toContain(
        'sewa',
      );
    });

    it('tidak mengusulkan kode penerima pensiun', () => {
      // Penjaga terhadap salah ketik `21-` alih-alih `24-`.
      expect(usulanPPhUntuk('B').map((u) => u.code)).not.toContain('21-100-02');
    });
  });

  /*
   * FAKTUR PENJUALAN & KONTRAK PROYEK.
   *
   * Keduanya diturunkan dari daftar konstruksi yang sama. Menawarkan pasangan
   * kode berbeda di dua layar membuat bukti potong tidak cocok dengan
   * dokumennya — pengujian ini menjaga keduanya tetap identik dan tetap
   * PPh 4(2).
   */
  describe('konstruksi — faktur penjualan & kontrak proyek', () => {
    const KODE = ['28-409-25', '28-409-24', '28-409-23', '28-409-22'];

    it('faktur dan kontrak menawarkan empat kode yang sama', () => {
      expect(usulanPPhUntuk('SALES').map((u) => u.code)).toEqual(KODE);
      expect(usulanPPhUntuk('CONTRACT').map((u) => u.code)).toEqual(KODE);
    });

    it('keempatnya PPh 4(2)', () => {
      for (const k of KODE) {
        expect(KATALOG.get(k)!.type).withContext(k).toBe('PPh 4(2)');
      }
    });
  });
});
