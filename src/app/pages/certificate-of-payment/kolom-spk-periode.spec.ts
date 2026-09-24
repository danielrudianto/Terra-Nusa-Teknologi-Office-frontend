/*
 * DAFTAR CoP — nomor SPK, periode kerja, dan penyaring tanggal.
 *
 * Tiga hal yang diperiksa di sini, dan ketiganya gagal dengan DIAM bila
 * salah:
 *
 *   1. `periodeTeks()` memampatkan bagian yang sama dari kedua ujung
 *      rentang. Yang keliru bukan galat melainkan tanggal yang terbaca
 *      salah tahun — "10 – 16 Sep" milik 2025 yang terbaca sebagai
 *      milik tahun ini.
 *
 *   2. Rentang tanggal dikirim sebagai `YYYY-MM-DD` waktu SETEMPAT. Lewat
 *      `toISOString()` setiap tanggal mundur sehari bagi WIB (+7), dan
 *      yang terlihat hanyalah satu baris hilang di satu ujung rentang.
 *
 *   3. Menekan nomor SPK MENAHAN kliknya. Tanpa itu baris di belakangnya
 *      ikut terpicu dan dialog CoP menutupi SPK yang barusan diminta.
 */

import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { registerLocaleData } from '@angular/common';
import localeId from '@angular/common/locales/id';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import moment from 'moment';

import { CertificateOfPaymentListComponent } from './certificate-of-payment-list/certificate-of-payment-list.component';
import { CertificateOfPaymentService } from 'src/app/services/certificate-of-payment.service';
import { ServerMessageService } from 'src/app/services/server-message.service';
import { PermissionService } from 'src/app/services/permission.service';
import { SettingsService } from 'src/app/services/setting.service';

registerLocaleData(localeId, 'id');

/** Permintaan daftar TERAKHIR yang dikirim komponen ke server. */
let terakhir: any = null;
/** Dialog yang dibuka, berikut datanya. */
let dibuka: any[] = [];

function komponen(): any {
  terakhir = null;
  dibuka = [];
  TestBed.configureTestingModule({
    providers: [
      { provide: LOCALE_ID, useValue: 'id' },
      {
        provide: CertificateOfPaymentService,
        useValue: {
          daftar: (p: any) => {
            terakhir = p;
            return of({ data: [], total: 0 });
          },
        },
      },
      { provide: Router, useValue: { navigate: () => {} } },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { queryParamMap: { get: () => null } } },
      },
      { provide: MatSnackBar, useValue: { open: () => {} } },
      {
        provide: MatDialog,
        useValue: {
          open: (komp: any, cfg: any) => {
            dibuka.push({ komp, cfg });
            return { afterClosed: () => of(undefined) };
          },
        },
      },
      { provide: SettingsService, useValue: { pageSize: 20 } },
      { provide: TranslateService, useValue: { instant: (k: string) => k } },
      { provide: ServerMessageService, useValue: { terjemahkan: () => 'x' } },
      { provide: PermissionService, useValue: { can: () => true, level: () => 5 } },
    ],
  });
  return TestBed.runInInjectionContext(
    () => new (CertificateOfPaymentListComponent as any)(),
  );
}

afterEach(() => TestBed.resetTestingModule());

function cop(mulai: string | null, selesai: string | null): any {
  return { id: 1, periodStart: mulai, periodEnd: selesai };
}

