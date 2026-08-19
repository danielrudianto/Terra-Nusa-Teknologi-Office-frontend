/**
 * Arah nilai dokumen kontrak proyek: menambah atau mengurangi.
 *
 * Adendum yang mengurangi lingkup kerja bernilai NEGATIF — itu satu-satunya
 * cara mencatat pekerjaan yang dibatalkan sesudah kontraknya berjalan.
 *
 * Nilainya tidak lagi diketik sebagai minus. Angkanya selalu positif, dan
 * tandanya ditentukan pilihan berkartu. Sebabnya dua:
 *
 *   1. Minus yang diketik harus lolos dari mask pemisah ribuan, terbaca
 *      kembali saat dokumen dibuka, dan tetap benar ketika disunting ulang —
 *      tiga tempat yang masing-masing gagal tanpa suara. Percobaan
 *      sebelumnya, yang hanya melonggarkan validatornya, memang tidak jalan.
 *   2. Minus tidak menyatakan MAKSUD. "-25.000.000" pada layar tidak
 *      menyebutkan apa yang dikurangi.
 *
 * Diuji lewat FormGroup komponennya, bukan lewat komponen yang dirender:
 * merendernya menuntut rute, dialog, dan ApiService — dan yang diuji di sini
 * aturannya, bukan kerangka pengujiannya.
 */

import { FormControl, FormGroup } from '@angular/forms';

import {
  arahDariNilai,
  besaranDariNilai,
  nilaiBerarah,
} from '../../../constants/arah-nilai-kontrak';
import { ProjectViewComponent } from './project-view.component';

function komponen(): ProjectViewComponent {
  return new ProjectViewComponent(
    null as any,
    null as any,
    null as any,
    null as any,
    null as any,
    null as any,
  );
}

function formulir(): FormGroup {
  return komponen().formGroup as unknown as FormGroup;
}

describe('arah nilai kontrak', () => {
  describe('tanda yang dikirim ke server', () => {
    it('"menambah" mengirim nilai positif', () => {
      expect(nilaiBerarah(25_000_000, 'tambah')).toBe(25_000_000);
    });

    it('"mengurangi" mengirim nilai negatif', () => {
      expect(nilaiBerarah(25_000_000, 'kurang')).toBe(-25_000_000);
    });

    it('angka yang terlanjur negatif tidak membalik artinya', () => {
      /*
       * `Math.abs` dipakai dengan sengaja. Bila tandanya sekadar dibiarkan,
       * memilih "mengurangi" atas angka yang sudah minus justru menghasilkan
       * PENAMBAHAN — dan angkanya tampak benar di layar.
       */
      expect(nilaiBerarah(-25_000_000, 'kurang')).toBe(-25_000_000);
      expect(nilaiBerarah(-25_000_000, 'tambah')).toBe(25_000_000);
    });

    it('isian kosong menghasilkan nol, bukan NaN', () => {
      // NaN yang terkirim tersimpan sebagai nilai tak terduga tanpa galat.
      expect(nilaiBerarah(null, 'tambah')).toBe(0);
      expect(nilaiBerarah('', 'kurang')).toBe(0);
      expect(nilaiBerarah('bukan angka', 'tambah')).toBe(0);
    });
  });

  describe('membaca dokumen yang sudah tersimpan', () => {
    it('nilai negatif terbaca sebagai "mengurangi"', () => {
      expect(arahDariNilai(-25_000_000)).toBe('kurang');
      expect(besaranDariNilai(-25_000_000)).toBe(25_000_000);
    });

    it('nilai positif terbaca sebagai "menambah"', () => {
      expect(arahDariNilai(25_000_000)).toBe('tambah');
      expect(besaranDariNilai(25_000_000)).toBe(25_000_000);
    });
  });

  describe('aturan pada formulir', () => {
    it('adendum boleh mengurangi', () => {
      const f = formulir();
      f.patchValue({ documentType: 'adendum', arah: 'kurang', dpp: 25_000_000 });

      expect(f.get('arah')?.valid)
        .withContext('adendum mengurangi harus sah')
        .toBeTrue();
      expect(f.get('dpp')?.valid).toBeTrue();
    });

    it('SPK TIDAK boleh mengurangi', () => {
      // Dokumen pertama belum punya apa pun untuk dikurangi.
      const f = formulir();
      f.patchValue({ documentType: 'spk', arah: 'kurang', dpp: 25_000_000 });

      expect(f.get('arah')?.hasError('kurangHanyaAdendum')).toBeTrue();
    });

    it('galatnya hilang begitu jenisnya dipindah ke adendum', () => {
      const f = formulir();
      f.patchValue({ documentType: 'spk', arah: 'kurang', dpp: 1_000 });
      expect(f.get('arah')?.hasError('kurangHanyaAdendum')).toBeTrue();

      f.patchValue({ documentType: 'adendum' });
      expect(f.get('arah')?.hasError('kurangHanyaAdendum')).toBeFalse();
      expect(f.get('arah')?.valid).toBeTrue();
    });

    it('membersihkan galatnya TIDAK ikut menghapus `required`', () => {
      /*
       * Validator gabungan ini memasang galat pada kendali anaknya. Bila
       * pembersihannya memakai `setErrors(null)` begitu saja, `required`
       * kendali itu ikut terhapus — dan isian kosong lolos tanpa satu pun
       * tanda, yang jauh lebih sulit terlihat daripada tombol yang mati.
       */
      const f = formulir();
      f.patchValue({ documentType: 'adendum', arah: null });
      expect(f.get('arah')?.hasError('required')).toBeTrue();
    });

    it('besarannya tidak boleh negatif — minus tidak lagi diketik', () => {
      const f = formulir();
      f.patchValue({ documentType: 'adendum', arah: 'kurang', dpp: -1 });
      expect(f.get('dpp')?.hasError('min')).toBeTrue();
    });

    it('bawaannya "menambah"', () => {
      // Mengurangi selalu pilihan yang disengaja.
      expect(formulir().get('arah')?.value).toBe('tambah');
    });

    it('PPN tetap dibatasi nol sampai seratus', () => {
      const f = formulir();
      f.patchValue({ ppn: -1 });
      expect(f.get('ppn')?.hasError('min')).toBeTrue();
      f.patchValue({ ppn: 101 });
      expect(f.get('ppn')?.hasError('max')).toBeTrue();
    });
  });

  describe('angka turunan di layar', () => {
    it('ringkasan mengikuti arah, bukan besarannya saja', () => {
      /*
       * Bila turunannya dihitung dari besaran tanpa tanda, layar menunjukkan
       * PENAMBAHAN sementara yang tersimpan pengurangan — dan tidak ada yang
       * membandingkan keduanya sampai laporan margin terbit.
       */
      const c = komponen();
      c.formGroup.patchValue({
        documentType: 'adendum',
        arah: 'kurang',
        dpp: 10_000_000,
        ppn: 11,
      });

      expect(c.nilaiDpp).toBe(-10_000_000);
      expect(c.nilaiPpn).toBe(-1_100_000);
      expect(c.nilaiDokumen).toBe(-11_100_000);
    });
  });
});

/** Penjaga bagi penjaganya: bentuk formulirnya memang seperti yang diuji. */
describe('bentuk formulir kontrak', () => {
  it('memuat kendali arah beserta yang lain', () => {
    const f = formulir();
    for (const nama of ['documentType', 'arah', 'dpp', 'ppn', 'documentNumber']) {
      expect(f.get(nama)).withContext(nama).toEqual(jasmine.any(FormControl));
    }
  });
});
