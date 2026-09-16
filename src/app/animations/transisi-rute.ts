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

/** Durasi bawaan, ms. */
export const DURASI_TRANSISI = 300;

/**
 * Durasi saat pengguna minta HEMAT GERAK, ms.
 *
 * BUKAN NOL — dan ini perbaikan atas kekeliruan yang nyata.
 *
 * Versi sebelumnya menyetelnya 0, dengan anggapan "kurangi gerak" berarti
 * "jangan ada transisi". Itu keliru dua kali:
 *
 *   1. Yang dimaksud setelan itu adalah mengurangi GERAK — perpindahan dan
 *      penskalaan yang dapat memicu pusing — bukan meniadakan seluruh
 *      peralihan. Pudar-menyala tanpa perpindahan justru bentuk yang
 *      dianjurkan untuk keadaan ini.
 *
 *   2. Akibatnya tidak dapat dibedakan dari animasi yang RUSAK. Daniel
 *      melaporkan "transisinya tidak ada" tiga kali berturut-turut; animasinya
 *      benar, setelan sistemnyalah yang mematikannya, dan tidak ada apa pun —
 *      di layar maupun di konsol — yang dapat memberitahunya. Windows
 *      menyalakan setelan ini begitu "Animation effects" dimatikan, dan itu
 *      sering dimatikan demi kecepatan, bukan demi kenyamanan.
 *
 * Jadi sekarang: tetap dihormati, tetapi dengan MENGHILANGKAN GERAKANNYA —
 * bukan menghilangkan transisinya.
 */
export const DURASI_HEMAT_GERAK = 180;

/** Jeda ketukan kedua (judul halaman), ms. */
export const JEDA_JUDUL = 70;

/** Jarak naik isi halaman saat muncul, px. */
export const JARAK_NAIK = 18;

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
      // Bentuk gerakannya SELURUHNYA datang dari parameter `mulai`.
      //
      // Dulu `geser` dan `skala` terpisah, dan itu hanya cukup untuk gerakan
      // tegak. Sejak jenisnya dapat dipilih pengguna — naik, turun, geser
      // kiri, geser kanan, morph — satu transform utuh adalah satu-satunya
      // bentuk yang tidak perlu ditambah setiap kali ada jenis baru.
      style({ opacity: 0, transform: '{{ mulai }}' }),
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
        mulai: `translateY(${JARAK_NAIK}px) scale(0.98)`,
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
      style({ opacity: 0, transform: '{{ mulai }}' }),
      animate('{{ durasi }}ms {{ kurva }}', style({ opacity: 1, transform: 'none' })),
    ],
    { params: { durasi: DURASI_TRANSISI, kurva: KURVA, mulai: 'translateY(10px)' } },
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
/** Jenis gerakan yang dapat dipilih pengguna. */
export type JenisTransisi =
  | 'push-up'
  | 'push-down'
  | 'morph'
  | 'slide-left'
  | 'slide-right'
  | 'none';

/**
 * Transform AWAL tiap jenis; ujungnya selalu `none`.
 *
 * Yang digerakkan hanya `opacity` dan `transform` — keduanya ditangani
 * compositor, jadi tidak memicu tata letak ulang betapa pun panjang isi
 * halamannya.
 */
export const MULAI_TRANSISI: Record<JenisTransisi, string> = {
  'push-up': `translateY(${JARAK_NAIK}px) scale(0.98)`,
  'push-down': `translateY(-${JARAK_NAIK}px) scale(0.98)`,
  morph: 'scale(0.94)',
  'slide-left': 'translateX(28px)',
  'slide-right': 'translateX(-28px)',
  none: 'none',
};

export const JENIS_TRANSISI: Array<{
  nilai: JenisTransisi;
  labelKey: string;
}> = [
  { nilai: 'push-up', labelKey: 'transisi.pushUp' },
  { nilai: 'push-down', labelKey: 'transisi.pushDown' },
  { nilai: 'morph', labelKey: 'transisi.morph' },
  { nilai: 'slide-left', labelKey: 'transisi.slideLeft' },
  { nilai: 'slide-right', labelKey: 'transisi.slideRight' },
  { nilai: 'none', labelKey: 'transisi.none' },
];

/** Batas durasi yang dapat dipilih, ms. */
export const DURASI_MIN = 100;
export const DURASI_MAX = 1500;
export const DURASI_BAWAAN = 500;

/**
 * Dijepit ke rentang yang sah; nilai tak terbaca kembali ke bawaannya.
 *
 * `null`, `undefined`, dan teks kosong diperlakukan sebagai TIDAK ADA NILAI,
 * bukan sebagai nol. `Number(null)` dan `Number('')` sama-sama `0` — dan nol
 * itu terhingga, jadi tanpa penjagaan ini keduanya dijepit ke batas terendah
 * (100ms) alih-alih kembali ke bawaannya. Yang localStorage-nya kosong akan
 * mendapat transisi tercepat yang mungkin, dan tidak akan pernah tahu kenapa.
 */
export function jepitDurasi(ms: unknown): number {
  if (ms === null || ms === undefined || ms === '') return DURASI_BAWAAN;
  const n = Number(ms);
  if (!Number.isFinite(n)) return DURASI_BAWAAN;
  return Math.min(DURASI_MAX, Math.max(DURASI_MIN, Math.round(n)));
}

export function gerakDikurangi(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  } catch {
    // Lingkungan tanpa `matchMedia` (uji, render sisi server): anggap normal.
    return false;
  }
}

/** Bentuk parameter yang diteruskan templatenya ke pemicu. */
export interface SetelanTransisi {
  durasi: number;
  jeda: number;
  mulai: string;
}

/**
 * Parameter transisi yang berlaku, menghormati "kurangi gerak".
 *
 * Saat setelan itu menyala, yang dibuang GERAKANNYA — perpindahan dan
 * penskalaan menjadi nol — sementara pudar-menyalanya tetap ada dan lebih
 * singkat. Halamannya tetap terbaca sebagai berganti, tanpa satu piksel pun
 * bergerak.
 *
 * `hemat` dapat disebut langsung supaya dapat diuji; secara bawaan ia dibaca
 * dari setelan sistem.
 */
export function setelanTransisi(
  jenis: JenisTransisi = 'push-up',
  durasiMs: number = DURASI_BAWAAN,
): SetelanTransisi {
  if (jenis === 'none') {
    // Pilihan SADAR pengguna, bukan kegagalan. Itu bedanya dengan keadaan
    // lama, ketika durasi 0 dipaksakan oleh setelan sistem tanpa ada yang
    // dapat mengetahuinya.
    return { durasi: 0, jeda: 0, mulai: 'none' };
  }
  const durasi = jepitDurasi(durasiMs);
  return {
    durasi,
    // Jeda ketukan kedua ikut menyusut bersama durasinya; jeda tetap 70ms
    // pada transisi 120ms berarti judulnya baru mulai bergerak saat isinya
    // sudah selesai.
    jeda: Math.round(Math.min(JEDA_JUDUL, durasi * 0.25)),
    mulai: MULAI_TRANSISI[jenis] ?? MULAI_TRANSISI['push-up'],
  };
}

/**
 * Durasi saja — dipertahankan untuk pemanggil lama.
 *
 * Tidak lagi mengembalikan 0: lihat keterangan pada `DURASI_HEMAT_GERAK`.
 */
export function durasiHormatiGerak(bawaan = DURASI_TRANSISI): number {
  return gerakDikurangi() ? DURASI_HEMAT_GERAK : bawaan;
}
