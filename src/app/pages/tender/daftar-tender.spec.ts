/**
 * Daftar tender: perilakunya disamakan dengan daftar Pembelian dan
 * Reimbursement.
 *
 * Ketiganya dibuka orang yang sama dalam satu hari, dan sebelumnya yang ini
 * berbeda dalam tiga hal yang semuanya terasa sebagai kerusakan kecil:
 *
 *   1. banyak baris per halaman DIPATOK sepuluh, tidak mengikuti pengaturan
 *      pengguna — yang menyetel daftar lain menjadi lima puluh mendapati
 *      daftar ini tetap sepuluh tanpa sebab yang terlihat;
 *   2. judul kolomnya tidak dapat ditekan untuk mengurutkan;
 *   3. keadaan daftarnya tidak tersimpan di alamat, sehingga menekan
 *      segarkan atau membagikan tautannya mengembalikan semuanya ke awal.
 */

import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';

import { SettingsService } from '../../services/setting.service';
import { TenderService } from '../../services/tender.service';
import { TenderListComponent } from './tender-list/tender-list.component';

/** Parameter terakhir yang dikirim ke server. */
let terkirim: any;
/** Query param terakhir yang ditulis ke alamat. */
let alamat: any;

function komponen(queryParams: any = {}, pageSize = 25): any {
  terkirim = undefined;
  alamat = undefined;

  TestBed.configureTestingModule({
    providers: [
      {
        provide: TenderService,
        useValue: {
          daftar: (p: any) => {
            terkirim = p;
            return { subscribe: () => ({ add: () => {} }) };
          },
        },
      },
      {
        provide: Router,
        useValue: {
          navigate: (_: any[], opsi?: any) => {
            if (opsi?.queryParams) alamat = opsi.queryParams;
          },
        },
      },
      { provide: ActivatedRoute, useValue: { snapshot: { queryParams } } },
      { provide: MatSnackBar, useValue: { open: () => {} } },
      { provide: TranslateService, useValue: { instant: (k: string) => k } },
      { provide: SettingsService, useValue: { pageSize } },
    ],
  });

  const c: any = TestBed.runInInjectionContext(
    () => new (TenderListComponent as any)(),
  );

  /*
   * `ngOnInit` dipanggil sendiri.
   *
   * Merakit komponennya langsung TIDAK memicu kait daur hidupnya — dan di
   * situlah keadaan daftar dibaca dari alamatnya. Tanpa panggilan ini,
   * seluruh pengujian alamat gagal karena hal yang bukan aturannya.
   */
  c.ngOnInit();
  return c;
}

afterEach(() => TestBed.resetTestingModule());

describe('daftar tender', () => {
  describe('banyak baris per halaman', () => {
    it('mengikuti pengaturan pengguna, bukan dipatok sepuluh', () => {
      expect(komponen({}, 50).pageSize).toBe(50);
    });

    it('alamat menang atas pengaturan', () => {
      // Tautan yang dibagikan membawa halaman DAN ukurannya; mengabaikannya
      // membuat penerimanya melihat kumpulan baris yang lain.
      expect(komponen({ pageSize: '100' }, 25).pageSize).toBe(100);
    });
  });

  describe('keadaan daftar dibaca dari alamat', () => {
    it('halaman, urutan, saringan, dan pencarian ikut terbaca', () => {
      const c = komponen({
        page: '3',
        sortBy: 'name',
        sortByDirection: 'asc',
        status: 'selesai',
        cari: 'beton',
      });
      expect(c.page).toBe(3);
      expect(c.sortBy).toBe('name');
      expect(c.sortByDirection).toBe('asc');
      expect(c.saring).toBe('selesai');
      expect(c.pencarian.value).toBe('beton');
    });

    it('tanpa alamat, urutannya tetap seperti sebelum kolom dapat ditekan', () => {
      /*
       * Bawaan yang berbeda membuat daftar yang dibuka tanpa menyentuh apa
       * pun berubah susunannya, dan yang membukanya menyangka datanya
       * bergeser.
       */
      const c = komponen();
      expect(c.sortBy).toBe('createdAt');
      expect(c.sortByDirection).toBe('desc');
    });

    it('saringan kosong pada alamat berarti "semua", bukan diabaikan', () => {
      // Bawaannya "berjalan"; tanpa penanganan ini, tautan yang sengaja
      // dibuat tanpa saringan tetap menampilkan yang berjalan saja.
      expect(komponen({ status: '' }).saring).toBe('');
    });
  });

  describe('pengurutan', () => {
    it('kolom baru dimulai menaik', () => {
      const c = komponen();
      c.urutkan('name');
      expect(c.sortBy).toBe('name');
      expect(c.sortByDirection).toBe('asc');
    });

    it('kolom yang sama ditekan lagi membalik arahnya', () => {
      const c = komponen();
      c.urutkan('name');
      c.urutkan('name');
      expect(c.sortByDirection).toBe('desc');
    });

    it('mengurutkan kembali ke halaman pertama', () => {
      /*
       * Halaman ketiga dari urutan lama tidak punya padanan pada urutan
       * baru; membiarkannya membuat yang tampil sesudahnya baris yang sama
       * sekali lain.
       */
      const c = komponen({ page: '3' });
      c.urutkan('name');
      expect(c.page).toBe(1);
    });

    it('urutannya ikut dikirim ke server', () => {
      const c = komponen();
      c.urutkan('projectName');
      expect(terkirim.sortBy).toBe('projectName');
      expect(terkirim.sortByDirection).toBe('asc');
    });
  });

  describe('ganti halaman', () => {
    it('pindah halaman memakai nomor barunya', () => {
      const c = komponen();
      c.gantiHalaman({ pageIndex: 2, pageSize: c.pageSize });
      expect(terkirim.page).toBe(3);
    });

    it('mengubah banyak baris kembali ke halaman pertama', () => {
      const c = komponen({ page: '4' });
      c.gantiHalaman({ pageIndex: 3, pageSize: 100 });
      expect(c.pageSize).toBe(100);
      expect(terkirim.page).toBe(1);
    });
  });

  describe('keadaan ditulis kembali ke alamat', () => {
    it('setiap pemuatan menyimpan keadaannya', () => {
      const c = komponen();
      c.urutkan('status');
      expect(alamat.sortBy).toBe('status');
      expect(alamat.page).toBe(1);
      expect(alamat.pageSize).toBe(c.pageSize);
    });

    it('saringan dan pencarian yang kosong TIDAK ikut ditulis', () => {
      // `status=` dan `cari=` yang kosong hanya memanjangkan alamatnya tanpa
      // menyatakan apa pun.
      const c = komponen({ status: '' });
      c.muat(1);
      expect(alamat.status).toBeNull();
      expect(alamat.cari).toBeNull();
    });
  });
});
