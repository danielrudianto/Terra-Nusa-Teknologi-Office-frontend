import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideMomentDateAdapter } from '@angular/material-moment-adapter';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import moment from 'moment';

import {
  UnduhKalenderDialogComponent,
  keTanggal,
} from './unduh-kalender-dialog.component';

/**
 * Unduh kalender per RENTANG, dengan adapter tanggal yang sebenarnya dipakai.
 *
 * KELUHANNYA, dari konsol peramban:
 *
 *     TypeError: c.getFullYear is not a function
 *         at Object.computation (...)
 *         at c.r [as terbalik] (...)
 *
 * SEBABNYA
 *
 * `app.module.ts` mendaftarkan `provideMomentDateAdapter(MY_FORMATS)`. Jadi
 * setiap datepicker Material di aplikasi ini memancarkan objek **Moment**,
 * bukan `Date`. Moment tidak punya `getFullYear()` — ia punya `year()`.
 *
 * Dialog ini menyimpan nilai itu apa adanya ke `signal<Date | null>`, lalu
 * `maksAkhir` memanggil `getFullYear()` atasnya. Rantai `computed`-nya putus
 * di situ, dan yang muncul di jejaknya adalah `terbalik` — bukan tempat
 * salahnya, melainkan tempat rantainya kebetulan dimulai.
 *
 * KENAPA TIDAK TERTANGKAP LEBIH AWAL
 *
 * Dua-duanya diam:
 *
 *   * TypeScript. `(ngModelChange)` memancarkan `any`, jadi anotasi `Date`
 *     pada signalnya hanya janji yang tidak pernah ditagih siapa pun.
 *   * Uji yang ada. `unduh-kalender.spec.ts` memanggil `jumlahHari()` dengan
 *     `Date` sungguhan — karena itu yang tertulis di tipenya. Ia menguji
 *     fungsinya, bukan APA YANG SAMPAI ke fungsinya.
 *
 * Karena itu berkas ini memasang adapter yang SAMA seperti aplikasi, lalu
 * memberi Moment sungguhan. Itu satu-satunya bentuk uji yang dapat merah
 * untuk sebab ini.
 */

