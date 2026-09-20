/**
 * Daftar margin proyek di layar sempit — kartu, bukan tabel.
 *
 * KELUHANNYA
 *
 * "pakai table di project list tuh ide buruk karena harus scroll scroll
 * kebanyakan kata gw, mendingan kaya expansion panel gitu kali ya"
 *
 * Tujuh kolom angka pada layar 390px berarti tiap baris harus digulir
 * menyamping untuk dibaca utuh — dan gulir menyamping membawa pergi kolom
 * nama proyeknya, sehingga yang terbaca tinggal deretan angka tanpa
 * keterangan milik siapa.
 *
 * KENAPA HAL-HAL INI YANG DIUJI
 *
 * Ketiganya gagal TANPA GALAT:
 *
 *   1. Ambangnya tidak pernah dibaca — `kompak` tetap `false` selamanya, dan
 *      tabelnya kembali di ponsel. Tidak ada yang merah; layarnya cuma
 *      kembali seperti sebelum perbaikan ini.
 *   2. Panelnya dibiarkan terbuka semua — persoalan yang sedang dipecahkan
 *      kembali dalam bentuk lain: halaman yang panjangnya berlipat.
 *   3. `pilihUrut` memakai `gantiUrut`, yang MEMBALIK arah bila kolomnya
 *      sama. Pada `<select>` itu berarti arah urutannya berubah sendiri
 *      setiap kali pilihannya diganti — dan yang melihatnya akan menyangka
 *      datanya yang aneh, bukan pengurutannya.
 */

import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { ApiService } from '../../../services/api.service';
import { ProjectMarginListComponent } from './project-margin-list.component';

function komponen(): any {
  TestBed.configureTestingModule({
    providers: [
      {
        provide: ApiService,
        useValue: { get: () => ({ subscribe: () => ({ add: () => {} }) }) },
      },
      { provide: Router, useValue: { navigate: () => {} } },
    ],
  });
  return TestBed.runInInjectionContext(
    () => new (ProjectMarginListComponent as any)(),
  );
}

afterEach(() => TestBed.resetTestingModule());

/** Menyetel lebar jendela lalu memanggil pengukurnya, seperti `resize`. */
function lebar(c: any, px: number): void {
  Object.defineProperty(window, 'innerWidth', {
    value: px,
    configurable: true,
    writable: true,
  });
  c.ukurLayar();
}

const LEBAR_ASLI = window.innerWidth;
afterAll(() => lebar({ ukurLayar: () => {} }, LEBAR_ASLI));

describe('daftar margin proyek di layar sempit', () => {
  it('beralih ke kartu di bawah ambangnya, dan kembali ke tabel di atasnya', () => {
    const c = komponen();

    lebar(c, 390); // ponsel
    expect(c.kompak).withContext('ponsel harus dapat kartu').toBeTrue();

    lebar(c, 1440); // laptop
    expect(c.kompak).withContext('laptop harus tetap tabel').toBeFalse();
  });

  it('ambangnya sama dengan yang dipakai kerangka utama', () => {
    /*
     * 900px bukan angka yang dipilih di sini — itu `AMBANG_SEMPIT` di
     * `main.component.ts`, titik ketika sidenav berubah MENUTUPI isi halaman
     * sehingga lebar yang tersisa untuk tabel berkurang mendadak.
     *
     * Dua ambang yang "mirip" akan berbeda dalam sebulan, dan bedanya hanya
     * terasa pada satu ukuran layar yang tidak dimiliki siapa pun yang
     * mengujinya.
     */
    const c = komponen();

    lebar(c, 899);
    expect(c.kompak).toBeTrue();

    lebar(c, 900);
    expect(c.kompak).toBeFalse();
  });

  it('hanya SATU panel terbuka pada satu waktu', () => {
    const c = komponen();
    const a = { code: 'R501' } as any;
    const b = { code: 'R502' } as any;

    c.ubahPanel(a);
    expect(c.panelTerbuka(a)).toBeTrue();

    c.ubahPanel(b);
    expect(c.panelTerbuka(b)).toBeTrue();
    expect(c.panelTerbuka(a))
      .withContext(
        'dua panel terbuka sekaligus mengembalikan halaman yang panjangnya ' +
          'berlipat — persoalan yang sedang dipecahkan',
      )
      .toBeFalse();
  });

  it('menekan panel yang sama menutupnya', () => {
    const c = komponen();
    const a = { code: 'R501' } as any;

    c.ubahPanel(a);
    c.ubahPanel(a);
    expect(c.panelTerbuka(a)).toBeFalse();
  });

  it('mengganti kolom urut TIDAK menyentuh arahnya', () => {
    /*
     * Arah urutan punya tombolnya sendiri di layar sempit. `gantiUrut`
     * menyetel `naik = false` setiap kali kolomnya berbeda — jadi memakainya
     * di sini membuat tombol yang baru saja ditekan berubah sendiri begitu
     * kolomnya diganti.
     */
    const c = komponen();

    c.naik = true;
    c.pilihUrut('kontrak');
    expect(c.urut).toBe('kontrak');
    expect(c.naik)
      .withContext('arah urutan ikut berubah saat kolomnya diganti')
      .toBeTrue();

    c.pilihUrut('biaya');
    expect(c.naik).toBeTrue();

    c.naik = false;
    c.pilihUrut('tertagih');
    expect(c.naik).toBeFalse();
  });

  it('setiap pilihan urut punya padanan di `Urut`', () => {
    /*
     * Pilihan yang nilainya tidak dikenali `daftar` akan jatuh ke `default:
     * return 0` — seluruh baris bernilai sama, urutannya tidak berubah, dan
     * tidak ada galat. Yang memilihnya akan menyangka datanya yang kebetulan
     * sudah urut.
     */
    const c = komponen();
    const dikenal = [
      'code',
      'kontrak',
      'tertagih',
      'belum',
      'biaya',
      'margin',
      'persen',
    ];

    for (const o of c.pilihanUrut) {
      expect(dikenal)
        .withContext(`pilihan urut "${o.nilai}" tidak dikenali`)
        .toContain(o.nilai);
      expect(o.kunci)
        .withContext(`pilihan urut "${o.nilai}" tanpa kunci terjemahan`)
        .toMatch(/^projectMargin\./);
    }
  });
});
