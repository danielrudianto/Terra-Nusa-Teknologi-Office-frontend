/**
 * Menandai "sudah diperiksa" menuntut dokumennya dibuka lebih dulu.
 *
 * Sebelumnya "Periksa" satu butir menu yang langsung menandai. Dokumennya
 * tidak pernah terbuka — dan tanda itulah yang membuka tombol Setujui,
 * sehingga tahap yang seharusnya menghadirkan mata kedua dapat dilewati
 * tanpa satu pun mata melihatnya.
 *
 * Tiga syarat menahan tombol konfirmasinya. Tidak satu pun membuktikan
 * dokumennya benar-benar dibaca — yang dapat dilakukan sebuah layar hanya
 * menghapus kemungkinan menandainya TANPA membukanya sama sekali.
 *
 * Yang diuji di sini aturan gerbangnya, bukan penampil PDF-nya: merender
 * penampilnya menuntut berkas sungguhan dan pekerja latar, sementara yang
 * menentukan benar-tidaknya justru kapan tombolnya terbuka.
 */

import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import {
  JEDA_PERIKSA_DETIK,
  PurchaseOrderPeriksaComponent,
} from './purchase-order-periksa/purchase-order-periksa.component';

let ditutupDengan: any;

function komponen(): any {
  ditutupDengan = undefined;
  TestBed.configureTestingModule({
    providers: [
      {
        provide: MAT_DIALOG_DATA,
        useValue: { sumber: 'data:application/pdf;base64,AAA', nomor: 'PO-001' },
      },
      {
        provide: MatDialogRef,
        useValue: { close: (v: any) => (ditutupDengan = v) },
      },
    ],
  });
  return TestBed.runInInjectionContext(
    () =>
      new (PurchaseOrderPeriksaComponent as any)(
        TestBed.inject(MAT_DIALOG_DATA),
        TestBed.inject(MatDialogRef),
      ),
  );
}

afterEach(() => TestBed.resetTestingModule());

/** Anggap jedanya sudah lewat, tanpa benar-benar menunggu. */
function lewatiJeda(c: any): void {
  c.sisaDetik.set(0);
}

describe('gerbang pemeriksaan dokumen', () => {
  it('tertutup begitu dialognya terbuka', () => {
    const c = komponen();
    expect(c.bolehKonfirmasi()).toBeFalse();
  });

  describe('jeda terpendek', () => {
    it('menahan walaupun dua syarat lain sudah terpenuhi', () => {
      const c = komponen();
      c.halamanSiap({ pagesCount: 1 });
      c.ubahPernyataan(true);

      expect(c.menungguWaktu()).toBeTrue();
      expect(c.bolehKonfirmasi())
        .withContext('jeda belum lewat, tombolnya harus tetap tertutup')
        .toBeFalse();
    });

    it('jedanya berjalan mundur dan berhenti di nol', () => {
      const c = komponen();
      expect(c.sisaDetik()).toBe(JEDA_PERIKSA_DETIK);
      lewatiJeda(c);
      expect(c.menungguWaktu()).toBeFalse();
    });
  });

  describe('gulir sampai bawah', () => {
    it('menahan selama halaman terakhir belum tercapai', () => {
      const c = komponen();
      lewatiJeda(c);
      c.halamanSiap({ pagesCount: 4 });
      c.ubahPernyataan(true);

      expect(c.sudahSampaiBawah()).toBeFalse();
      expect(c.bolehKonfirmasi()).toBeFalse();
      expect(c.sisaHalaman()).toBe(3);
    });

    it('terbuka setelah halaman terakhir tercapai', () => {
      const c = komponen();
      lewatiJeda(c);
      c.halamanSiap({ pagesCount: 4 });
      c.halamanBerpindah(4);
      c.ubahPernyataan(true);

      expect(c.bolehKonfirmasi()).toBeTrue();
    });

    it('menggulir kembali ke atas TIDAK membatalkannya', () => {
      /*
       * Yang disimpan halaman TERJAUH, bukan halaman berjalan. Kalau yang
       * dipakai halaman berjalan, syaratnya batal begitu orangnya menggulir
       * kembali untuk memastikan sesuatu — justru perbuatan yang paling
       * ingin didorong.
       */
      const c = komponen();
      lewatiJeda(c);
      c.halamanSiap({ pagesCount: 4 });
      c.halamanBerpindah(4);
      c.halamanBerpindah(1);
      c.ubahPernyataan(true);

      expect(c.bolehKonfirmasi()).toBeTrue();
    });

    it('dokumen satu halaman langsung memenuhinya', () => {
      /*
       * Dokumen berhalaman satu tidak pernah memicu perubahan halaman;
       * yang memenuhinya bawaan `halamanTerjauh` yang bernilai satu.
       *
       * Bawaan nol akan menutup gerbangnya SELAMANYA pada dokumen yang
       * justru paling sering diperiksa — dan tidak ada galat apa pun yang
       * memberitahunya, hanya tombol yang tidak kunjung hidup.
       */
      const c = komponen();
      lewatiJeda(c);
      c.halamanSiap({ pagesCount: 1 });

      expect(c.sudahSampaiBawah()).toBeTrue();
    });

    it('sebelum dokumennya termuat, dianggap belum sampai bawah', () => {
      // Nol halaman berarti belum ada apa pun untuk dilewati; menganggapnya
      // "selesai" membuat gerbangnya terbuka atas dokumen yang gagal dimuat.
      const c = komponen();
      lewatiJeda(c);
      c.ubahPernyataan(true);

      expect(c.jumlahHalaman()).toBe(0);
      expect(c.bolehKonfirmasi()).toBeFalse();
    });
  });

  describe('pernyataan', () => {
    it('menahan selama belum dicentang', () => {
      const c = komponen();
      lewatiJeda(c);
      c.halamanSiap({ pagesCount: 1 });

      expect(c.bolehKonfirmasi()).toBeFalse();
    });

    it('mencabut centangnya menutup kembali gerbangnya', () => {
      const c = komponen();
      lewatiJeda(c);
      c.halamanSiap({ pagesCount: 1 });
      c.ubahPernyataan(true);
      expect(c.bolehKonfirmasi()).toBeTrue();

      c.ubahPernyataan(false);
      expect(c.bolehKonfirmasi()).toBeFalse();
    });
  });

  describe('keluar dari dialognya', () => {
    it('konfirmasi menutup dengan `true`', () => {
      const c = komponen();
      lewatiJeda(c);
      c.halamanSiap({ pagesCount: 1 });
      c.ubahPernyataan(true);
      c.konfirmasi();

      expect(ditutupDengan).toBeTrue();
    });

    it('konfirmasi yang dipaksa saat gerbangnya tertutup TIDAK menutup', () => {
      /*
       * Dijaga di dalam `konfirmasi()`, bukan hanya lewat `[disabled]`:
       * tombol yang mati masih dapat ditekan lewat papan ketik pada sebagian
       * peramban, dan penandaannya akan terkirim tanpa satu pun syarat
       * terpenuhi.
       */
      const c = komponen();
      c.konfirmasi();

      expect(ditutupDengan).toBeUndefined();
    });

    it('batal menutup dengan `false`, bukan tanpa nilai', () => {
      // Yang membukanya membedakan "dibatalkan" dari "dikonfirmasi" lewat
      // nilai ini; tanpa nilai, keduanya sama-sama palsu dan tidak apa-apa —
      // tetapi menyebutnya tegas membuat maksudnya terbaca.
      const c = komponen();
      c.batal();

      expect(ditutupDengan).toBeFalse();
    });
  });
});
