/*
 * KERANGKA KALENDER HANYA UNTUK MUAT PERTAMA.
 *
 * Kerangkanya menutup `cal-cell__value` lewat CSS — hanya itu. Ikon
 * pindah-rekening, tanggal, penanda hari ini, dan ringkasan "Rencana kas
 * bulan ini" TIDAK ikut tertutup, karena ketiganya bukan elemen itu dan
 * datanya memang tidak dihapus saat memuat ulang.
 *
 * Pada muat PERTAMA itu tidak terlihat: belum ada apa-apa di layar. Pada
 * muat KEDUA — ganti rekening, tekan segarkan — hasilnya kisi setengah
 * jadi: ikon dan ringkasan menunjukkan angka sungguhan sementara
 * sel-selnya berkilau kosong. Yang membacanya tidak dapat tahu bagian mana
 * yang final, dan itu terbaca seperti layar rusak, bukan layar bekerja.
 *
 * Sesudah pernah ada data, yang dipakai bilah tipis di atas kisi.
 */

import { SimpleChange } from '@angular/core';

import { CalendarTableComponent } from './calendar-table.component';

/** Dirakit dari prototipenya — sepuluh layanan di konstruktornya tidak satu
 *  pun menentukan perilaku yang diuji di sini. */
function tabel(over: any = {}): any {
  const c: any = Object.create(CalendarTableComponent.prototype);
  c.memuat = false;
  c.muncul = false;
  c.pernahAdaData = false;
  c.month = 8;
  c.year = 2026;
  c.rekeningSiap = true;
  c.bankAccounts = [];
  c.weeks = [];
  c.dipanggil = 0;
  c.generateCalendar = () => c.dipanggil++;
  Object.assign(c, over);
  return c;
}

function ubah(nilai: any) {
  return new SimpleChange(null, nilai, false);
}

describe('Kalender — kerangka hanya sekali', () => {
  it('muat pertama: kerangka, bukan bilah', () => {
    const c = tabel({ memuat: true, pernahAdaData: false });
    expect(c.kerangka).toBeTrue();
    expect(c.menyegarkan).toBeFalse();
  });

  it('muat KEDUA: bilah, bukan kerangka', () => {
    const c = tabel({ memuat: true, pernahAdaData: true });
    expect(c.kerangka).toBeFalse();
    expect(c.menyegarkan).toBeTrue();
  });

  it('selesai memuat: dua-duanya mati', () => {
    const c = tabel({ memuat: false, pernahAdaData: true });
    expect(c.kerangka).toBeFalse();
    expect(c.menyegarkan).toBeFalse();
  });
});

describe('Kalender — ganti tampilan tidak menarik ulang', () => {
  it('viewMode saja: TIDAK memuat ulang', () => {
    /*
     * Permintaan `calendar` tidak pernah menyebut `viewMode` — ia memilih
     * angka mana yang dibaca dari jawaban yang sama. Menarik ulang
     * mengambil jawaban yang identik, dan satu ketukan pada "Saldo
     * (rencana)" membuat seluruh kisi berkilau seolah bulannya berganti.
     */
    const c = tabel();
    c.ngOnChanges({ viewMode: ubah('balance-plan') });
    expect(c.dipanggil).toBe(0);
  });

  it('selectedDay saja: TIDAK memuat ulang', () => {
    const c = tabel();
    c.ngOnChanges({ selectedDay: ubah(12) });
    expect(c.dipanggil).toBe(0);
  });

  it('viewMode + selectedDay bersamaan: tetap tidak', () => {
    const c = tabel();
    c.ngOnChanges({ viewMode: ubah('balance-actual'), selectedDay: ubah(3) });
    expect(c.dipanggil).toBe(0);
  });

  it('BULAN berganti: memuat ulang', () => {
    const c = tabel();
    c.ngOnChanges({ month: ubah(9) });
    expect(c.dipanggil).toBe(1);
  });

  it('bulan BERSAMA viewMode: tetap memuat ulang', () => {
    /*
     * Penjaga arah sebaliknya. Kalau syaratnya ditulis "ada viewMode →
     * berhenti", pergantian bulan yang kebetulan dibarengi pergantian
     * tampilan akan dilewati — dan kalendernya menampilkan bulan lain
     * dengan angka bulan sebelumnya, tanpa satu pun tanda.
     */
    const c = tabel();
    c.ngOnChanges({ month: ubah(9), viewMode: ubah('expense') });
    expect(c.dipanggil).toBe(1);
  });

  it('rekening berganti: memuat ulang', () => {
    const c = tabel();
    c.ngOnChanges({ bankAccounts: ubah([{ id: 1, selected: true }]) });
    expect(c.dipanggil).toBe(1);
  });

  it('penyegar dinaikkan: memuat ulang', () => {
    const c = tabel();
    c.ngOnChanges({ penyegar: ubah(1) });
    expect(c.dipanggil).toBe(1);
  });

  it('pemasangan pertama (seluruh input sekaligus): memuat', () => {
    const c = tabel();
    c.ngOnChanges({
      month: ubah(8),
      year: ubah(2026),
      bankAccounts: ubah([]),
      rekeningSiap: ubah(true),
      viewMode: ubah('expense'),
      penyegar: ubah(0),
    });
    expect(c.dipanggil).toBe(1);
  });
});
