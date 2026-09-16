import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import {
  DURASI_BAWAAN,
  DURASI_MAX,
  DURASI_MIN,
  JENIS_TRANSISI,
  JenisTransisi,
  MULAI_TRANSISI,
  jepitDurasi,
  setelanTransisi,
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
        params: { durasi: durasi, jeda: jeda, mulai: mulai },
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
  durasi = DURASI_BAWAAN;
  jeda = 70;
  mulai = MULAI_TRANSISI['push-up'];
}

@Component({
  standalone: true,
  animations: [transisiRuteBersarang],
  template: `
    <div
      id="bungkus"
      [@transisiRuteBersarang]="{ value: kunci, params: { durasi: durasi, mulai: 'translateY(10px)' } }"
    >
      <p>isi</p>
    </div>
  `,
})
class TuanRumahBersarang {
  kunci = '/Awal';
  durasi = DURASI_BAWAAN;
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

  // ------------------------------------------------------------------
  // Jenis dan durasi yang DIPILIH PENGGUNA
  // ------------------------------------------------------------------

  it('setiap jenis punya transform awal yang BERBEDA', () => {
    /*
     * Kalau dua jenis menghasilkan transform yang sama, pilihannya ada di
     * layar tetapi tidak berarti apa-apa — dan yang memilihnya menyimpulkan
     * setelannya rusak. Tidak ada galat, tentu saja.
     */
    const mulai = JENIS_TRANSISI.filter((j) => j.nilai !== 'none').map(
      (j) => setelanTransisi(j.nilai, 500).mulai,
    );
    expect(new Set(mulai).size).toBe(mulai.length);
  });

  it('arah naik dan turun benar-benar berlawanan', () => {
    const naik = setelanTransisi('push-up', 500).mulai;
    const turun = setelanTransisi('push-down', 500).mulai;
    expect(naik).toContain('translateY(18px)');
    expect(turun).toContain('translateY(-18px)');
  });

  it('geser kiri dan kanan berlawanan pada sumbu X', () => {
    expect(setelanTransisi('slide-left', 500).mulai).toContain('translateX(28px)');
    expect(setelanTransisi('slide-right', 500).mulai).toContain('translateX(-28px)');
  });

  it('morph tidak MEMINDAHKAN apa pun', () => {
    // Inilah jenis yang aman bagi yang menyalakan "kurangi gerak": ia
    // berubah ukuran, tidak berpindah tempat.
    const m = setelanTransisi('morph', 500).mulai;
    expect(m).toContain('scale(');
    expect(m).not.toContain('translate');
  });

  it('durasi dijepit ke rentang yang sah', () => {
    expect(jepitDurasi(50)).toBe(DURASI_MIN);
    expect(jepitDurasi(9999)).toBe(DURASI_MAX);
    expect(jepitDurasi(500)).toBe(500);
    expect(jepitDurasi('bukan angka')).toBe(DURASI_BAWAAN);
    // `Number(null)` dan `Number('')` sama-sama 0 — dan 0 itu terhingga.
    // Tanpa penjagaan khusus, keduanya dijepit ke 100ms, bukan ke bawaannya.
    expect(jepitDurasi(null)).toBe(DURASI_BAWAAN);
    expect(jepitDurasi(undefined)).toBe(DURASI_BAWAAN);
    expect(jepitDurasi('')).toBe(DURASI_BAWAAN);
    expect(setelanTransisi('push-up', 5).durasi).toBe(DURASI_MIN);
    expect(setelanTransisi('push-up', 99999).durasi).toBe(DURASI_MAX);
  });

  it('jeda ketukan kedua menyusut bersama durasinya', () => {
    /*
     * Jeda tetap 70ms pada transisi 120ms berarti judulnya baru MULAI
     * bergerak saat isinya sudah selesai — dua ketukan yang dimaksud saling
     * mendahului, dan hasilnya terbaca sebagai tersendat.
     */
    expect(setelanTransisi('push-up', 120).jeda).toBeLessThan(120);
    expect(setelanTransisi('push-up', 1500).jeda).toBe(70);
  });

  it('"tidak ada" memang meniadakan — dan itu pilihan sadar', () => {
    const s = setelanTransisi('none', 500);
    expect(s.durasi).toBe(0);
    expect(s.mulai).toBe('none');
  });

  it('jenis yang tidak dikenal kembali ke push-up, bukan kosong', () => {
    // Nilai dari localStorage dapat berisi apa saja — termasuk sisa versi
    // lama. Transform kosong membuat animasinya tidak menggerakkan apa pun.
    const s = setelanTransisi('ngawur' as JenisTransisi, 500);
    expect(s.mulai).toBe(MULAI_TRANSISI['push-up']);
  });

  it('SETIAP jenis benar-benar menghasilkan animasi di peramban', () => {
    /*
     * Penjaga yang sesungguhnya. Angka yang benar tidak membuktikan ada yang
     * bergerak; hanya peramban yang dapat menjawabnya.
     */
    // Dipasang SEKALI lalu jenisnya diganti-ganti; memanggil
    // `configureTestingModule` lagi setelah modulnya terbentuk ditolak
    // TestBed, dan galatnya menyebut `inject`, bukan penyebab sebenarnya.
    const f = pasang<TuanRumah>(TuanRumah);
    const bungkus: HTMLElement = f.nativeElement.querySelector('#bungkus');

    for (const j of JENIS_TRANSISI) {
      if (j.nilai === 'none') continue;

      (bungkus as any).getAnimations().forEach((a: Animation) => a.finish());

      const s = setelanTransisi(j.nilai, 500);
      f.componentInstance.durasi = s.durasi;
      f.componentInstance.jeda = s.jeda;
      f.componentInstance.mulai = s.mulai;
      f.componentInstance.kunci = '/Halaman-' + j.nilai;
      f.detectChanges();

      expect(animasiAktif(bungkus).length)
        .withContext(`jenis "${j.nilai}" tidak menghasilkan animasi apa pun`)
        .toBeGreaterThan(0);
    }
  });
});
