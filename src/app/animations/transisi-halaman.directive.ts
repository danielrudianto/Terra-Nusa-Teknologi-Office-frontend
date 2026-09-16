import {
  Directive,
  ElementRef,
  effect,
  inject,
  input,
} from '@angular/core';

import {
  KURVA,
  SetelanTransisi,
  setelanTransisi,
} from './transisi-rute';

/**
 * Transisi halaman yang TIDAK memakai mesin animasi Angular.
 *
 * KENAPA DIGANTI
 *
 * Bentuk sebelumnya memasang `trigger('transisiRute')` pada pembungkus
 * `<router-outlet>`. Itu bekerja, dan justru bentuk itulah masalahnya.
 *
 * Mesin animasi Angular MENUNDA pembuangan simpul anak selama induknya masih
 * punya animasi yang berjalan. Pembungkus outlet adalah INDUK dari komponen
 * halaman, jadi setiap perpindahan menunda pembuangan halaman lama sampai
 * animasinya rampung. Pada 300ms itu tidak terlihat. Sejak durasinya dapat
 * disetel sampai 1,5 detik — dan perpindahan berikutnya datang sebelum yang
 * sebelumnya selesai, yang persis terjadi saat mengklik menu samping dua kali
 * beruntun — penundaannya bertumpuk.
 *
 * Dua keluhan yang saya perlakukan sebagai dua hal, ternyata satu:
 *
 *   "pas lagi morph sempet beberapa detik muncul beginian kenapa dah"
 *       -> halaman lama masih tergambar di atas yang baru.
 *   "makin lama makin lambat buset dah"
 *       -> halaman lama yang tidak dibuang berarti komponennya TIDAK
 *          DIHANCURKAN: pendeteksi perubahannya masih ikut setiap putaran,
 *          langganannya masih hidup, tabel dan grafiknya masih di DOM.
 *          Setiap perpindahan menambah satu lagi.
 *
 * TERUS TERANG SOAL BUKTINYA
 *
 * Saya tidak pernah berhasil mereproduksi penumpukannya di dalam Karma — enam
 * harness, termasuk sepuluh perpindahan beruntun dengan router sungguhan,
 * semuanya hijau. Jadi yang ditulis di atas adalah MEKANISME YANG
 * TERDOKUMENTASI, bukan sesuatu yang berhasil saya tangkap di uji. Menambal
 * gejalanya (`query(':leave', display:none)`) adalah yang saya lakukan
 * sebelumnya, dan itu tebakan.
 *
 * Yang ini bukan tambalan: ia MENIADAKAN mekanismenya. Tanpa pemicu animasi
 * pada induk outlet, tidak ada apa pun yang dapat menunda pembuangan simpul —
 * router membuang halaman lama seketika, selalu, tanpa bergantung pada durasi
 * yang dipilih siapa pun.
 *
 * BAGAIMANA GERAKANNYA TETAP ADA
 *
 * Lewat Web Animations API (`Element.animate`), yang tidak tahu apa-apa
 * tentang penyisipan maupun pembuangan simpul. Dan yang paling menentukan:
 * animasi yang masih berjalan DIBATALKAN sebelum yang baru dimulai — jadi
 * perpindahan yang cepat tidak pernah meninggalkan sisa.
 *
 * Yang digerakkan tetap hanya `opacity` dan `transform`; keduanya ditangani
 * compositor, jadi tidak memicu tata letak ulang betapa pun panjang halamannya.
 */

/** Anak yang mendapat ketukan kedua — lihat `transisi-rute.ts`. */
const KETUKAN_KEDUA = 'app-header-title';

@Directive({
  selector: '[appTransisiHalaman]',
  standalone: true,
})
export class TransisiHalamanDirective {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Kunci yang menyalakan transisi.
   *
   * Nilainya sendiri tidak berarti apa-apa — yang berarti adalah ia BERUBAH.
   */
  readonly kunci = input.required<string>({ alias: 'appTransisiHalaman' });

