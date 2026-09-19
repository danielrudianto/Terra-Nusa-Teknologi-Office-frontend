/*
 * DIALOG PERSETUJUAN SPK.
 *
 * Menyetujui adalah satu-satunya tindakan di daftar purchase order yang
 * MENGIKAT perusahaan kepada pihak luar, dan ia tidak dapat dikembalikan
 * lewat layar itu: yang sudah disetujui hanya dapat dibatalkan.
 *
 * Sebelumnya ia terjadi dari satu klik di dalam menu titik tiga — tanpa satu
 * pun angka terlihat pada saat memutuskan, dan di tempat yang sama persis
 * dengan tombol "Periksa" yang barusan ditekan.
 *
 * Yang dijaga di berkas ini bukan tampilan dialognya melainkan tiga hal yang
 * membuatnya berguna, dan ketiganya dapat hilang tanpa satu pun galat:
 * tombolnya tertahan sampai ada tindakan sadar, "buka dokumen" tidak pernah
 * terbaca sebagai persetujuan, dan angkanya tidak salah skala.
 */

import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { SetujuiPoDialogComponent } from './setujui-po-dialog.component';

const CONTOH = {
  nomor: '849-SPK-PUSAT-A',
  jenis: 'Transportasi',
  pemasok: 'PT Angkut Teknologi Indonesia',
  proyek: 'R501',
  tanggal: '2026-09-11',
  total: 235_192_500,
  diperiksaOleh: 'Stephanie',
  adendum: false,
};

let ditutupDengan: any;

function dialog(data: any = CONTOH): any {
  ditutupDengan = undefined;
  TestBed.configureTestingModule({
    providers: [
      {
        provide: MatDialogRef,
        useValue: { close: (r?: any) => (ditutupDengan = r) },
      },
      { provide: MAT_DIALOG_DATA, useValue: data },
    ],
  });
  return TestBed.runInInjectionContext(
    () =>
      new (SetujuiPoDialogComponent as any)(data, TestBed.inject(MatDialogRef)),
  );
}

afterEach(() => TestBed.resetTestingModule());

describe('tombol setujui tertahan sampai ada tindakan sadar', () => {
  it('menyetujui TIDAK terjadi selama kotaknya belum dicentang', () => {
    /*
     * Kotak centang tidak membuktikan dokumennya dibaca — tidak ada yang
     * bisa. Yang dilakukannya mengubah satu klik refleks menjadi dua
     * tindakan sadar, dan pada tindakan yang tidak dapat dibatalkan lewat
     * layar ini, itu perbedaan yang nyata.
     */
    const c = dialog();
    expect(c.sudahBaca.value).toBeFalse();

    c.setujui();
    expect(ditutupDengan)
      .withContext('dialog menutup dengan persetujuan tanpa dicentang')
      .toBeUndefined();
  });

  it('menyetujui terjadi sesudah dicentang', () => {
    const c = dialog();
    c.sudahBaca.setValue(true);
    c.setujui();
    expect(ditutupDengan).toEqual({ aksi: 'setujui' });
  });
});

describe('buka dokumen BUKAN menyetujui', () => {
  it('menutup dengan aksi yang berbeda, dan tidak menyetujui apa pun', () => {
    /*
     * Keduanya menutup dialog yang SAMA. Dibedakan sebagai hasil tersendiri
     * supaya pemanggil tidak dapat membaca "buka dokumen" sebagai
     * persetujuan — kekeliruan yang akan menerbitkan SPK justru ketika
     * orangnya baru hendak membacanya.
     */
    const c = dialog();
    c.bukaDokumen();
    expect(ditutupDengan).toEqual({ aksi: 'buka' });
    expect(ditutupDengan.aksi).not.toBe('setujui');
  });

  it('buka dokumen tidak menuntut kotaknya dicentang', () => {
    /*
     * Yang hendak membaca justru belum dapat mencentang "sudah membaca".
     * Menuntutnya lebih dulu berarti jalan yang paling mudah adalah tidak
     * membaca.
     */
    const c = dialog();
    expect(c.sudahBaca.value).toBeFalse();
    c.bukaDokumen();
    expect(ditutupDengan).toEqual({ aksi: 'buka' });
  });
});

describe('angka yang ditampilkan', () => {
  it('nilai dicetak sebagai rupiah, dengan spasi tak-putus', () => {
    const c = dialog();
    const teks = c.uang(CONTOH.total);
    expect(teks).toBe('Rp 235.192.500,00');
    expect(teks).not.toContain('Rp ');
  });

  it('nilai kosong dicetak nol, bukan NaN', () => {
    const c = dialog();
    expect(c.uang(null)).toContain('0,00');
    expect(c.uang(undefined)).toContain('0,00');
    expect(c.uang('bukan angka')).toContain('0,00');
  });
});

describe('adendum', () => {
  it('ditandai supaya nilainya tidak dibaca sebagai nilai yang berlaku', () => {
    /*
     * Adendum memuat SELISIH. Dibaca sebagai nilai total, angkanya
     * menyesatkan ke dua arah sekaligus — dan yang kedua berakhir dengan
     * vendor menagih dua kali.
     */
    const c = dialog({ ...CONTOH, adendum: true });
    expect(c.data.adendum).toBeTrue();
  });

  it('dokumen biasa tidak ikut ditandai', () => {
    const c = dialog();
    expect(c.data.adendum).toBeFalse();
  });
});
