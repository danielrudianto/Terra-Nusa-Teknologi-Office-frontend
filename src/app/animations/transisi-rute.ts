import {
  animate,
  group,
  query,
  style,
  transition,
  trigger,
} from '@angular/animations';

/**
 * Transisi antar halaman — SATU definisi untuk seluruh aplikasi.
 *
 * KENAPA SATU BERKAS
 *
 * Sebelumnya transisi hanya ada di sub-layout Master, ditulis di dalam
 * komponennya. Kerangka utama — yang dipakai SETIAP perpindahan dari menu
 * samping — tidak punya apa-apa. Jadi berpindah dari Tender ke Kalender
 * berganti begitu saja, sementara berpindah di dalam Data Master ada
 * gerakannya; ketidakkonsistenan itu justru membuat yang tanpa gerakan terasa
 * lebih kaku daripada kalau memang tidak ada di mana-mana.
 *
 * Ditaruh di sini supaya keduanya memakai kurva, jarak, dan durasi yang sama.
 * Dua definisi yang "mirip" akan berbeda dalam sebulan, dan perbedaannya
 * terasa tanpa dapat ditunjuk.
 *
 * BENTUKNYA, DAN KENAPA BEGITU
 *
 * Dua ketukan, bukan satu:
 *
 *   1. Isi halaman naik 18px sambil muncul, dengan skala 0.98 -> 1.
 *      (Semula 14px/0.985. Dinaikkan karena pada layar besar gerakan sekecil
 *      itu selesai sebelum mata sempat menangkapnya — ia ada, tetapi tidak
 *      terbaca sebagai apa pun.)
 *      Skalanya nyaris tak terlihat dan memang harus begitu — ia yang membuat
 *      halaman terasa "datang", bukan sekadar berubah terang.
 *   2. Judul halaman menyusul 70ms kemudian.
 *
 * Ketukan kedua itu yang membuatnya terbaca sebagai sesuatu yang dirancang,
 * bukan sekadar fade. Satu gerakan serentak selalu terasa seperti tirai;
 * gerakan yang datang bertahap terasa seperti halaman yang menyusun dirinya.
 *
 * `cubic-bezier(0.22, 1, 0.36, 1)` melambat panjang di ujung: gerakannya
 * berhenti dengan lembut alih-alih mendadak berhenti.
 *
 * YANG SENGAJA TIDAK DILAKUKAN
 *
 * Tidak ada `:leave`, tidak ada `position: absolute`. Halaman lama tidak
 * ditahan untuk beranimasi keluar. Menahannya berarti dua halaman ada di DOM
 * sekaligus — pada halaman berisi grafik dan tabel panjang itu berarti dua
 * kali kerja render tepat pada saat yang paling sibuk, dan `position:
 * absolute` untuk menumpuknya merusak tinggi halaman serta posisi gulir.
 *
 * Hanya `opacity` dan `transform` yang digerakkan; keduanya ditangani
 * compositor, jadi tidak memicu layout ulang.
 */

/** Durasi bawaan, ms. Disetel 0 lewat `params` bila pengguna minta hemat gerak. */
export const DURASI_TRANSISI = 300;

/** Jeda ketukan kedua (judul halaman), ms. */
export const JEDA_JUDUL = 70;

const KURVA = 'cubic-bezier(0.22, 1, 0.36, 1)';

/**
 * Anak yang mendapat ketukan kedua.
 *
 * `app-header-title` dipakai sebagian besar halaman berutinya. Yang tidak
 * memakainya cukup kehilangan ketukan keduanya — `optional: true` membuat
 * query yang tidak menemukan apa pun TIDAK melempar. Tanpa itu, satu halaman
 * tanpa header akan menggagalkan animasinya dengan galat yang menyebut
 * selector, bukan halamannya.
 */
const KETUKAN_KEDUA = 'app-header-title';

export const transisiRute = trigger('transisiRute', [
  transition(
    '* => *',
    [
      style({ opacity: 0, transform: 'translateY(18px) scale(0.98)' }),
      query(
        KETUKAN_KEDUA,
        style({ opacity: 0, transform: 'translateY(8px)' }),
        { optional: true },
      ),
      group([
        animate(
          '{{ durasi }}ms {{ kurva }}',
          style({ opacity: 1, transform: 'none' }),
        ),
        query(
          KETUKAN_KEDUA,
          animate(
            '{{ durasi }}ms {{ jeda }}ms {{ kurva }}',
            style({ opacity: 1, transform: 'none' }),
          ),
          { optional: true },
        ),
      ]),
    ],
    {
      params: {
        durasi: DURASI_TRANSISI,
        jeda: JEDA_JUDUL,
        kurva: KURVA,
      },
    },
  ),
]);

/**
 * Transisi untuk layout BERSARANG (mis. Data Master).
 *
 * Sama persis, kecuali satu hal: kemunculan PERTAMA tidak dianimasikan.
 *
 * Tanpa itu, membuka Data Master dari menu samping memainkan dua animasi
 * sekaligus — kerangka utama menganimasikan seluruh halaman Master, dan pada
 * saat yang sama outlet di dalam Master menganimasikan isinya. Keduanya
 * memudar dari nol, jadi opasitasnya berkalian: isinya sampai lebih lambat
 * daripada yang dimaksudkan keduanya, dan terbaca sebagai halaman yang berat.
 *
 * Berpindah DI DALAM Master (Equipment -> Item) tetap beranimasi, karena di
 * situ kerangka utama tidak berganti apa pun dan tidak ada yang menganimasikan
 * selain ini.
 */
export const transisiRuteBersarang = trigger('transisiRuteBersarang', [
  // Kosong = tidak ada animasi, bukan "animasi tanpa langkah".
  transition('void => *', []),
  transition(
    '* => *',
    [
      style({ opacity: 0, transform: 'translateY(10px)' }),
      animate('{{ durasi }}ms {{ kurva }}', style({ opacity: 1, transform: 'none' })),
    ],
    { params: { durasi: DURASI_TRANSISI, kurva: KURVA } },
  ),
]);

/**
 * Durasi yang benar-benar dipakai, menghormati "kurangi gerak".
 *
 * Angular tidak membaca `prefers-reduced-motion` sendiri. Bagi yang
 * menyalakannya di sistem operasinya, animasi halaman bukan soal selera —
 * gerakan besar dapat memicu pusing dan mual. Durasi 0 membuat animasinya
 * lewat tanpa terlihat, tanpa perlu cabang kode terpisah di templatenya.
 *
 * `matchMedia` dijaga: pada lingkungan tanpa `window` (uji, render sisi
 * server) ia tidak ada, dan melemparnya akan menjatuhkan seluruh kerangka.
 */
export function durasiHormatiGerak(bawaan = DURASI_TRANSISI): number {
  try {
    if (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return 0;
    }
  } catch {
    // Biarkan memakai bawaannya.
  }
  return bawaan;
}
