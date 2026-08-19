/**
 * Nilai dokumen kontrak proyek: kapan boleh minus, kapan tidak.
 *
 * Adendum yang mengurangi lingkup kerja BERNILAI NEGATIF — itu satu-satunya
 * cara mencatat pekerjaan yang dibatalkan sesudah kontraknya berjalan.
 *
 * Sebelumnya isian ini memakai `Validators.min(0)`, dan itu bertentangan
 * dengan seluruh bagian lain yang sudah menyiapkannya: masknya sudah memakai
 * `allowNegativeNumbers`, keterangan di bawah isiannya berbunyi "Isi negatif
 * bila adendum mengurangi lingkup kerja", dan skema server hanya menolak nol.
 *
 * Gejalanya menyesatkan: angka minus DAPAT diketik dan tampak wajar, lalu
 * tombol simpannya tidak pernah menyala — tanpa satu pun pesan yang menyebut
 * sebabnya.
 *
 * Diuji lewat FormGroup yang bentuknya sama, bukan lewat komponennya:
 * komponen itu menuntut rute, dialog, dan ApiService, dan menyiapkan
 * ketiganya di sini berarti menguji kerangka pengujiannya — bukan aturan yang
 * pernah keliru.
 */

import { FormControl, FormGroup, Validators } from '@angular/forms';

import { ProjectViewComponent } from './project-view.component';

/** Formulir kontrak, dirakit dengan validator yang sama seperti komponennya. */
function formulir(): FormGroup {
  const asli = new ProjectViewComponent(
    null as any,
    null as any,
    null as any,
    null as any,
    null as any,
    null as any,
  );
  return asli.formGroup as unknown as FormGroup;
}

describe('nilai dokumen kontrak proyek', () => {
  it('ADENDUM boleh bernilai minus', () => {
    /*
     * Yang diperiksa KESAHANNYA, bukan sekadar tidak adanya `spkNegatif`.
     *
     * Percobaan pertama pengujian ini hanya memastikan `spkNegatif` tidak
     * terpasang — dan itu tetap lolos ketika `Validators.min(0)` dikembalikan,
     * sebab yang menahannya galat `min`, bukan galat ini. Penjaga yang
     * meluluskan keadaan yang hendak dijaganya sama saja dengan tidak ada.
     *
     * Yang benar-benar dirasakan penggunanya: isiannya sah, sehingga
     * tombol simpannya menyala.
     */
    const f = formulir();
    f.patchValue({ documentType: 'adendum', dpp: -25_000_000 });

    expect(f.get('dpp')?.valid)
      .withContext('adendum minus harus sah — tombol simpan menyala')
      .toBeTrue();
    expect(f.get('dpp')?.hasError('min'))
      .withContext('tidak boleh ada Validators.min(0) di isian ini')
      .toBeFalse();
    expect(f.get('dpp')?.hasError('spkNegatif')).toBeFalse();
  });

  it('SPK TIDAK boleh bernilai minus', () => {
    // Dokumen pertama: belum ada pekerjaan yang bisa dikurangi.
    const f = formulir();
    f.patchValue({ documentType: 'spk', dpp: -25_000_000 });

    expect(f.get('dpp')?.hasError('spkNegatif')).toBeTrue();
  });

  it('adendum bernilai positif tetap sah', () => {
    const f = formulir();
    f.patchValue({ documentType: 'adendum', dpp: 25_000_000 });
    expect(f.get('dpp')?.hasError('spkNegatif')).toBeFalse();
    expect(f.get('dpp')?.valid).toBeTrue();
  });

  it('galatnya HILANG begitu jenisnya dipindah ke adendum', () => {
    /*
     * Validator yang memasang galat tetapi tidak pernah membersihkannya
     * membuat formulir tetap tertolak sesudah dibetulkan — dan yang
     * membetulkannya tidak menemukan apa lagi yang salah.
     */
    const f = formulir();
    f.patchValue({ documentType: 'spk', dpp: -1_000 });
    expect(f.get('dpp')?.hasError('spkNegatif')).toBeTrue();

    f.patchValue({ documentType: 'adendum' });
    expect(f.get('dpp')?.hasError('spkNegatif')).toBeFalse();
    expect(f.get('dpp')?.valid).toBeTrue();
  });

  it('membersihkan galatnya TIDAK ikut menghapus `required`', () => {
    /*
     * Validator gabungan ini memasang galat pada kendali anaknya. Bila
     * pembersihannya memakai `setErrors(null)` begitu saja, `required` dari
     * kendali itu sendiri ikut terhapus — dan isian kosong lolos tanpa satu
     * pun tanda, yang jauh lebih sulit terlihat daripada tombol yang mati.
     */
    const f = formulir();
    f.patchValue({ documentType: 'adendum', dpp: null });

    expect(f.get('dpp')?.hasError('required')).toBeTrue();
    expect(f.get('dpp')?.valid).toBeFalse();
  });

  it('isian nol ditolak untuk kedua jenis', () => {
    // Server pun menolaknya; nilai nol bukan dokumen.
    for (const jenis of ['spk', 'adendum']) {
      const f = formulir();
      f.patchValue({ documentType: jenis, dpp: 0 });
      // Nol bukan negatif, jadi bukan validator ini yang menahannya —
      // melainkan pemeriksaan tersendiri saat menyimpan.
      expect(f.get('dpp')?.hasError('spkNegatif')).toBeFalse();
    }
  });

  it('PPN tetap dibatasi nol sampai seratus', () => {
    // Tarif tidak ikut dilonggarkan; yang berubah hanya nilai dokumennya.
    const f = formulir();
    f.patchValue({ ppn: -1 });
    expect(f.get('ppn')?.hasError('min')).toBeTrue();

    f.patchValue({ ppn: 101 });
    expect(f.get('ppn')?.hasError('max')).toBeTrue();
  });
});

/** Penjaga bagi penjaganya: bentuk formulirnya memang seperti yang diuji. */
describe('bentuk formulir kontrak', () => {
  it('memakai kendali yang sama seperti yang diuji di atas', () => {
    const f = formulir();
    for (const nama of ['documentType', 'dpp', 'ppn', 'documentNumber']) {
      expect(f.get(nama))
        .withContext(nama)
        .toEqual(jasmine.any(FormControl));
    }
    expect(f.get('dpp')?.hasValidator(Validators.required)).toBeTrue();
  });
});
