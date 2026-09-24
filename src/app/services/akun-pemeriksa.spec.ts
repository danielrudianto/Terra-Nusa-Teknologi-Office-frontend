import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';

import { ApiService } from './api.service';
import { PermissionService } from './permission.service';

/*
 * AKUN PEMERIKSA di sisi layar.
 *
 * Penjagaannya ada di server — `is_allowed()` menolak setiap aksi selain
 * `read`, dan peta izin yang dikirimnya sudah bernilai `false` untuk seluruh
 * aksi tulis. Sisi layar TIDAK menghitung ulang: ia hanya membaca jawaban
 * itu, sehingga tombolnya hilang dengan sendirinya.
 *
 * Yang diuji di sini dua hal:
 *
 *   1. tandanya terbaca dan ikut dibersihkan saat keluar — layar tanpa
 *      tombol dan tanpa sebab terbaca seperti aplikasi yang rusak;
 *   2. `can()` tetap membaca peta dari server, bukan menyimpulkan sendiri.
 */
const PETA_PEMERIKSA = {
  purchase: { read: true, create: false, update: false, delete: false, approve: false },
  bank: { read: true, create: false, update: false, delete: false, approve: false },
  finance_status: { read: true, create: false, update: false, delete: false, approve: false },
};

function siapkan(jawaban: any) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      {
        provide: ApiService,
        useValue: {
          get: () =>
            jawaban instanceof Error ? throwError(() => jawaban) : of(jawaban),
        },
      },
    ],
  });
  try {
    localStorage.setItem('access_token', 'uji');
  } catch {}
  return TestBed.inject(PermissionService);
}

describe('akun pemeriksa (hanya baca)', () => {
  it('tandanya terbaca dari server', async () => {
    const p = siapkan({ level: 5, departments: [], permissions: PETA_PEMERIKSA, readOnly: true });
    await p.load(true);
    expect(p.readOnly()).toBeTrue();
  });

  it('boleh membaca, tidak boleh menulis — termasuk di level 5', async () => {
    const p = siapkan({ level: 5, departments: [], permissions: PETA_PEMERIKSA, readOnly: true });
    await p.load(true);

    expect(p.level()).toBe(5);
    expect(p.canRead('finance_status')).toBeTrue();
    for (const aksi of ['create', 'update', 'delete', 'approve']) {
      expect(p.can('bank', aksi)).withContext(aksi).toBeFalse();
      expect(p.can('purchase', aksi)).withContext(aksi).toBeFalse();
    }
  });

  it('akun biasa tidak ikut tertandai', async () => {
    const p = siapkan({
      level: 5,
      departments: ['fat'],
      permissions: { bank: { read: true, create: true, update: true, delete: true, approve: true } },
    });
    await p.load(true);
    expect(p.readOnly()).toBeFalse();
    expect(p.can('bank', 'update')).toBeTrue();
  });

  it('keluar membersihkan tandanya', async () => {
    // Kalau tertinggal, pengguna berikutnya di peramban yang sama melihat
    // lencana "hanya baca" pada akun yang sebenarnya berhak menulis.
    const p = siapkan({ level: 5, departments: [], permissions: PETA_PEMERIKSA, readOnly: true });
    await p.load(true);
    expect(p.readOnly()).toBeTrue();

    p.clear();
    expect(p.readOnly()).toBeFalse();
    expect(p.can('purchase', 'read')).toBeFalse();
  });

  it('server lama tanpa bidang readOnly: tidak menandai siapa pun', async () => {
    // Layar baru dapat terpasang lebih dulu daripada servernya. Tidak ada
    // bidangnya berarti tidak ada akun pemeriksa — bukan semuanya pemeriksa.
    const p = siapkan({ level: 3, departments: [], permissions: PETA_PEMERIKSA });
    await p.load(true);
    expect(p.readOnly()).toBeFalse();
  });

  it('nilai selain boolean tidak menandai', async () => {
    const p = siapkan({ level: 3, departments: [], permissions: {}, readOnly: 'ya' });
    await p.load(true);
    expect(p.readOnly()).toBeFalse();
  });
});
