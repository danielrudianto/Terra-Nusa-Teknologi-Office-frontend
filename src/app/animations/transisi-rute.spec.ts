import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import {
  DURASI_TRANSISI,
  JEDA_JUDUL,
  durasiHormatiGerak,
  transisiRute,
  transisiRuteBersarang,
} from './transisi-rute';

/**
 * Transisi antar halaman: apakah ia BENAR-BENAR jalan.
 *
 * KENAPA UJI INI ADA
 *
 * Transisi halaman sudah dikirim sekali dan dilaporkan "masih tidak ada".
 * Pemeriksa statis `transisicek.py` hijau — ia memeriksa bahwa pemicunya
 * terpasang di pembungkus, bahwa `query` memakai `optional: true`, dan
 * seterusnya. Semua itu benar, dan tidak satu pun membuktikan ada yang
 * BERGERAK di layar.
 *
 * Kelas kegagalannya memang begitu: animasi yang tidak jalan tidak melempar,
 * tidak mencatat apa pun, dan meninggalkan halaman yang terlihat normal.
 * Satu-satunya bukti adalah menanyakan kepada peramban apakah ada animasi
 * yang sedang berjalan pada elemennya.
 *
 * Karma menjalankan Chrome sungguhan dan `BrowserAnimationsModule` memakai
 * Web Animations API, jadi `Element.getAnimations()` menjawab persis itu.
 */

@Component({
  standalone: true,
  animations: [transisiRute],
  template: `
    <div
      id="bungkus"
      [@transisiRute]="{
        value: kunci,
        params: { durasi: durasi, jeda: jeda },
      }"
    >
      <app-header-title>judul</app-header-title>
      <p>isi halaman</p>
    </div>
  `,
  // `app-header-title` tidak dikenal di sini; dibiarkan sebagai elemen tak
  // dikenal supaya `query()` tetap menemukannya seperti di aplikasinya.
  schemas: [],
})
class TuanRumah {
  kunci = '/Awal';
  durasi = DURASI_TRANSISI;
  jeda = JEDA_JUDUL;
}

@Component({
  standalone: true,
  animations: [transisiRuteBersarang],
  template: `
    <div
      id="bungkus"
      [@transisiRuteBersarang]="{ value: kunci, params: { durasi: durasi } }"
    >
      <p>isi</p>
    </div>
  `,
})
class TuanRumahBersarang {
  kunci = '/Awal';
  durasi = DURASI_TRANSISI;
}

/**
 * Animasi yang BENAR-BENAR sedang berjalan pada elemen ini.
 *
 * `getAnimations()` juga mengembalikan yang sudah SELESAI selama efeknya
 * masih menempel. Tanpa menyaring `playState`, uji "tidak ada animasi" akan
 * menghitung sisa animasi sebelumnya dan merah karena sebab palsu — dan uji
 * yang merah karena sebab palsu adalah uji yang akhirnya dimatikan orang.
 */
function animasiAktif(el: Element): Animation[] {
  if (typeof (el as any).getAnimations !== 'function') return [];
  return ((el as any).getAnimations() as Animation[]).filter(
    (a) => a.playState === 'running' || a.playState === 'paused',
  );
}

