/**
 * Posisi kas: angka yang MENERANGKAN angka lain harus ikut benar.
 *
 * DUA HAL YANG DILAPORKAN DARI LAYAR
 *
 * 1. "ini tulisannya masih dari 12 rekening bang di header"
 *
 *    Sesudah rekening yang dikecualikan berhenti masuk Total Saldo, kepala
 *    kartunya masih berbunyi "12 rekening" tepat di atas total yang hanya
 *    berisi delapan. Tidak ada yang merah, tidak ada angka yang salah hitung —
 *    hanya keterangan yang tidak lagi cocok dengan angka yang diterangkannya,
 *    dan itu justru lebih sulit disadari daripada angka yang salah.
 *
 * 2. "-Rp 0"
 *
 *    Saldo −0,3 dibulatkan menjadi "Rp 0" oleh `Intl.NumberFormat`, tetapi
 *    tandanya ikut tercetak dan `n < 0` mewarnainya merah. Di layar itu
 *    terbaca sebagai rekening bermasalah, padahal saldonya nol.
 *
 * Keduanya sekelas: dua aturan untuk satu angka, yang berselisih di tepinya.
 */

import { TestBed } from '@angular/core/testing';

import { ApiService } from '../../../services/api.service';
import { CashPositionComponent } from './cash-position.component';

function komponen(): any {
  TestBed.configureTestingModule({
    providers: [
      {
        provide: ApiService,
        useValue: { get: () => ({ subscribe: () => ({ add: () => {} }) }) },
      },
    ],
  });
  return TestBed.runInInjectionContext(
    () => new (CashPositionComponent as any)(TestBed.inject(ApiService)),
  );
}

afterEach(() => TestBed.resetTestingModule());

describe('posisi kas — hitungan di kepala kartu', () => {
  it('menyebut rekening yang MENDUKUNG total, bukan seluruhnya', () => {
    const c = komponen();
    c.accounts = new Array(12).fill(0).map((_, i) => ({ bankAccountID: i }));
    c.excludedCount = 4;

    expect(c.jumlahDihitung)
      .withContext(
        '"12 rekening" di atas total yang hanya berisi delapan adalah ' +
          'keterangan yang salah tentang angka di bawahnya',
      )
      .toBe(8);
  });

  it('tanpa pengecualian, hitungannya seluruh rekening', () => {
    const c = komponen();
    c.accounts = new Array(12).fill(0).map((_, i) => ({ bankAccountID: i }));
    c.excludedCount = 0;

    expect(c.jumlahDihitung).toBe(12);
  });

  it('tidak pernah negatif meski jawabannya tidak konsisten', () => {
    // Backend lama / jawaban setengah jalan: `excludedCount` melebihi jumlah
    // baris. "−2 rekening dihitung" lebih buruk daripada nol.
    const c = komponen();
    c.accounts = [{ bankAccountID: 1 }];
    c.excludedCount = 3;

    expect(c.jumlahDihitung).toBe(0);
  });
});

describe('posisi kas — nol negatif', () => {
  it('tidak pernah mencetak tanda minus pada nol', () => {
    const c = komponen();

    for (const n of [-0, -0.3, -0.49, 0, 0.4]) {
      expect(c.formatIDR(n))
        .withContext(`${n} tercetak dengan tanda minus`)
        .not.toContain('-');
    }
  });

  it('tetap mencetak minus pada angka yang benar-benar negatif', () => {
    const c = komponen();

    expect(c.formatIDR(-4_511_900)).toContain('-');
    expect(c.formatIDR(-1)).toContain('-');
  });

  it('warna merahnya sepakat dengan angka yang tercetak', () => {
    /*
     * Inilah selisihnya. `n < 0` menyala untuk −0,3, sementara
     * `formatIDR(−0,3)` berbunyi "Rp 0" — rekening bersaldo nol terbaca
     * sebagai rekening bermasalah.
     */
    const c = komponen();

    for (const n of [-0, -0.3, -0.49, 0, 5]) {
      expect(c.negatif(n))
        .withContext(`${n} diwarnai merah padahal tercetak nol/positif`)
        .toBeFalse();
    }

    expect(c.negatif(-1)).toBeTrue();
    expect(c.negatif(-4_511_900)).toBeTrue();
  });
});
