/*
 * TANDA TANGAN SAYA — dialog, dan kapan ia muncul.
 *
 * Yang dijaga di sini, dan hampir semuanya gagal dengan DIAM:
 *
 *   1. Dialognya tidak muncul berkali-kali dalam satu sesi. Yang muncul
 *      terus-menerus akan ditutup tanpa dibaca, dan tanda tangan yang dibuat
 *      asal-asalan itulah yang kelak menempel di dokumen resmi.
 *   2. GAGAL MENANYAKAN bukan berarti BELUM PUNYA. Menyamakan keduanya
 *      membuat dialog muncul di depan orang yang tanda tangannya sudah
 *      tersimpan sejak bulan lalu, setiap kali jaringannya buruk.
 *   3. Yang WAJIB tidak boleh lolos lewat Esc atau klik latar.
 *   4. Papan kosong tidak dapat disimpan — tanda tangan kosong yang tersimpan
 *      berarti dokumen tercap gambar nol byte tanpa ada yang menyadarinya.
 *   5. Penyimpanan yang gagal TIDAK menutup dialognya; yang menulis kehilangan
 *      coretannya kalau ditutup.
 */

import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { ApiService } from 'src/app/services/api.service';
import { ServerMessageService } from 'src/app/services/server-message.service';
import { TandaTanganService } from 'src/app/services/tanda-tangan.service';
import { TtdSayaComponent } from './ttd-saya.component';

const KUNCI = 'tnt.ttd.ditawarkan';

describe('TandaTanganService — kapan dialognya ditawarkan', () => {
  let dibuka: any[];

  function layanan(status: any, opsi: { gagal?: boolean } = {}): TandaTanganService {
    dibuka = [];
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ApiService,
          useValue: {
            get: () => (opsi.gagal ? throwError(() => new Error('mati')) : of(status)),
          },
        },
        {
          provide: MatDialog,
          useValue: {
            open: (komp: any, cfg: any) => {
              dibuka.push({ komp, cfg });
              return { afterClosed: () => of(true) };
            },
          },
        },
      ],
    });
    return TestBed.inject(TandaTanganService);
  }

  beforeEach(() => {
    try {
      sessionStorage.removeItem(KUNCI);
    } catch {}
  });

  afterAll(() => {
    try {
      sessionStorage.removeItem(KUNCI);
    } catch {}
  });

  it('belum punya: dialognya dibuka, dan boleh dilewati', async () => {
    const s = layanan({ hasSignature: false });
    await s.tawarkanBilaBelumAda();

    expect(dibuka.length).toBe(1);
    expect(dibuka[0].komp).toBe(TtdSayaComponent);
    expect(dibuka[0].cfg.data.bolehLewat).toBeTrue();
    expect(dibuka[0].cfg.disableClose).toBeFalse();
  });

  it('sudah punya: tidak diganggu sama sekali', async () => {
    const s = layanan({ hasSignature: true });
    await s.tawarkanBilaBelumAda();

    expect(dibuka.length).toBe(0);
  });

  it('GAGAL menanyakan tidak dianggap belum punya', async () => {
    const s = layanan(null, { gagal: true });
    await s.tawarkanBilaBelumAda();

    expect(dibuka.length).withContext('muncul saat jaringan buruk').toBe(0);
  });

  it('hanya sekali per sesi peramban', async () => {
    const s = layanan({ hasSignature: false });
    await s.tawarkanBilaBelumAda();
    await s.tawarkanBilaBelumAda();
    await s.tawarkanBilaBelumAda();

    expect(dibuka.length).toBe(1);
  });

  it('penandanya di sessionStorage, bukan localStorage', async () => {
    // Dengan localStorage, yang menekan "Nanti saja" sekali tidak akan
    // pernah ditawari lagi di perangkat itu.
    const s = layanan({ hasSignature: false });
    await s.tawarkanBilaBelumAda();

    expect(sessionStorage.getItem(KUNCI)).toBe('1');
    expect(localStorage.getItem(KUNCI)).toBeNull();
  });

  it('yang WAJIB tidak dapat ditutup dengan Esc atau klik latar', async () => {
    const s = layanan({ hasSignature: false });
    await s.buka({ bolehLewat: false });

    expect(dibuka[0].cfg.disableClose).toBeTrue();
  });

  it('penyimpanan yang ditolak peramban tidak menggagalkan pemuatan', async () => {
    const asli = Object.getOwnPropertyDescriptor(Storage.prototype, 'getItem');
    spyOn(Storage.prototype, 'getItem').and.throwError('ditolak');
    try {
      const s = layanan({ hasSignature: true });
      await expectAsync(s.tawarkanBilaBelumAda()).toBeResolved();
    } finally {
      if (asli) Object.defineProperty(Storage.prototype, 'getItem', asli);
    }
  });
});