  /** Bentuk dan durasi gerakannya. */
  readonly setelan = input<SetelanTransisi>(setelanTransisi(), {
    alias: 'transisiSetelan',
  });

  /**
   * Kemunculan PERTAMA tidak dianimasikan.
   *
   * Dipakai layout bersarang (Data Master): tanpa ini, membukanya dari menu
   * samping memainkan dua animasi sekaligus — kerangka utama menganimasikan
   * seluruh halaman Master sementara outlet di dalamnya menganimasikan isinya.
   * Keduanya memudar dari nol, jadi opasitasnya berkalian dan halamannya
   * terbaca sebagai berat.
   *
   * Pada kerangka utama nilainya tidak penting: kunci awalnya teks kosong dan
   * baru diisi URL saat `ngOnInit`, jadi perubahan pertamanya memang sudah
   * merupakan perpindahan.
   */
  readonly lewatiPertama = input(false, { alias: 'transisiLewatiPertama' });

  /** Animasi yang masih berjalan; dibatalkan sebelum yang baru dimulai. */
  private berjalan: Animation[] = [];

  private pertama = true;

  constructor() {
    effect(() => {
      const kunci = this.kunci();
      const setelan = this.setelan();

      /*
       * Kunci KOSONG tidak pernah menganimasikan apa pun, dan tidak dihitung
       * sebagai "kemunculan pertama".
       *
       * Kerangka utama memulai `kunciRute` sebagai teks kosong dan baru
       * mengisinya dengan URL di `ngOnInit`. Kalau yang kosong itu dihitung,
       * layout bersarang yang meminta `lewatiPertama` akan MEMBUANG jatah
       * lewatnya pada nilai yang tidak mewakili perpindahan apa pun — dan
       * perpindahan sungguhan pertamanya justru ikut beranimasi.
       */
      if (!kunci) return;

      if (this.pertama) {
        this.pertama = false;
        if (this.lewatiPertama()) return;
      }

      this.mainkan(setelan);
    });
  }

  private mainkan(setelan: SetelanTransisi): void {
    const induk = this.el.nativeElement;

    /*
     * Sisa animasi sebelumnya DIBATALKAN, bukan dibiarkan selesai.
     *
     * Inilah bedanya dengan bentuk lama. Berpindah halaman tiga kali dalam
     * satu detik dulu meninggalkan tiga animasi yang saling menimpa pada
     * elemen yang sama; sekarang selalu tepat satu.
     */
    for (const a of this.berjalan) {
      try {
        a.cancel();
      } catch {
        // Animasi yang sudah dibuang peramban melempar saat dibatalkan.
      }
    }
    this.berjalan = [];

    // Durasi 0 = pengguna memilih "tanpa transisi" di Pengaturan. Itu pilihan
    // sadar, bukan kegagalan — jadi tidak ada yang dijalankan sama sekali.
    if (setelan.durasi <= 0) return;
    if (typeof induk.animate !== 'function') return;

    this.berjalan.push(
      induk.animate(
        [
          { opacity: 0, transform: setelan.mulai },
          { opacity: 1, transform: 'none' },
        ],
        { duration: setelan.durasi, easing: KURVA, fill: 'none' },
      ),
    );

    /*
     * Ketukan kedua: judul halaman menyusul.
     *
     * `fill: 'backwards'` — BUKAN `'none'`. Dengan jeda dan tanpa isian
     * mundur, judulnya tergambar penuh selama jedanya lalu MELOMPAT ke nol
     * saat animasinya mulai; kedipan itu justru lebih terlihat daripada
     * gerakan yang dimaksudkan.
     */
    const judul = induk.querySelector(KETUKAN_KEDUA) as HTMLElement | null;
    if (judul && typeof judul.animate === 'function') {
      this.berjalan.push(
        judul.animate(
          [
            { opacity: 0, transform: 'translateY(8px)' },
            { opacity: 1, transform: 'none' },
          ],
          {
            duration: setelan.durasi,
            delay: setelan.jeda,
            easing: KURVA,
            fill: 'backwards',
          },
        ),
      );
    }
  }
}
