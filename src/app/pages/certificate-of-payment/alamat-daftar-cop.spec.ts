/*
 * DAFTAR CoP — keadaan daftar disimpan di ALAMAT.
 *
 * Yang dijaga di sini bukan kenyamanan, melainkan sebuah keluhan yang
 * kedengaran mustahil: dua tab daftar CoP yang dibuka pada waktu berbeda
 * menampilkan JUMLAH DOKUMEN YANG BERBEDA, dan menekan tombol muat ulang
 * tidak mengubah apa pun di keduanya.
 *
 * Sebabnya: `?keadaan=` dibaca sekali saat layar dibuka tetapi tidak pernah
 * ditulis. Tab yang datang dari kartu beranda ponsel membawa penyaring di
 * alamatnya, tab yang dibuka dari menu tidak — keduanya benar, tidak ada
 * yang menyebutkan bedanya, dan muat ulang memang memuat ulang DATA dengan
 * penyaring tab itu sendiri.
 *
 * Tiga hal yang harus tetap berlaku:
 *
 *   1. Seluruh keadaan dibaca dari alamat, bukan hanya `keadaan`.
 *   2. Setiap perubahan penyaring MENULIS alamat, sehingga alamat dan layar
 *      tidak pernah menyebut dua hal yang berbeda.
 *   3. Alamat yang sudah sesuai TIDAK ditulis ulang — menulisnya menjalankan
 *      transisi halaman, dan di daftar ini transisinya terlihat berkedip.
 */

import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { provideMomentDateAdapter } from '@angular/material-moment-adapter';
import { of } from 'rxjs';

import { CertificateOfPaymentListComponent } from './certificate-of-payment-list/certificate-of-payment-list.component';
import { CertificateOfPaymentService } from 'src/app/services/certificate-of-payment.service';
import { ServerMessageService } from 'src/app/services/server-message.service';
import { PermissionService } from 'src/app/services/permission.service';
import { SettingsService } from 'src/app/services/setting.service';

