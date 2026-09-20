/**
 * Daftar tender: kolom tanggal, dan kolom tombol yang dibuang.
 *
 * TIGA HAL, SEMUANYA GAGAL TANPA GALAT
 *
 * 1. Nama kolom di `kolom` yang tidak punya `matColumnDef` padanannya
 *    membuat Angular Material MELEMPAR saat tabelnya digambar, dan galatnya
 *    hanya muncul ketika halaman itu dibuka.
 *
 *    Itu TIDAK diperiksa di berkas ini. Membandingkan keduanya menuntut
 *    membaca berkas template, dan di dalam peramban itu berarti
 *    `require.context` — API webpack yang sekali waktu memutus seluruh sesi
 *    Karma sehingga 974 uji tidak pernah selesai dijalankan. Yang
 *    mengerjakannya `scripts/pemeriksa/kolomcek.py`, di luar peramban.
 *
 * 2. Kolom yang TIDAK DAPAT DIURUTKAN DI SERVER tetap menerima klik pada
 *    judulnya. Yang terjadi: permintaan terkirim, server tidak mengenali
 *    kolomnya dan diam-diam jatuh ke `id`, dan daftarnya berubah urutan
 *    menjadi sesuatu yang bukan diminta. Tidak ada galat di mana pun.
 *    Karena itu daftar kolom yang dapat diurutkan di sini harus tetap
 *    sepadan dengan `SORTABLE` di `repository/tender_repository.py`.
 *
 * 3. `lewatBatas` diurai dari TEKS, bukan `new Date('2026-09-12')`. Bentuk
 *    itu adalah tengah malam UTC; di zona di sebelah barat UTC ia mundur
 *    sehari, sehingga batas yang jatuh HARI INI dilaporkan sudah lewat.
 *    Kekeliruan yang sama sudah dua kali muncul di sistem ini.
 */

import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';

import { SettingsService } from '../../services/setting.service';
import { TenderService } from '../../services/tender.service';
import { TenderListComponent } from './tender-list/tender-list.component';

function komponen(): any {
  TestBed.configureTestingModule({
    providers: [
      {
        provide: TenderService,
        useValue: {
          daftar: () => ({ subscribe: () => ({ add: () => {} }) }),
        },
      },
      { provide: Router, useValue: { navigate: () => {} } },
      { provide: ActivatedRoute, useValue: { snapshot: { queryParams: {} } } },
      { provide: MatSnackBar, useValue: { open: () => {} } },
      { provide: TranslateService, useValue: { instant: (k: string) => k } },
      { provide: SettingsService, useValue: { pageSize: 25 } },
    ],
  });
  return TestBed.runInInjectionContext(
    () => new (TenderListComponent as any)(),
  );
}

afterEach(() => TestBed.resetTestingModule());

/** Persis `SORTABLE` di `repository/tender_repository.py`. */
const DAPAT_DIURUT_DI_SERVER = [
  'number',
  'name',
  'date',
  'dueDate',
  'projectName',
  'tenderType',
  'status',
  'createdAt',
];

/** Kolom yang memang bukan kolom basis data. */
const BUKAN_KOLOM_DB = ['quoteCount'];

describe('kolom daftar tender', () => {
  it('memuat tanggal dan batas penawaran masuk', () => {
    const c = komponen();

    expect(c.kolom).toContain('date');
    expect(c.kolom).toContain('dueDate');
  });

  it('TIDAK lagi punya kolom yang isinya cuma tombol', () => {
    /*
     * Kolom `action` berisi satu tombol panah yang memanggil `buka(t.id)` —
     * dan seluruh BARISNYA sudah memanggil hal yang sama. Satu kolom penuh
     * yang tidak menambah kemampuan apa pun, sambil memakan lebar yang
     * dibutuhkan kolom di sebelahnya.
     */
    const c = komponen();

    expect(c.kolom).not.toContain('action');
  });

  it('setiap kolom dapat diurutkan di server, atau memang bukan kolom DB', () => {
    const c = komponen();

    for (const k of c.kolom) {
      if (BUKAN_KOLOM_DB.includes(k)) continue;
      expect(DAPAT_DIURUT_DI_SERVER)
        .withContext(
          `kolom "${k}" dapat ditekan untuk diurutkan, tetapi server tidak ` +
            `mengenalinya dan diam-diam jatuh ke \`id\` — daftarnya berubah ` +
            `urutan menjadi sesuatu yang bukan diminta, tanpa galat`,
        )
        .toContain(k);
    }
  });
});

describe('batas penawaran yang terlewat', () => {
  function tender(dueDate: string | null, status = 'berjalan'): any {
    return { dueDate, status };
  }

  /** `YYYY-MM-DD` untuk hari ini menurut jam lokal. */
  function hariIni(geser = 0): string {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + geser);
    const dua = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}`;
  }

  it('batas KEMARIN ditandai', () => {
    expect(komponen().lewatBatas(tender(hariIni(-1)))).toBeTrue();
  });

  it('batas HARI INI belum lewat', () => {
    /*
     * Inilah yang salah bila tanggalnya diurai lewat `new Date('2026-09-12')`:
     * di WIB itu menjadi 11 September pukul 07.00, sehingga batas hari ini
     * dilaporkan terlewat sejak pagi.
     */
    expect(komponen().lewatBatas(tender(hariIni(0))))
      .withContext('batas yang jatuh hari ini dilaporkan sudah lewat')
      .toBeFalse();
  });

  it('batas BESOK belum lewat', () => {
    expect(komponen().lewatBatas(tender(hariIni(1)))).toBeFalse();
  });

  it('tanpa batas, tidak ditandai', () => {
    const c = komponen();
    expect(c.lewatBatas(tender(null))).toBeFalse();
    expect(c.lewatBatas({ status: 'berjalan' })).toBeFalse();
  });

  it('hanya menandai tender yang masih menunggu', () => {
    /*
     * Tender yang sudah `selesai` atau `batal` melewati batasnya adalah hal
     * yang biasa. Menandainya merah membuat sebagian besar daftar menyala
     * tanpa ada yang perlu dikerjakan — dan penanda yang selalu menyala
     * berhenti dibaca.
     */
    const c = komponen();
    const lewat = hariIni(-30);

    expect(c.lewatBatas(tender(lewat, 'draft'))).toBeTrue();
    expect(c.lewatBatas(tender(lewat, 'berjalan'))).toBeTrue();
    expect(c.lewatBatas(tender(lewat, 'selesai'))).toBeFalse();
    expect(c.lewatBatas(tender(lewat, 'batal'))).toBeFalse();
  });
});