describe('Transisi rute', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  function pasang<T>(jenis: any) {
    TestBed.configureTestingModule({
      imports: [jenis, BrowserAnimationsModule],
      // `app-header-title` tidak dideklarasikan; tanpa ini Angular menolak
      // elemen yang tidak dikenal dan ujinya gagal karena sebab palsu.
      errorOnUnknownElements: false,
      errorOnUnknownProperties: false,
    });
    const f = TestBed.createComponent<T>(jenis);
    f.detectChanges();
    return f;
  }

  it('PEMICUNYA benar-benar menghasilkan animasi saat kuncinya berubah', () => {
    /*
     * Penjaga langsung atas laporan "transisinya tidak ada".
     *
     * Bukan memeriksa bahwa pemicunya terpasang — itu sudah dijaga pemeriksa
     * statis, dan ia hijau sementara layarnya diam. Yang ditanyakan di sini:
     * apakah peramban punya animasi yang SEDANG BERJALAN pada elemennya.
     */
    const f = pasang<TuanRumah>(TuanRumah);
    const bungkus: HTMLElement = f.nativeElement.querySelector('#bungkus');

    f.componentInstance.kunci = '/Kalender';
    f.detectChanges();

    const jalan = animasiAktif(bungkus);
    expect(jalan.length)
      .withContext(
        'tidak ada animasi yang berjalan pada pembungkus — perpindahan ' +
          'halaman akan terlihat berganti begitu saja',
      )
      .toBeGreaterThan(0);
  });

  it('kunci yang TIDAK berubah tidak menghasilkan animasi', () => {
    /*
     * Sisi sebaliknya, dan ini yang menjelaskan kenapa rute ber-`path: ''`
     * dulu diam: `* => *` hanya menyala bila NILAINYA berbeda. Kunci yang
     * sama pada dua halaman berbeda berarti animasinya tidak pernah jalan,
     * tanpa satu pun tanda.
     */
    const f = pasang<TuanRumah>(TuanRumah);
    const bungkus: HTMLElement = f.nativeElement.querySelector('#bungkus');
    (bungkus as any).getAnimations().forEach((a: Animation) => a.finish());

    f.componentInstance.kunci = '/Awal'; // sama seperti sebelumnya
    f.detectChanges();

    expect(animasiAktif(bungkus).length).toBe(0);
  });

  it('durasi 0 membuatnya lewat tanpa terlihat', () => {
    /*
     * "Kurangi gerak" menyetel durasinya 0. Itu disengaja — tetapi juga
     * berarti bahwa siapa pun yang menyalakannya di sistem operasinya akan
     * melaporkan "tidak ada transisi", dan itu BUKAN bug.
     *
     * Diuji supaya perbedaan kedua keadaan itu tercatat di suatu tempat,
     * bukan ditebak setiap kali ada yang melaporkannya.
     */
    const f = pasang<TuanRumah>(TuanRumah);
    const bungkus: HTMLElement = f.nativeElement.querySelector('#bungkus');
    (bungkus as any).getAnimations().forEach((a: Animation) => a.finish());

    f.componentInstance.durasi = 0;
    f.componentInstance.kunci = '/Lain';
    f.detectChanges();

    const total = animasiAktif(bungkus).reduce(
      (a, x) => a + Number((x.effect?.getTiming().duration as number) ?? 0),
      0,
    );
    expect(total).toBe(0);
  });

  it('kemunculan pertama IKUT beranimasi pada kerangka utama', () => {
    /*
     * `void => *` cocok dengan `* => *`, jadi membuka halaman pertama kali
     * pun bergerak. Itu memang dimaksudkan di kerangka utama — yang tidak
     * dimaksudkan ada di layout bersarang, diuji di bawah.
     */
    const f = pasang<TuanRumah>(TuanRumah);
    const bungkus: HTMLElement = f.nativeElement.querySelector('#bungkus');
    expect(animasiAktif(bungkus).length).toBeGreaterThan(0);
  });

  it('layout BERSARANG tidak beranimasi pada kemunculan pertama', () => {
    /*
     * Kalau ini hilang, membuka Data Master memainkan dua animasi sekaligus —
     * kerangka utama dan outlet di dalamnya — dan opasitasnya berkalian,
     * sehingga isinya terbaca sampai lebih lambat daripada yang dimaksudkan
     * keduanya.
     */
    const f = pasang<TuanRumahBersarang>(TuanRumahBersarang);
    const bungkus: HTMLElement = f.nativeElement.querySelector('#bungkus');
    expect(animasiAktif(bungkus).length).toBe(0);
  });

  it('layout bersarang TETAP beranimasi saat berpindah di dalamnya', () => {
    const f = pasang<TuanRumahBersarang>(TuanRumahBersarang);
    const bungkus: HTMLElement = f.nativeElement.querySelector('#bungkus');

    f.componentInstance.kunci = '/Master/Item';
    f.detectChanges();

    expect(animasiAktif(bungkus).length).toBeGreaterThan(0);
  });

  it('durasiHormatiGerak mengembalikan angka yang masuk akal', () => {
    const d = durasiHormatiGerak();
    expect(d === 0 || d === DURASI_TRANSISI).toBeTrue();
    expect(durasiHormatiGerak(500) === 0 || durasiHormatiGerak(500) === 500)
      .toBeTrue();
  });
});
