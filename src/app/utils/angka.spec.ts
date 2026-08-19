/**
 * Pembulatan nilai rupiah.
 *
 * Semula dua desimal, dan itu cukup selama tarif pajaknya menghasilkan angka
 * bulat. Berhenti cukup sejak PPN 11%: menghitung mundur dari total faktur —
 * DPP = total ÷ 1,11 — hampir tidak pernah menghasilkan dua desimal.
 *
 * Yang dijaga di sini dua hal yang sama pentingnya: ketelitiannya cukup, dan
 * angka yang memang bulat tidak berubah tampilannya.
 */

import { DESIMAL_NILAI, nilaiUang } from './angka';

describe('nilaiUang', () => {
  it('menyimpan sampai empat desimal', () => {
    // 10.000.000 ÷ 1,11 — persis keadaan yang dikeluhkan.
    expect(nilaiUang(10_000_000 / 1.11)).toBe('9009009.009');
    expect(nilaiUang(1 / 3)).toBe('0.3333');
  });

  it('membulatkan desimal kelima, bukan memotongnya', () => {
    expect(nilaiUang(1.00005)).toBe('1.0001');
    expect(nilaiUang(1.00004)).toBe('1');
  });

  it('angka bulat tetap tertulis bulat', () => {
    /*
     * Inilah sebabnya `toFixed(4)` tidak dipakai langsung.
     *
     * `toFixed` selalu menuliskan empat desimal, sehingga nilai yang memang
     * bulat tercetak "1000.0000" — benar, tetapi terbaca seperti ketelitian
     * yang tidak ada, dan setiap nominal di layar ikut berubah tampilannya
     * padahal tidak ada yang berubah.
     */
    expect(nilaiUang(1000)).toBe('1000');
    expect(nilaiUang(1000.5)).toBe('1000.5');
    expect(nilaiUang(0)).toBe('0');
  });

  it('nilai yang tidak berhingga menjadi nol', () => {
    // Pembagian dengan nol pernah terjadi di layar ini. 'Infinity' yang masuk
    // ke isian jauh lebih sulit ditelusuri daripada nol.
    expect(nilaiUang(1 / 0)).toBe('0');
    expect(nilaiUang(NaN)).toBe('0');
    expect(nilaiUang(undefined)).toBe('0');
    expect(nilaiUang('bukan angka')).toBe('0');
  });

  it('teks berisi angka tetap terbaca', () => {
    // Kendali formulir menyimpan teks; `ngx-mask` pun mengembalikan teks.
    expect(nilaiUang('1234.56789')).toBe('1234.5679');
  });

  it('nominal besar tidak berubah menjadi notasi eksponen', () => {
    // Rupiah gampang mencapai belasan digit; "1.5e+10" pada isian nominal
    // tidak dapat dibaca maupun dikirim ulang.
    expect(nilaiUang(15_000_000_000)).toBe('15000000000');
    expect(nilaiUang(1_234_567_890.1234)).toBe('1234567890.1234');
  });

  it('batas desimalnya empat', () => {
    expect(DESIMAL_NILAI).toBe(4);
  });
});