describe('Daftar CoP — kolom SPK & periode', () => {
  it('SPK dan periode adalah kolom tersendiri, bukan baris kedua', () => {
    const k = komponen().kolom;
    expect(k).toContain('spk');
    expect(k).toContain('periode');
    // TANGGAL PALING KIRI, seperti daftar Pembelian — lalu periode
    // menempel padanya. Keduanya tanggal; dipisahkan kolom lain, mereka
    // harus dibandingkan dengan menyeberangi nama pemasok.
    expect(k[0]).toBe('tanggal');
    expect(k[1]).toBe('periode');
    // Nomor SPK tetap bersebelahan dengan nomor CoP.
    expect(k.indexOf('spk')).toBe(k.indexOf('nomor') + 1);
  });

  it('nama tiga kata diringkas; nama pendek tidak disentuh', () => {
    const c = komponen();
    expect(c.namaRingkas('Nazula Lintang Rahmadhani')).toBe('Nazula L. R.');
    // Muat apa adanya -> dibiarkan. Meringkasnya tidak memenangkan apa pun.
    expect(c.namaRingkas('Daniel Tri')).toBe('Daniel Tri');
    expect(c.namaRingkas('Dudung')).toBe('Dudung');
    // Nama depan SELALU utuh — itu yang dipakai mengenali orang di sini.
    expect(c.namaRingkas('Reynaldi Pradita Budiman')).toBe('Reynaldi P. B.');
    // Satu kata yang kebetulan panjang tidak dapat diringkas tanpa
    // menghilangkan namanya sendiri.
    expect(c.namaRingkas('Wirosableng2525wirosableng')).toBe(
      'Wirosableng2525wirosableng',
    );
    expect(c.namaRingkas(null)).toBe('—');
    expect(c.namaRingkas('   ')).toBe('—');
  });

  it('rentang sebulan menulis bulan dan tahun SEKALI, di ujung', () => {
    const c = komponen();
    expect(c.periodeTeks(cop('2026-09-10', '2026-09-16'))).toBe(
      '10 – 16 Sep 2026',
    );
  });

  it('rentang lintas bulan menyebut kedua bulannya', () => {
    const c = komponen();
    expect(c.periodeTeks(cop('2026-09-28', '2026-10-04'))).toBe(
      '28 Sep – 4 Okt 2026',
    );
  });

  it('rentang lintas TAHUN menyebut kedua tahunnya', () => {
    const c = komponen();
    // Inilah yang tidak boleh dipampatkan: "28 Des – 4 Jan 2026" membuat
    // 28 Desember terbaca sebagai milik 2026.
    expect(c.periodeTeks(cop('2025-12-28', '2026-01-04'))).toBe(
      '28 Des 2025 – 4 Jan 2026',
    );
  });

  it('periode sehari ditulis sebagai satu tanggal, bukan rentang kembar', () => {
    const c = komponen();
    expect(c.periodeTeks(cop('2026-09-10', '2026-09-10'))).toBe('10 Sep 2026');
  });

  it('periode yang tidak lengkap atau rusak tidak menjatuhkan barisnya', () => {
    const c = komponen();
    expect(c.periodeTeks(cop(null, '2026-09-16'))).toBe('');
    expect(c.periodeTeks(cop('2026-09-10', null))).toBe('');
    expect(c.periodeTeks(cop('bukan tanggal', '2026-09-16'))).toBe('');
  });

  it('menekan nomor SPK membuka SPK-nya dan MENAHAN klik barisnya', () => {
    const c = komponen();
    let tertahan = false;
    c.bukaSpk(
      { id: 1, purchaseOrderID: 77 },
      { stopPropagation: () => (tertahan = true) } as any,
    );
    expect(tertahan).toBeTrue();
    expect(dibuka.length).toBe(1);
    expect(dibuka[0].cfg.data).toEqual({ id: 77 });
  });

  it('CoP tanpa purchaseOrderID tidak membuka dialog kosong', () => {
    const c = komponen();
    c.bukaSpk({ id: 1, purchaseOrderID: null }, {
      stopPropagation: () => {},
    } as any);
    expect(dibuka.length).toBe(0);
  });
});