describe('Unduh kalender rentang dengan adapter Moment', () => {
  let ditutupDengan: unknown;

  function pasang() {
    ditutupDengan = undefined;
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [
        UnduhKalenderDialogComponent,
        NoopAnimationsModule,
        // Dialognya memakai pipe `translate`; tanpa ini yang merah adalah
        // penyedia yang hilang, bukan hal yang sedang diuji.
        TranslateModule.forRoot(),
      ],
      providers: [
        // Adapter yang SAMA seperti `app.module.ts`. Tanpa baris ini, uji ini
        // berjalan dengan adapter bawaan dan tidak membuktikan apa pun.
        provideMomentDateAdapter(),
        {
          provide: MatDialogRef,
          useValue: { close: (v: unknown) => (ditutupDengan = v) },
        },
        { provide: MAT_DIALOG_DATA, useValue: { month: 8, year: 2026 } },
      ],
      errorOnUnknownElements: false,
      errorOnUnknownProperties: false,
    });
    const f = TestBed.createComponent(UnduhKalenderDialogComponent);
    f.detectChanges();
    return f;
  }

  // ------------------------------------------------------------------
  // Keluhannya
  // ------------------------------------------------------------------

  it('MOMENT dari datepicker tidak menjatuhkan rantai computed', () => {
    /*
     * Reproduksi persisnya. Sebelum diperbaiki, baris `maksAkhir()` di bawah
     * melempar `c.getFullYear is not a function`.
     */
    const f = pasang();
    const k = f.componentInstance;

    k.mode.set('rentang');
    k.mulai.set(k.keTanggal(moment('2026-09-01')));
    k.akhir.set(k.keTanggal(moment('2026-09-14')));

    expect(() => k.maksAkhir()).not.toThrow();
    expect(() => k.hari()).not.toThrow();
    expect(() => k.terbalik()).not.toThrow();
    expect(() => k.sah()).not.toThrow();
  });

  it('jumlah harinya BENAR, bukan sekadar tidak melempar', () => {
    /*
     * Penjaga yang cuma memeriksa "tidak melempar" akan hijau untuk
     * penormalan yang mengembalikan tanggal yang salah.
     */
    const f = pasang();
    const k = f.componentInstance;

    k.mode.set('rentang');
    k.mulai.set(k.keTanggal(moment('2026-09-01')));
    k.akhir.set(k.keTanggal(moment('2026-09-14')));

    expect(k.hari()).toBe(14);
    expect(k.terbalik()).toBeFalse();
    expect(k.kepanjangan()).toBeFalse();
    expect(k.sah()).toBeTrue();
  });

  it('tanggal yang dikirim ke server tidak bergeser sehari', () => {
    /*
     * Inti yang sebenarnya dipedulikan orang: rentang yang dimintanya.
     *
     * Moment menyimpan zona waktu; `toDate()` lalu `tanggalLokal()` harus
     * menghasilkan hari yang SAMA dengan yang dipilih di layar.
     */
    const f = pasang();
    const k = f.componentInstance;

    k.mode.set('rentang');
    k.mulai.set(k.keTanggal(moment('2026-09-01')));
    k.akhir.set(k.keTanggal(moment('2026-09-14')));
    k.unduh();

    expect(ditutupDengan).toEqual(
      jasmine.objectContaining({ mulai: '2026-09-01', akhir: '2026-09-14' }),
    );
  });

  // ------------------------------------------------------------------
  // `keTanggal` sendiri
  // ------------------------------------------------------------------

  it('menerima Moment, Date, teks, dan angka', () => {
    expect(keTanggal(moment('2026-09-14'))?.getDate()).toBe(14);
    expect(keTanggal(new Date(2026, 8, 14))?.getDate()).toBe(14);
    expect(keTanggal('2026-09-14')?.getDate()).toBe(14);
    expect(keTanggal(new Date(2026, 8, 14).getTime())?.getDate()).toBe(14);
  });

  it('teks `YYYY-MM-DD` diurai sebagai tanggal SETEMPAT', () => {
    /*
     * `new Date('2026-09-14')` dibaca sebagai tengah malam UTC. Di Jakarta
     * itu masih 14 September, jadi kelihatan benar — tetapi di zona barat UTC
     * ia mundur ke tanggal 13, dan rekap yang diunduh bergeser sehari tanpa
     * satu pun pesan galat.
     *
     * Karma berjalan pada UTC, jadi perbedaannya TIDAK terlihat di sini bila
     * penguraiannya diserahkan ke `new Date`. Yang diperiksa karena itu
     * BENTUK hasilnya: tengah malam waktu setempat, bukan pukul berapa pun
     * yang lain.
     */
    const d = keTanggal('2026-09-14')!;
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8);
    expect(d.getDate()).toBe(14);
    expect(d.getHours()).toBe(0);
  });

  it('nilai kosong dan tidak sah menjadi null, bukan Invalid Date', () => {
    /*
     * `Invalid Date` lolos `instanceof Date` lalu meracuni setiap hitungan di
     * belakangnya — `getTime()` menghasilkan `NaN`, dan `NaN` tidak pernah
     * lebih besar maupun lebih kecil dari apa pun, jadi seluruh penjagaan
     * rentangnya diam-diam menjawab `false`.
     */
    expect(keTanggal(null)).toBeNull();
    expect(keTanggal(undefined)).toBeNull();
    expect(keTanggal('')).toBeNull();
    expect(keTanggal('bukan tanggal')).toBeNull();
    expect(keTanggal(new Date('x'))).toBeNull();
    expect(keTanggal(moment('bukan tanggal'))).toBeNull();
    expect(keTanggal({})).toBeNull();
  });

  it('tanggal tidak sah membuat formulirnya TIDAK sah', () => {
    const f = pasang();
    const k = f.componentInstance;

    k.mode.set('rentang');
    k.mulai.set(k.keTanggal(moment('bukan tanggal')));
    k.akhir.set(k.keTanggal(moment('2026-09-14')));

    expect(k.sah())
      .withContext('tanggal mulai tidak sah tetapi tombol unduh tetap hidup')
      .toBeFalse();
  });
});
