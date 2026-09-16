import { CUSTOM_ELEMENTS_SCHEMA, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransisiHalamanDirective } from './transisi-halaman.directive';
import {
  JENIS_TRANSISI,
  SetelanTransisi,
  setelanTransisi,
} from './transisi-rute';

/**
 * Transisi halaman lewat Web Animations API.
 *
 * Yang dijaga di sini bukan "apakah geraknya bagus" — itu tidak dapat diuji —
 * melainkan tiga hal yang, bila salah, TIDAK menghasilkan galat apa pun:
 *
 *   1. Animasi sebelumnya DIBATALKAN. Ini inti perbaikannya. Berpindah
 *      halaman tiga kali dalam satu detik tidak boleh meninggalkan tiga
 *      animasi yang saling menimpa pada elemen yang sama.
 *   2. Kemunculan pertama layout bersarang tidak dianimasikan, supaya dua
 *      animasi tidak berkalian opasitasnya.
 *   3. Durasi 0 — pilihan "tanpa transisi" di Pengaturan — benar-benar tidak
 *      menjalankan apa pun, bukan menjalankan animasi sepanjang nol.
 */

@Component({
  standalone: true,
  imports: [TransisiHalamanDirective],
  template: `
    <div
      id="bungkus"
      [appTransisiHalaman]="kunci()"
      [transisiSetelan]="setelan()"
      [transisiLewatiPertama]="lewati"
    >
      <app-header-title id="judul">judul</app-header-title>
      <p>isi halaman</p>
    </div>
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
class TuanRumah {
  readonly kunci = signal('');
  readonly setelan = signal<SetelanTransisi>(setelanTransisi('morph', 600));
  lewati = false;
}

describe('TransisiHalamanDirective', () => {
  let f: ComponentFixture<TuanRumah>;

  function pasang(lewati = false) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [TuanRumah],
      errorOnUnknownElements: false,
      errorOnUnknownProperties: false,
    });
    f = TestBed.createComponent(TuanRumah);
    f.componentInstance.lewati = lewati;
    f.detectChanges();
    return f;
  }

  function bungkus(): HTMLElement {
    return f.nativeElement.querySelector('#bungkus');
  }

  function pindah(ke: string) {
    f.componentInstance.kunci.set(ke);
    f.detectChanges();
  }

  it('menjalankan animasi saat kuncinya BERUBAH', () => {
    pasang();
    pindah('/a');
    expect(bungkus().getAnimations().length)
      .withContext('tidak ada animasi yang berjalan sama sekali')
      .toBeGreaterThan(0);
  });

  it('kunci KOSONG pertama tidak menganimasikan apa pun', () => {
    /*
     * Kerangka utama memulai `kunciRute` sebagai teks kosong dan baru
     * mengisinya dengan URL di `ngOnInit`. Menganimasikan nilai awal itu
     * berarti satu animasi yang tidak mewakili perpindahan apa pun.
     */
    pasang();
    expect(bungkus().getAnimations().length).toBe(0);
  });

  it('PERPINDAHAN BERUNTUN tidak menumpuk animasi', () => {
    /*
     * Inti perbaikannya, dan inti keluhan "makin lama makin lambat".
     *
     * Bentuk lama memakai pemicu animasi Angular pada pembungkus outlet.
     * Selain menunda pembuangan halaman lama, setiap perpindahan yang datang
     * sebelum yang sebelumnya selesai menambah satu animasi lagi pada elemen
     * yang sama. Lima klik menu beruntun — yang biasa saja — berarti lima.
     *
     * Di sini yang sebelumnya dibatalkan lebih dulu, jadi jumlahnya TIDAK
     * tumbuh berapa kali pun berpindah.
     */
    pasang();
    pindah('/a');
    const sesudahSatu = bungkus().getAnimations().length;

    for (let i = 0; i < 8; i++) pindah(`/rute-${i}`);

    expect(bungkus().getAnimations().length)
      .withContext(
        `animasi tumbuh ${sesudahSatu} -> ${bungkus().getAnimations().length} ` +
          'setelah 8 perpindahan; pertumbuhan yang sebanding dengan jumlah ' +
          'perpindahan adalah definisi penumpukan',
      )
      .toBeLessThanOrEqual(sesudahSatu);
  });

  it('judul halaman mendapat ketukan keduanya', () => {
    pasang();
    pindah('/a');
    const judul: HTMLElement = f.nativeElement.querySelector('#judul');
    expect(judul.getAnimations().length)
      .withContext('ketukan kedua hilang — judulnya muncul serentak dengan isi')
      .toBeGreaterThan(0);
  });

  it('ketukan kedua memakai isian MUNDUR, bukan tanpa isian', () => {
    /*
     * Dengan jeda dan `fill: 'none'`, judulnya tergambar penuh selama jedanya
     * lalu MELOMPAT ke nol saat animasinya mulai. Kedipan itu lebih terlihat
     * daripada gerakan yang dimaksudkan — dan tidak ada galat apa pun.
     */
    pasang();
    pindah('/a');
    const judul: HTMLElement = f.nativeElement.querySelector('#judul');
    const anim = judul.getAnimations()[0] as any;
    expect(anim.effect.getTiming().fill).toBe('backwards');
    expect(anim.effect.getTiming().delay).toBeGreaterThan(0);
  });

  it('LEWATI PERTAMA membuat kemunculan awal tidak beranimasi', () => {
    /*
     * Data Master. Tanpa ini, membukanya dari menu samping memainkan dua
     * animasi sekaligus dan opasitasnya berkalian — isinya sampai lebih
     * lambat daripada yang dimaksudkan keduanya, dan terbaca sebagai halaman
     * yang berat.
     */
    pasang(true);
    pindah('/Master/Client');
    expect(bungkus().getAnimations().length).toBe(0);

    // Berpindah DI DALAM Master tetap beranimasi.
    pindah('/Master/Item');
    expect(bungkus().getAnimations().length).toBeGreaterThan(0);
  });

  it('SETIAP jenis benar-benar menghasilkan animasi di peramban', () => {
    /*
     * Penjaga yang sesungguhnya. Angka yang benar tidak membuktikan ada yang
     * bergerak; hanya peramban yang dapat menjawabnya.
     *
     * Kelas kegagalannya memang begitu: animasi yang tidak jalan tidak
     * melempar, tidak mencatat apa pun, dan meninggalkan halaman yang
     * terlihat normal. Transisi halaman sudah pernah dikirim dan dilaporkan
     * "masih tidak ada" tiga kali berturut-turut, dengan pemeriksa statis
     * hijau setiap kalinya.
     */
    pasang();
    const el = bungkus();

    for (const j of JENIS_TRANSISI) {
      if (j.nilai === 'none') continue;

      el.getAnimations().forEach((a) => a.finish());

      f.componentInstance.setelan.set(setelanTransisi(j.nilai, 500));
      pindah('/Halaman-' + j.nilai);

      const aktif = el
        .getAnimations()
        .filter((a) => a.playState === 'running' || a.playState === 'paused');

      expect(aktif.length)
        .withContext(
          `jenis "${j.nilai}" tidak menggerakkan apa pun — pilihannya ada di ` +
            'halaman Pengaturan tetapi tidak berarti apa-apa',
        )
        .toBeGreaterThan(0);
    }
  });

  it('durasi 0 — "tanpa transisi" — tidak menjalankan apa pun', () => {
    pasang();
    f.componentInstance.setelan.set(setelanTransisi('none', 600));
    pindah('/a');
    expect(bungkus().getAnimations().length)
      .withContext(
        'memilih "tanpa transisi" seharusnya berarti tidak ada animasi, ' +
          'bukan animasi sepanjang nol',
      )
      .toBe(0);
  });
});