describe('Daftar CoP — penyaring tanggal', () => {
  it('kosong saat dibuka: tidak ada tanggal yang dikirim', async () => {
    const c = komponen();
    await c.muat();
    expect(terakhir.start).toBeUndefined();
    expect(terakhir.end).toBeUndefined();
  });

  it('tanggal dikirim apa adanya, TIDAK digeser ke UTC', async () => {
    const c = komponen();
    // 1 September pukul 00:00 waktu setempat. Lewat `toISOString()` pada
    // WIB (+7) ini menjadi 31 Agustus — dan rentang bergeser sehari.
    c.rentang.setValue(
      { dari: moment('2026-09-01'), sampai: moment('2026-09-30') },
      { emitEvent: false },
    );
    await c.muat();
    expect(terakhir.start).toBe('2026-09-01');
    expect(terakhir.end).toBe('2026-09-30');
  });

  it('kedua ujungnya berdiri sendiri', async () => {
    const c = komponen();
    c.rentang.setValue(
      { dari: moment('2026-09-01'), sampai: null },
      { emitEvent: false },
    );
    await c.muat();
    expect(terakhir.start).toBe('2026-09-01');
    expect(terakhir.end).toBeUndefined();

    c.rentang.setValue(
      { dari: null, sampai: moment('2026-09-30') },
      { emitEvent: false },
    );
    await c.muat();
    expect(terakhir.start).toBeUndefined();
    expect(terakhir.end).toBe('2026-09-30');
  });

  it('melepas rentang mengosongkan kedua kotaknya', async () => {
    const c = komponen();
    c.rentang.setValue(
      { dari: moment('2026-09-01'), sampai: moment('2026-09-30') },
      { emitEvent: false },
    );
    c.bersihkanRentang();
    await c.muat();
    expect(terakhir.start).toBeUndefined();
    expect(terakhir.end).toBeUndefined();
  });
});

describe('Daftar CoP — tahap kelima: sudah ditagihkan', () => {
  function cop2(t: any): any {
    return { id: 1, isApproved: 1, ...t };
  }

  it('disetujui + belum ada tagihan = SIAP DITAGIH', () => {
    const c = komponen();
    expect(c.keadaan(cop2({ tagihanID: null }))).toBe('siap');
    expect(c.keadaan(cop2({}))).toBe('siap');
  });

  it('disetujui + ada tagihan = SUDAH DITAGIH', () => {
    const c = komponen();
    expect(c.keadaan(cop2({ tagihanID: 77 }))).toBe('ditagih');
  });

  it('tahap sebelum disetujui tidak terpengaruh tagihan', () => {
    /*
     * Penjaga: `tagihanID` yang tersisa dari data lama tidak boleh
     * melompati tiga gerbang persetujuan sekaligus.
     */
    const c = komponen();
    expect(
      c.keadaan({ id: 1, isApproved: 0, isCopCreated: 1, tagihanID: 77 } as any),
    ).toBe('dibuat');
    expect(
      c.keadaan({ id: 1, isApproved: 0, isBapApproved: 1, tagihanID: 77 } as any),
    ).toBe('bap');
    expect(c.keadaan({ id: 1, tagihanID: 77 } as any)).toBe('draft');
  });

  it('TERHAPUS tetap menang atas segalanya', () => {
    // Dokumen yang dihapus membawa seluruh penanda tahapnya. Diperiksa
    // belakangan, CoP terhapus yang sudah ditagih tampil "Sudah ditagih".
    const c = komponen();
    expect(c.keadaan(cop2({ isDelete: 1, tagihanID: 77 }))).toBe('dihapus');
  });

  it('keterangan tagihan menyebut nomornya, dan lunas bila lunas', () => {
    const c = komponen();
    expect(c.tagihanKet(cop2({ tagihanID: null }))).toBe('');
    expect(c.tagihanKet(cop2({ tagihanID: 77, tagihanNomor: 'INV-9' }))).toBe(
      'cop.ditagihLewat',
    );
    expect(c.tagihanKet(cop2({ tagihanID: 77, tagihanNomor: '  ' }))).toBe(
      'cop.ditagihTanpaNomor',
    );
    expect(
      c.tagihanKet(cop2({ tagihanID: 77, tagihanNomor: 'INV-9', tagihanLunas: 1 })),
    ).toBe('cop.ditagihLewat · cop.tagihanLunas');
  });

  it('keping siap/ditagih diteruskan ke server apa adanya', async () => {
    const c = komponen();
    c.pilihSaring('siap');
    await c.muat();
    expect(terakhir.keadaan).toBe('siap');
    c.pilihSaring('ditagih');
    await c.muat();
    expect(terakhir.keadaan).toBe('ditagih');
  });
});
