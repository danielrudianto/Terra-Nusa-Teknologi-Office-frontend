import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * PPh WAJIB DIPUTUSKAN — bukan wajib dipotong.
 *
 * Sebelum ini isian PPh boleh dibiarkan kosong, dan keterangannya beralasan:
 * sebagian pekerja berpenghasilan di bawah batas dan memang tidak dipotong,
 * sehingga mewajibkan tarif membuat SPK yang benar tidak dapat diterbitkan.
 *
 * Alasan itu benar, tetapi akibatnya bukan "kadang kosong" melainkan
 * SELALU kosong: seluruh SPK upah operator terbit tanpa PPh sama sekali,
 * dan baru ketahuan ketika CoP-nya dicetak dan tidak memotong apa pun —
 * berbulan kemudian, pada dokumen yang sudah beredar.
 *
 * Jadi yang diwajibkan KEPUTUSANNYA, bukan angkanya. Salah satu dari dua
 * hal harus ada:
 *
 *   - sebuah kode PPh dipilih, atau
 *   - `tanpaPph` dicentang, yang menyatakan "memang tidak dipotong"
 *
 * `tanpaPph` sengaja TIDAK dikirim ke server dan tidak menjadi kolom: yang
 * tersimpan tetap kode kosong dan tarif nol, persis seperti sekarang. Yang
 * berubah hanya satu hal — ada orang yang menyatakannya.
 */
export function pphDiputuskan(): ValidatorFn {
  return (grup: AbstractControl): ValidationErrors | null => {
    const kode = String(grup.get('pphCode')?.value ?? '').trim();
    const tanpa = grup.get('tanpaPph')?.value === true;
    if (kode || tanpa) return null;
    return { pphBelumDiputuskan: true };
  };
}

/**
 * Tarif terpilih nol — perlu ditegaskan di layar.
 *
 * Nol dapat muncul dari dua jalan yang sama-sama tidak terlihat: kode yang
 * memang bertarif nol (mis. `21-100-35`, "Upah Pegawai Tidak Tetap yang
 * Dibayarkan secara Bulanan"), dan centang SKB yang memaksa tarifnya nol
 * apa pun kodenya. Keduanya tampil di layar persis seperti pilihan yang
 * memotong — "0% — <nama objek>" terbaca semeyakinkan "2,5% — <nama objek>".
 *
 * Inilah yang terjadi pada SPK operator: kodenya terisi, tarifnya nol, dan
 * tidak ada satu pun tanda sampai CoP-nya tercetak.
 */
export function tarifPphNol(grup: AbstractControl | null): boolean {
  if (!grup) return false;
  const kode = String(grup.get('pphCode')?.value ?? '').trim();
  if (!kode) return false;
  return Number(grup.get('pphPercentage')?.value) === 0;
}
