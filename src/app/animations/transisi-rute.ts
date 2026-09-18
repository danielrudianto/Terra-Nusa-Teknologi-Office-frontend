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

/**
 * Melambat panjang di ujung: gerakannya berhenti dengan lembut alih-alih
 * mendadak berhenti. Diekspor karena `TransisiHalamanDirective` memakai kurva
 * yang sama lewat Web Animations API — dua kurva yang "mirip" akan berbeda
 * dalam sebulan, dan perbedaannya terasa tanpa dapat ditunjuk.
 */
export const KURVA = 'cubic-bezier(0.22, 1, 0.36, 1)';

/*
 * PEMICU ANIMASI ANGULAR SUDAH TIDAK ADA DI BERKAS INI.
 *
 * Dulu ada dua: `transisiRute` untuk kerangka utama dan `transisiRuteBersarang`
 * untuk Data Master. Keduanya terpasang pada pembungkus `<router-outlet>`, dan
 * di situlah persoalannya — bukan pada isi animasinya.
 *
 * Mesin animasi Angular MENUNDA pembuangan simpul anak selama induknya masih
 * punya animasi berjalan. Pembungkus outlet adalah induk komponen halaman,
 * jadi halaman LAMA ditahan sampai animasinya rampung. Dua akibatnya pernah
 * dilaporkan sebagai dua keluhan terpisah — halaman bertumpuk, dan aplikasi
 * yang makin lambat setiap perpindahan — padahal satu sebab.
 *
 * Gerakannya sekarang dijalankan `TransisiHalamanDirective` lewat Web
 * Animations API, yang tidak tahu apa-apa tentang penyisipan maupun
 * pembuangan simpul. Yang tinggal di berkas ini hanya BENTUK dan DURASI
 * gerakannya; keduanya dipakai direktif itu.
 *
 * `scripts/pemeriksa/transisicek.py` menolak pemicu animasi apa pun pada
 * template yang berisi `<router-outlet>`, supaya bentuk lamanya tidak kembali
 * lewat layout baru yang ditulis orang lain.
 */


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
  /*
   * JARAKNYA relatif terhadap LAYAR (vh/vw), bukan piksel tetap.
   *
   * Inilah sebabnya "morph jalan, push up/down tidak". Keduanya berjalan —
   * yang berbeda seberapa besar TERBACANYA:
   *
   *   * `scale()` besarnya sebanding dengan tinggi elemennya. Pada daftar
   *     Purchase Order yang panjangnya ribuan piksel, `scale(0.94)` menggeser
   *     isi di sekitar mata puluhan piksel — jelas terlihat.
   *   * `translateY(18px)` besarnya 18px, apa pun tinggi halamannya. Pada
   *     halaman Pengaturan yang pendek itu terbaca; pada daftar yang panjang
   *     ia tenggelam.
   *
   * Satu jenis terasa bekerja dan yang lain tidak, padahal keduanya berjalan
   * persis seperti yang diperintahkan. Tidak ada galat — memang tidak ada
   * yang rusak.
   *
   * `vh`/`vw` membuat jaraknya sebanding dengan LAYAR, yang tetap sama entah
   * halamannya pendek atau panjang. Skala kecil tetap dipertahankan supaya
   * gerakannya punya kedalaman, bukan sekadar bergeser.
   */
  'push-up': 'translateY(4vh) scale(0.985)',
  'push-down': 'translateY(-4vh) scale(0.985)',
  morph: 'scale(0.94)',
  'slide-left': 'translateX(6vw)',
  'slide-right': 'translateX(-6vw)',
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

/**
 * Bentuk minimal `ActivatedRoute` yang dibutuhkan `kunciTransisi`.
 *
 * Disebut sebagai bentuk, bukan tipe Angular, supaya fungsinya dapat diuji
 * dengan objek biasa. Menguji lewat `RouterTestingHarness` berarti membangun
 * `MainComponent` beserta seluruh layanannya — dan uji yang mahal disiapkan
 * adalah uji yang tidak ditulis.
 */
export interface SimpulRute {
  snapshot: {
    url: Array<{ path: string }>;
    data?: Record<string, unknown>;
  };
  firstChild: SimpulRute | null;
}

/** Penanda pada `data` rute yang mengurus transisinya sendiri. */
export const DATA_BERSARANG = 'transisiBersarang';

/**
 * Kunci transisi kerangka utama, DIPOTONG di batas layout bersarang.
 *
 * MASALAHNYA
 *
 * Data Master memasang `appTransisiHalaman` pada outlet di dalamnya. Berpindah
 * dari Pemasok ke Karyawan hanya mengganti anak rutenya, tetapi URL-nya
 * berubah — jadi kerangka utama ikut menyala dan menganimasikan SELURUH
 * halaman Master, menu samping keduanya dan semuanya, sementara outlet di
 * dalamnya menganimasikan isinya lagi.
 *
 * Dua animasi berlapis pada isi yang sama: opasitasnya berkalian dan
 * pergeserannya bertumpuk, sehingga satu perpindahan terbaca sebagai dua
 * halaman yang dibalik berurutan. Tidak ada galat — tidak ada yang rusak,
 * hanya terasa berat dan salah.
 *
 * `transisiLewatiPertama` pada layout bersarang menutup perpindahan PERTAMA
 * saja, yaitu saat Data Master baru dibuka. Setiap perpindahan di dalamnya
 * sesudah itu tetap berlapis.
 *
 * PEMOTONGANNYA
 *
 * Rute yang mengurus transisinya sendiri menyatakannya dengan
 * `data: { transisiBersarang: true }`. Kunci kerangka utama berhenti di segmen
 * rute itu, sehingga Pemasok dan Karyawan menghasilkan kunci yang SAMA —
 * kerangka utama diam, dan yang bergerak hanya isinya.
 *
 * Dinyatakan di rutenya, bukan sebagai daftar jalur di sini: halaman bersarang
 * berikutnya cukup menambah satu baris di tempat ia didefinisikan, dan tidak
 * ada daftar terpisah yang dapat tertinggal.
 *
 * Di luar subpohon bersarang, `urlPenuh` dikembalikan apa adanya — termasuk
 * parameter kueri. Itu perilaku yang sudah ada dan disengaja: menyaring daftar
 * lewat parameter kueri mengganti isi halaman, dan animasinya yang menandai
 * bahwa isinya memang berganti.
 */
export function kunciTransisi(akar: SimpulRute | null, urlPenuh: string): string {
  const bagian: string[] = [];
  let simpul = akar;

  while (simpul) {
    for (const segmen of simpul.snapshot?.url ?? []) {
      if (segmen?.path) bagian.push(segmen.path);
    }
    if (simpul.snapshot?.data?.[DATA_BERSARANG]) {
      return '/' + bagian.join('/');
    }
    simpul = simpul.firstChild;
  }

  return urlPenuh;
}
