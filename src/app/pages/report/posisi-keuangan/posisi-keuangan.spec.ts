/*
 * HALAMAN POSISI KEUANGAN.
 *
 * Yang dijaga di sini bukan tata letaknya melainkan angka-angka yang SALAH
 * BACA kalau keadaan kosongnya digambar sebagai nol. Ketiganya tidak
 * menghasilkan galat; semuanya terbaca sebagai pengukuran.
 */

import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

import { PosisiKeuanganComponent } from './posisi-keuangan.component';
import { ApiService } from 'src/app/services/api.service';
import { ServerMessageService } from 'src/app/services/server-message.service';

function komponen(jawab: (url: string) => any = () => ({})): any {
  TestBed.configureTestingModule({
    providers: [
      {
        provide: ApiService,
        useValue: {
          get: (url: string) => {
            const hasil = jawab(url);
            return hasil instanceof Error
              ? throwError(() => hasil)
              : of(hasil);
          },
        },
      },
      { provide: TranslateService, useValue: { instant: (k: string) => k } },
      { provide: ServerMessageService, useValue: { terjemahkan: () => 'galat' } },
    ],
  });
  return TestBed.runInInjectionContext(
    () => new (PosisiKeuanganComponent as any)(),
  );
}

afterEach(() => TestBed.resetTestingModule());

describe('quick ratio', () => {
  it('TANPA utang usaha dicetak tanda pisah, bukan 0,00', () => {
    /*
     * Server mengirim `null` ketika tidak ada utang usaha sama sekali —
     * rasionya tak terhingga, yaitu keadaan TERBAIK.
     *
     * `Number(null).toFixed(2)` adalah "0.00", dan nol pada rasio ini berarti
     * keadaan terburuk. Jadi kekeliruannya membaca keadaan terbaik sebagai
     * terburuk, dengan angka yang tampak sah sepenuhnya.
     */
    const c = komponen();
    c.data.set({ quickRatio: null });

    expect(c.rasio()).toBe('—');
    expect(c.rasioKurang())
      .withContext('kartunya diwarnai merah padahal tidak ada utang sama sekali')
      .toBeFalse();
  });

  it('rasio di bawah 1 ditandai', () => {
    const c = komponen();
    c.data.set({ quickRatio: 0.82 });
    expect(c.rasio()).toBe('0.82');
    expect(c.rasioKurang()).toBeTrue();
  });

  it('rasio tepat 1 TIDAK ditandai', () => {
    const c = komponen();
    c.data.set({ quickRatio: 1 });
    expect(c.rasioKurang()).toBeFalse();
  });
});

describe('disposisi rencana', () => {
  it('tanpa satu pun rencana, persennya tanda pisah — bukan 0%', () => {
    /*
     * "0% terpakai" pada perusahaan yang memang belum pernah membuat rencana
     * kas adalah tuduhan, bukan pengukuran — dan itu yang dibaca orang yang
     * membuka halaman ini pertama kali.
     */
    const c = komponen();
    c.akurasi.set({ disposisi: {} });

    expect(c.persen('terpakai')).toBeNull();
    expect(c.disposisi('terpakai')).toEqual({ jumlah: 0, total: 0 });
  });

  it('persentase dihitung terhadap SELURUH rencana periode itu', () => {
    const c = komponen();
    c.akurasi.set({
      disposisi: {
        terpakai: { jumlah: 6, total: 600 },
        rencana: { jumlah: 2, total: 200 },
        batal: { jumlah: 2, total: 200 },
      },
    });

    expect(c.totalRencana()).toBe(10);
    expect(c.persen('terpakai')).toBe(60);
    expect(c.persen('batal')).toBe(20);
  });

  it('status yang tidak muncul di jawaban tetap terbaca nol, bukan meledak', () => {
    const c = komponen();
    c.akurasi.set({ disposisi: { terpakai: { jumlah: 4, total: 400 } } });

    expect(c.persen('batal')).toBe(0);
    expect(c.disposisi('batal').jumlah).toBe(0);
  });
});

describe('bilah ember', () => {
  it('diukur terhadap ember TERBESAR, bukan terhadap totalnya', () => {
    /*
     * Dibagi terhadap total, seluruh bilah menjadi sangat pendek begitu
     * embernya banyak — dan yang dicari di sini justru mana yang menonjol.
     */
    const c = komponen();
    const daftar = [
      { kunci: 'a', label: '', nilai: 100 },
      { kunci: 'b', label: '', nilai: 50 },
    ];
    expect(c.lebar(daftar, daftar[0])).toBe(100);
    expect(c.lebar(daftar, daftar[1])).toBe(50);
  });

  it('seluruhnya nol tidak menghasilkan NaN', () => {
    /*
     * `0 / 0` adalah NaN, dan `[style.width.%]="NaN"` membuat Angular
     * menuliskan "NaN%" ke atribut gaya — bilahnya lalu selebar apa pun yang
     * diputuskan peramban, tanpa satu pun galat.
     */
    const c = komponen();
    const daftar = [{ kunci: 'a', label: '', nilai: 0 }];
    expect(c.lebar(daftar, daftar[0])).toBe(0);
  });
});

describe('pemuatan terpisah', () => {
  it('akurasi yang GAGAL tidak menjatuhkan angka kas', async () => {
    /*
     * Keduanya menjawab pertanyaan yang berbeda, dan yang membuka halaman ini
     * membukanya untuk angka kas. Satu jalan keluar untuk keduanya berarti
     * kegagalan pada empat kueri agregasi ikut menghapus saldo rekening dari
     * layar.
     */
    const c = komponen((url) =>
      url.includes('akurasi') ? new Error('gagal') : { kas: { total: 500 } },
    );
    await c.muat();
    await c.muatAkurasi();

    expect(c.data()?.kas?.total).toBe(500);
    expect(c.galat()).toBe('');
    expect(c.akurasi()).toBeNull();
    expect(c.galatAkurasi()).toBe('galat');
  });
});

describe('label bulan', () => {
  it('"2026-09" menjadi "Sep 2026"', () => {
    expect(komponen().labelBulan('2026-09')).toBe('Sep 2026');
  });

  it('bulan Januari tidak jatuh ke indeks -1', () => {
    /*
     * `nama[bulan - 1]` dengan bulan 1 adalah indeks 0 — benar. Yang mudah
     * keliru justru kebalikannya, dan `nama[-1]` adalah `undefined` yang
     * tercetak sebagai "undefined 2026" di sumbu grafik.
     */
    const c = komponen();
    expect(c.labelBulan('2026-01')).toBe('Jan 2026');
    expect(c.labelBulan('2026-12')).toBe('Des 2026');
  });

  it('kunci yang tidak dikenali dikembalikan apa adanya', () => {
    expect(komponen().labelBulan('sampah')).toBe('sampah');
  });
});