describe('Daftar CoP — keadaan di alamat', () => {
  let terkirim: any[];
  let navigasi: jasmine.Spy;

  function buat(qp: Record<string, string>) {
    terkirim = [];
    navigasi = jasmine.createSpy('navigate');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [CertificateOfPaymentListComponent, TranslateModule.forRoot()],
      providers: [
        // Kotak rentang tanggalnya nyata di sini — tanpa adapter yang sama
        // seperti aplikasinya, `mat-date-range-input` menolak dibangun.
        provideMomentDateAdapter(),
        {
          provide: CertificateOfPaymentService,
          useValue: {
            daftar: (p: any) => {
              terkirim.push(p);
              return of({ data: [], total: 0 });
            },
          },
        },
        { provide: MatSnackBar, useValue: { open: () => {} } },
        {
          provide: MatDialog,
          useValue: { open: () => ({ afterClosed: () => of(undefined) }) },
        },
        { provide: Router, useValue: { navigate: navigasi } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap(qp), queryParams: qp },
          },
        },
        { provide: SettingsService, useValue: { pageSize: 20 } },
        { provide: ServerMessageService, useValue: { terjemahkan: () => 'x' } },
        {
          provide: PermissionService,
          useValue: { can: () => true, level: () => 5 },
        },
      ],
    });
    const f = TestBed.createComponent(CertificateOfPaymentListComponent);
    f.detectChanges();
    return f;
  }

  it('penyaring, pencarian, urutan, halaman, dan rentang dibaca dari alamat', () => {
    buat({
      keadaan: 'draft',
      cari: 'R501',
      urut: 'nilai',
      arah: 'asc',
      hal: '3',
      dari: '2026-09-01',
      sampai: '2026-09-30',
    });
    const p = terkirim[0];
    expect(p.keadaan).toBe('draft');
    expect(p.keyword).toBe('R501');
    expect(p.sortBy).toBe('nilai');
    expect(p.sortDir).toBe('asc');
    // `hal` di alamat berbasis 1; server berbasis 0.
    expect(p.page).toBe(2);
    expect(p.start).toBe('2026-09-01');
    expect(p.end).toBe('2026-09-30');
  });

  it('rentang dari alamat memunculkan tombol hapus rentang', () => {
    const f = buat({ dari: '2026-09-01' });
    expect(f.componentInstance.adaRentang()).toBeTrue();
  });

  it('tanggal ngawur di alamat diabaikan, bukan masuk sebagai "Invalid date"', () => {
    const f = buat({ dari: 'kemarin' });
    expect(f.componentInstance.rentang.value.dari).toBeNull();
    expect(terkirim[0].start).toBeUndefined();
  });

  it('alamat yang sudah sesuai tidak ditulis ulang', () => {
    buat({ keadaan: 'draft', hal: '3' });
    expect(navigasi).not.toHaveBeenCalled();
  });

  it('bawaan tanpa parameter tidak menulis alamat', () => {
    buat({});
    expect(navigasi).not.toHaveBeenCalled();
  });

  it('menekan keping penyaring MENULIS alamat', () => {
    const f = buat({});
    f.componentInstance.pilihSaring('dibuat');
    expect(navigasi).toHaveBeenCalled();
    expect(navigasi.calls.mostRecent().args[1].queryParams).toEqual({
      keadaan: 'dibuat',
    });
    expect(navigasi.calls.mostRecent().args[1].replaceUrl).toBeTrue();
  });

  it('kembali ke "Semua" MENGHAPUS penyaring dari alamat, bukan menyisakannya', () => {
    const f = buat({ keadaan: 'draft' });
    f.componentInstance.pilihSaring('');
    expect(navigasi.calls.mostRecent().args[1].queryParams).toEqual({});
  });

  it('berpindah halaman menulis nomor halaman berbasis 1', () => {
    const f = buat({});
    f.componentInstance.gantiHalaman({ pageIndex: 2, pageSize: 20 } as any);
    expect(navigasi.calls.mostRecent().args[1].queryParams).toEqual({
      hal: '3',
    });
  });

  it('nama lama `diperiksa` menyalakan keping `dibuat`, bukan tersaring diam-diam', () => {
    const f = buat({ keadaan: 'diperiksa' });
    // Kanonik di komponennya...
    expect(f.componentInstance.saring()).toBe('dibuat');
    // ...ikut terkirim ke server sebagai nama yang sekarang...
    expect(terkirim[0].keadaan).toBe('dibuat');
    // ...dan alamatnya DITULIS ULANG, sehingga menyegarkan halaman tidak
    // mengembalikan nama lamanya.
    expect(navigasi.calls.mostRecent().args[1].queryParams).toEqual({
      keadaan: 'dibuat',
    });
    // Kepingnya ada -> tidak perlu pita.
    expect(f.componentInstance.saringTanpaKeping()).toBeFalse();
  });

  it('keping yang tergambar SAMA dengan daftar `KEPING` di komponennya', () => {
    const f = buat({});
    const nilai = Array.from(
      f.nativeElement.querySelectorAll('mat-chip-option'),
    ).map((e: any) => e.getAttribute('value') ?? '');
    // Daftar di TS dipakai memutuskan apakah sebuah penyaring dapat DILIHAT.
    // Bila keduanya berbeda, keputusan itu diambil atas keping yang tidak ada.
    expect(nilai).toEqual(f.componentInstance.KEPING as string[]);
  });

  it('`disetujui` tetap menyaring, tetapi pitanya muncul', () => {
    const f = buat({ keadaan: 'disetujui' });
    // TAUTAN LAMA TIDAK DILUMPUHKAN: yang membukanya memang meminta itu.
    expect(terkirim[0].keadaan).toBe('disetujui');
    // Tidak ada keping yang mewakilinya -> harus ADA keterangannya.
    expect(f.componentInstance.saringTanpaKeping()).toBeTrue();
    const pita = f.nativeElement.querySelector('.cl-pita');
    expect(pita).withContext('pita penyaring harus tergambar').toBeTruthy();

    // NAMA PENYARINGNYA HARUS IKUT TERBACA. Pita yang berbunyi "daftar ini
    // sedang disaring" tanpa menyebut oleh apa hanya memindahkan
    // kebingungannya satu langkah.
    const terjemahan = TestBed.inject(TranslateService);
    terjemahan.setTranslation(
      'uji',
      { cop: { saringTautanIsi: 'disaring oleh {{nilai}}' } },
      true,
    );
    terjemahan.use('uji');
    f.detectChanges();
    expect(f.nativeElement.querySelector('.cl-pita').textContent).toContain(
      'disaring oleh disetujui',
    );
  });

  it('keping biasa TIDAK memunculkan pita', () => {
    const f = buat({ keadaan: 'draft' });
    expect(f.componentInstance.saringTanpaKeping()).toBeFalse();
    expect(f.nativeElement.querySelector('.cl-pita')).toBeNull();
  });

  it('tombol pada pita mengembalikan daftar ke seluruh dokumen', () => {
    const f = buat({ keadaan: 'disetujui' });
    f.nativeElement.querySelector('.cl-pita__aksi').click();
    expect(f.componentInstance.saring()).toBe('');
    expect(terkirim[terkirim.length - 1].keadaan).toBeUndefined();
  });

  it('urutan bawaan tidak ditulis; urutan lain ditulis', () => {
    const f = buat({});
    // Bawaan `tanggal desc` -> menekan `tanggal` membalik ke `asc`.
    f.componentInstance.gantiUrutan('tanggal');
    expect(navigasi.calls.mostRecent().args[1].queryParams).toEqual({
      arah: 'asc',
    });
  });
});
