import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Router, RouterModule, provideRouter } from '@angular/router';

import { DURASI_MAX, MULAI_TRANSISI, transisiRute } from './transisi-rute';

/**
 * Halaman LAMA tertinggal di layar bersama yang baru.
 *
 * KELUHANNYA, beserta tangkapan layarnya: membuka Pengaturan, dan selama
 * beberapa detik daftar Faktur Penjualan masih tergambar DI ATAS halaman
 * Pengaturan. Dua halaman bertumpuk.
 *
 * SEBABNYA
 *
 * Mesin animasi Angular MENUNDA pembuangan simpul anak selama induknya masih
 * punya animasi yang berjalan. Pemicu `transisiRute` terpasang pada pembungkus
 * `<router-outlet>`; saat rute berganti, router membuang komponen lama dari
 * pembungkus itu — dan pembuangannya ditahan sampai animasinya selesai.
 *
 * Selama durasinya 300ms hal ini nyaris tidak terlihat, dan itu sebabnya ia
 * tidak pernah muncul sebelumnya. Begitu durasinya dapat disetel sampai 1,5
 * detik, halaman lamanya bertahan di layar selama itu juga — dan itu bukan
 * kedipan lagi, itu kerusakan yang terbaca.
 *
 * Perhatikan bahwa animasi "tanpa `:leave`" yang saya tulis TIDAK menghindari
 * hal ini. Yang menahan simpulnya bukan animasi keluar; yang menahannya mesin
 * animasinya sendiri, dan itu berlaku ada atau tidak ada `:leave`.
 *
 * BERKAS INI TIDAK BERHASIL MEREPRODUKSINYA
 *
 * Harus dikatakan terus terang, karena kalau tidak, berkas ini akan terbaca
 * sebagai penjaga padahal bukan: uji di bawah HIJAU dengan maupun tanpa
 * penanganan `:leave` di `transisi-rute.ts`. Saya sudah mencobanya — melepas
 * penanganannya tidak membuat satu pun uji di sini merah.
 *
 * Artinya: di dalam Karma, simpul halaman lama terbuang seketika, baik lewat
 * `@if` maupun lewat router sungguhan. Yang terjadi di peramban Daniel —
 * dengan tangkapan layarnya sebagai bukti — TIDAK terjadi di sini. Jadi
 * sebabnya belum saya pahami.
 *
 * Berkas ini disimpan sebagai CATATAN tentang apa yang sudah dicoba, bukan
 * sebagai jaminan. Yang membacanya nanti tidak perlu mengulangi dua harness
 * yang sama.
 *
 * Satu hal yang terbukti: mengukur `getComputedStyle(display)` pada anak
 * adalah cara yang SALAH untuk menanyakan "apakah ini tergambar" —
 * `display: none` pada induknya tidak mengubah nilai milik anaknya. Yang
 * benar menanyakan apakah ia menempati ruang.
 */

@Component({
  standalone: true,
  template: `<p id="halaman-a" style="height:400px">halaman A</p>`,
})
class HalamanA {}

@Component({
  standalone: true,
  template: `<p id="halaman-b" style="height:400px">halaman B</p>`,
})
class HalamanB {}

/**
 * Tuan rumah dengan ROUTER SUNGGUHAN.
 *
 * Harness dengan `@if` biasa TIDAK mereproduksi persoalannya — saya
 * mencobanya lebih dulu dan simpulnya terbuang seketika. Jalur yang menahan
 * simpul adalah jalur ROUTER: komponen halaman disisipkan `router-outlet`
 * sebagai saudara di dalam pembungkus yang sedang beranimasi, dan
 * pembuangannya lewat `ViewContainerRef`, bukan lewat struktur template.
 */
@Component({
  standalone: true,
  imports: [RouterModule],
  animations: [transisiRute],
  template: `
    <div
      id="bungkus"
      [@transisiRute]="{
        value: kunci,
        params: { durasi: durasi, jeda: 0, mulai: mulai },
      }"
    >
      <router-outlet></router-outlet>
    </div>
  `,
})
class TuanRumah {
  kunci = '/a';
  durasi = DURASI_MAX;
  mulai = MULAI_TRANSISI['morph'];
}

describe('Tumpukan halaman saat transisi (router sungguhan)', () => {
  let harness: ComponentFixture<TuanRumah>;
  let router: Router;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [TuanRumah, BrowserAnimationsModule],
      providers: [
        provideRouter([
          { path: 'a', component: HalamanA },
          { path: 'b', component: HalamanB },
        ]),
      ],
    });
    router = TestBed.inject(Router);
    harness = TestBed.createComponent(TuanRumah);
    harness.detectChanges();
    await router.navigate(['/a']);
    harness.componentInstance.kunci = '/a';
    harness.detectChanges();
  });

  it('halaman lama TIDAK tergambar bersama yang baru', async () => {
    const el = harness.nativeElement as HTMLElement;
    expect(el.querySelector('#halaman-a')).withContext('halaman A belum ada').toBeTruthy();

    // Selesaikan animasi masuknya dulu supaya yang diukur benar-benar
    // perpindahannya, bukan sisa animasi sebelumnya.
    (el.querySelector('#bungkus') as any)
      .getAnimations()
      .forEach((x: Animation) => x.finish());

    await router.navigate(['/b']);
    harness.componentInstance.kunci = '/b';
    harness.detectChanges();

    const lama = el.querySelector('#halaman-a') as HTMLElement | null;
    expect(el.querySelector('#halaman-b')).withContext('halaman B harus ada').toBeTruthy();

    if (lama) {
      /*
       * Diukur KOTAKNYA, bukan `getComputedStyle(display)`.
       *
       * `query(':leave')` mencocokkan HOST komponen yang keluar
       * (`<ng-component>`), bukan `<p>` di dalamnya. `display: none` pada
       * induknya membuat anaknya tidak tergambar — tetapi
       * `getComputedStyle(anak).display` tetap `block`, karena itu nilai
       * milik anaknya sendiri. Pemeriksaan gaya di sini merah untuk sebab
       * yang salah; yang benar adalah menanyakan apakah ia MENEMPATI RUANG.
       */
      expect(lama.getClientRects().length)
        .withContext(
          'halaman lama masih tergambar bersama yang baru — inilah dua ' +
            'halaman bertumpuk yang terlihat di tangkapan layar',
        )
        .toBe(0);
    }
  });

  it('tinggi pembungkus tidak menggelembung jadi dua halaman', async () => {
    /*
     * Akibat yang membuat push-up/push-down terasa "tidak jalan".
     *
     * Dengan dua halaman bertumpuk, pembungkusnya menjadi dua kali lebih
     * tinggi. Gerakan 18px pada elemen setinggi itu praktis tidak terbaca —
     * sementara `scale()` (morph) tetap terlihat karena ia menskalakan
     * SELURUHNYA. Itu sebabnya morph "jalan" dan yang lain "tidak".
     */
    const el = harness.nativeElement as HTMLElement;
    const bungkus = el.querySelector('#bungkus') as HTMLElement;
    (bungkus as any).getAnimations().forEach((x: Animation) => x.finish());
    const sebelum = bungkus.getBoundingClientRect().height;

    await router.navigate(['/b']);
    harness.componentInstance.kunci = '/b';
    harness.detectChanges();

    const sesudah = bungkus.getBoundingClientRect().height;
    expect(sesudah)
      .withContext(`tinggi melonjak ${sebelum} -> ${sesudah}`)
      .toBeLessThan(sebelum * 1.5);
  });
});
