/**
 * Faktur penjualan hanya boleh dikirim bila SELURUH bagiannya sah.
 *
 * Bentuk lama layar ini `mat-stepper` dengan tiga langkah — dan
 * `[linear]="false"`, yang berarti langkahnya boleh dilompati. Tombol
 * simpannya hanya memeriksa `paymentFormGroup`.
 *
 * Gabungan keduanya: seseorang dapat membuka langkah ketiga langsung,
 * mengisi rekening bank, dan mengirim faktur tanpa klien, tanpa tanggal,
 * tanpa nomor SPK, dan tanpa DPP. Tidak ada tanda apa pun di layar — isian
 * yang belum benar berada di langkah yang sedang tidak terbuka.
 *
 * Diuji lewat komponennya langsung: yang menentukan benar-tidaknya aturan
 * tombolnya, bukan cara Angular menggambar papan.
 */

import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';

import { ApiService } from '../../services/api.service';
import { ProjectLookupService } from '../../services/project-lookup.service';
import { SalesInvoiceCreateComponent } from './sales-invoice-create/sales-invoice-create.component';

function komponen(): any {
  TestBed.configureTestingModule({
    providers: [
      { provide: ApiService, useValue: { get: () => ({ subscribe: () => ({ add: () => {} }) }) } },
      { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => ({ subscribe: () => {} }) }) } },
      { provide: MatSnackBar, useValue: { open: () => {} } },
      { provide: TranslateService, useValue: { instant: (k: string) => k } },
      { provide: ProjectLookupService, useValue: { muat: () => Promise.resolve(), cari: () => null } },
    ],
  });
  return TestBed.runInInjectionContext(
    () =>
      new (SalesInvoiceCreateComponent as any)(
        TestBed.inject(ApiService),
        TestBed.inject(MatDialog),
        TestBed.inject(MatSnackBar),
        TestBed.inject(ProjectLookupService),
      ),
  );
}

afterEach(() => TestBed.resetTestingModule());

/*
 * Nomor faktur mengikuti pola baku: 001-INV-KODE-BULANROMAWI-TAHUN.
 *
 * Ditulis di sini apa adanya supaya pengujiannya gagal bila polanya berubah
 * — nomor yang tidak sesuai pola ditolak diam-diam oleh validator, dan yang
 * mengisinya hanya melihat tombol yang tidak kunjung hidup.
 */
const NOMOR_SAH = '001-INV-MICZ-VIII-2026';

function isiMeta(c: any): void {
  c.metaFormGroup.patchValue({
    date: '2026-08-20',
    name: NOMOR_SAH,
    projectName: 'MICZ',
    description: 'Termin 1',
    spkNumber: 'SPK-001',
    clientID: 3,
    clientName: 'PT Contoh',
    clientAddress: 'Jl. Contoh 1',
  });
}

function isiNilai(c: any): void {
  c.valueFormGroup.patchValue({
    dpp: 100_000_000,
    ppnPercentage: 11,
    ppnValue: 11_000_000,
    pphPercentage: 0,
    pphValue: 0,
    bpjs: 0,
    total: 111_000_000,
  });
}

function isiPembayaran(c: any): void {
  c.paymentFormGroup.patchValue({
    paymentTotal: 111_000_000,
    bankAccountID: 5,
    bankName: 'BCA',
    bankAccountNumber: '1234567890',
    bankAccountName: 'PT Alpha Konstruksi Nusantara',
  });
}

describe('kesahan faktur penjualan', () => {
  it('kosong sama sekali tidak sah', () => {
    expect(komponen().isValid).toBeFalse();
  });

  it('BAGIAN PEMBAYARAN SAJA tidak cukup', () => {
    /*
     * Inilah keadaan yang dulu lolos: langkah ketiga dibuka langsung,
     * rekening diisi, simpan ditekan. Faktur terkirim tanpa klien dan
     * tanpa DPP.
     */
    const c = komponen();
    isiPembayaran(c);

    expect(c.paymentFormGroup.valid)
      .withContext('bagian pembayarannya sendiri memang sah')
      .toBeTrue();
    expect(c.isValid)
      .withContext('tetapi fakturnya belum boleh dikirim')
      .toBeFalse();
  });

  it('tanpa bagian nilai tidak sah', () => {
    const c = komponen();
    isiMeta(c);
    isiPembayaran(c);
    expect(c.isValid).toBeFalse();
  });

  it('tanpa bagian keterangan tidak sah', () => {
    const c = komponen();
    isiNilai(c);
    isiPembayaran(c);
    expect(c.isValid).toBeFalse();
  });

  it('ketiganya terisi baru sah', () => {
    const c = komponen();
    isiMeta(c);
    isiNilai(c);
    isiPembayaran(c);
    expect(c.isValid).toBeTrue();
  });

  it('DPP nol tetap ditolak', () => {
    // Faktur bernilai nol tidak pernah dimaksudkan siapa pun, dan angka itu
    // ikut terjumlah pada laporan proyek tanpa terlihat.
    const c = komponen();
    isiMeta(c);
    isiNilai(c);
    isiPembayaran(c);
    c.valueFormGroup.patchValue({ dpp: 0 });
    expect(c.isValid).toBeFalse();
  });

  it('satu isian yang dikosongkan kembali membatalkan kesahannya', () => {
    const c = komponen();
    isiMeta(c);
    isiNilai(c);
    isiPembayaran(c);
    expect(c.isValid).toBeTrue();

    c.metaFormGroup.patchValue({ clientName: '' });
    expect(c.isValid).toBeFalse();
  });
});

describe('nomor faktur', () => {
  it('menerima pola baku', () => {
    const c = komponen();
    c.metaFormGroup.patchValue({ name: NOMOR_SAH });
    expect(c.metaFormGroup.get('name')?.valid).toBeTrue();
  });

  it('menolak bentuk lain', () => {
    /*
     * Nomor yang tidak sesuai pola ditolak TANPA pesan di layar — yang
     * mengisinya hanya melihat tombol simpan yang tidak kunjung hidup, dan
     * isian mana yang salah tidak disebutkan di mana pun.
     */
    const c = komponen();
    for (const salah of ['INV/2026/001', '1-INV-MICZ-VIII-2026', '001-INV-MICZ-13-2026', '']) {
      c.metaFormGroup.patchValue({ name: salah });
      expect(c.metaFormGroup.get('name')?.valid).withContext(salah).toBeFalse();
    }
  });
});
