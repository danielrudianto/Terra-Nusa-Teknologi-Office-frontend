import { Validators, ValidatorFn } from '@angular/forms';

/**
 * Validator VOLUME yang menghormati adendum "kerja kurang".
 *
 * MENGAPA BEDA SAAT ADENDUM
 *
 * Adendum berisi SELISIH terhadap dokumen induk. Pekerjaan bisa BERTAMBAH
 * (selisih positif) maupun BERKURANG (selisih negatif) — "kerja kurang".
 * Di luar adendum, volume negatif tidak punya arti: sebuah pembelian tidak
 * memesan minus sepuluh sak semen.
 *
 * Karena itu:
 *   - Pembuatan/penyuntingan biasa: wajib, minimal `minimalBiasa` (mis. 0,01
 *     atau 1) — tetap menolak nol dan negatif seperti sebelumnya.
 *   - Adendum: wajib, tetapi BOLEH negatif. Batas pengurangan — agar tidak
 *     melebihi sisa volume induk — dijaga SERVER (`periksa_pengurangan`),
 *     bukan di sini; layar tidak tahu sisa induk seluruh adendum sebelumnya.
 *
 * Satu tempat, dipakai seluruh formulir, supaya "kerja kurang" tidak jalan
 * di satu jenis PO dan tertolak di jenis lain tanpa alasan yang terlihat.
 */
export function volumeValidators(
  isAdendum: boolean,
  minimalBiasa = 0.01,
): ValidatorFn[] {
  if (isAdendum) return [Validators.required];
  return [Validators.required, Validators.min(minimalBiasa)];
}