describe('TtdSayaComponent — dialognya', () => {
  let dikirim: any;
  let ditutup: any;

  function buat(data: any = {}, opsi: { gagal?: boolean } = {}) {
    dikirim = null;
    ditutup = undefined;
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [TtdSayaComponent, TranslateModule.forRoot()],
      providers: [
        provideNoopAnimations(),
        {
          provide: ApiService,
          useValue: {
            put: (jalur: string, body: any) => {
              dikirim = { jalur, body };
              return opsi.gagal ? throwError(() => new Error('x')) : of({ ok: true });
            },
          },
        },
        { provide: MatDialogRef, useValue: { close: (v: any) => (ditutup = v) } },
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatSnackBar, useValue: { open: () => {} } },
        { provide: ServerMessageService, useValue: { terjemahkan: () => 'x' } },
      ],
    });
    const f = TestBed.createComponent(TtdSayaComponent);
    f.detectChanges();
    return f;
  }

  it('papan kosong: tombol simpan mati', () => {
    const f = buat();
    const tombol = Array.from(
      f.nativeElement.querySelectorAll('button'),
    ).find((b: any) => b.textContent.includes('ttd.simpan')) as any;

    expect(tombol.disabled).toBeTrue();
  });

  it('tanpa coretan, simpan() tidak mengirim apa pun', async () => {
    const f = buat();
    await f.componentInstance.simpan();

    expect(dikirim).withContext('tanda tangan kosong terkirim').toBeNull();
  });

  it('mengirim data-URI PNG ke jalur milik-sendiri', async () => {
    const f = buat();
    const c = f.componentInstance as any;
    c.papan = { gambar: () => 'data:image/png;base64,AAA' };
    await c.simpan();

    expect(dikirim.jalur).toBe('user-signatures/me');
    expect(dikirim.body.image).toBe('data:image/png;base64,AAA');
    expect(ditutup).toBeTrue();
  });

  it('gagal menyimpan TIDAK menutup dialognya', async () => {
    const f = buat({}, { gagal: true });
    const c = f.componentInstance as any;
    c.papan = { gambar: () => 'data:image/png;base64,AAA' };
    await c.simpan();

    expect(ditutup).withContext('coretannya ikut hilang').toBeUndefined();
    expect(c.menyimpan).toBeFalse();
  });

  it('"Nanti saja" menutup dengan false, bukan true', () => {
    // Pemanggil membedakan "dilewati" dari "tersimpan"; yang memaksa menolak
    // yang pertama.
    const f = buat();
    f.componentInstance.lewati();

    expect(ditutup).toBeFalse();
  });

  it('bila tidak boleh dilewati, tombol "Nanti saja" TIDAK ada', () => {
    const f = buat({ bolehLewat: false });
    const nanti = Array.from(
      f.nativeElement.querySelectorAll('button'),
    ).filter((b: any) => b.textContent.includes('ttd.nanti'));

    expect(nanti.length).toBe(0);
  });
});
