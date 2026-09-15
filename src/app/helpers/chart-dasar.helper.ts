import { Chart, registerables } from 'chart.js';

/**
 * Pendaftaran dan setelan dasar chart.js — SATU tempat.
 *
 * Tiga hal dikerjakan di sini, dan ketiganya gagal tanpa menghasilkan galat:
 *
 * 1. **Pendaftaran controller.** chart.js v4 tidak mendaftarkan apa pun
 *    dengan sendirinya. Tanpa `Chart.register(...registerables)`,
 *    `type: 'line'` tidak punya controller — kanvasnya tetap terpasang,
 *    tingginya tetap seperti yang diatur CSS, dan yang tampil adalah KOTAK
 *    KOSONG. Tidak ada pesan di layar, tidak ada galat di konsol, dan
 *    build-nya bersih.
 *
 *    Yang membuatnya menipu: pendaftaran itu berlaku se-aplikasi. Begitu satu
 *    halaman grafik pernah dibuka, grafik di halaman lain ikut jalan — jadi
 *    komponen yang lupa mendaftarkannya tetap tampak benar selama diuji
 *    sesudah membuka halaman grafik yang lain. Itu yang terjadi pada kartu
 *    proyeksi kas di kalender.
 *
 * 2. **Fontnya.** chart.js menggambar teksnya ke kanvas, jadi ia TIDAK
 *    mewarisi `font-family` halaman — bawaannya Helvetica/Arial, dan
 *    tooltip-nya terlihat seperti berasal dari aplikasi lain.
 *
 * 3. **Rupiah tanpa pecahan.** Lihat `rupiah()` di bawah.
 *
 * Komponen grafik cukup mengimpor `pastikanChart()` dan memanggilnya di
 * tingkat modul. `scripts/pemeriksa/grafikcek.py` menuntutnya.
 */

/** Sama dengan `body { font-family }` di `styles.scss`. */
const FONT_APLIKASI =
  '"Montserrat", "Helvetica Neue", Helvetica, Arial, sans-serif';

let sudah = false;

/**
 * Memasang pendaftaran dan setelan dasar. Aman dipanggil berkali-kali.
 *
 * Dipanggil di TINGKAT MODUL tiap komponen grafik, bukan di `app.config`.
 * Alasannya sederhana: yang dijaga adalah komponen yang memuat grafik tanpa
 * pernah menyentuh halaman grafik lain, dan itu hanya terjamin kalau
 * berkasnya sendiri yang membawanya.
 */
export function pastikanChart(): void {
  if (sudah) return;
  sudah = true;

  Chart.register(...registerables);

  Chart.defaults.font.family = FONT_APLIKASI;
  Chart.defaults.font.size = 11;
}

/**
 * Nominal rupiah untuk tooltip — BULAT, tanpa pecahan.
 *
 * `toLocaleString('id-ID')` menampilkan sampai tiga angka di belakang koma.
 * Pada angka yang disusun dari penjumlahan `float`, itu membocorkan galat
 * pembulatannya ke layar: `Rp 535.401.957,759` untuk saldo yang di kartu
 * sebelahnya tertulis `535.401.958`. Angkanya sama; yang berbeda cara
 * menuliskannya — dan dua tulisan berbeda untuk satu angka membuat keduanya
 * berhenti dipercaya.
 *
 * Rupiah tidak punya pecahan sen dalam pemakaian sehari-hari, jadi
 * dibulatkan, bukan dipangkas: `.5` ke atas mengikuti aturan yang sama
 * dengan yang dipakai pipe `number` di seluruh aplikasi.
 */
export function rupiah(nilai: unknown): string {
  const n = Number(nilai);
  if (!Number.isFinite(n)) return 'Rp 0';
  return `Rp ${Math.round(n).toLocaleString('id-ID', {
    maximumFractionDigits: 0,
  })}`;
}

/**
 * Nominal ringkas untuk label sumbu: `1,2 M` / `350 jt`.
 *
 * Sumbu memuat enam sampai delapan label; angka rupiah penuh membuat
 * sebagiannya tumpang tindih dan chart.js menyembunyikannya diam-diam —
 * sumbu yang labelnya hilang separuh lebih buruk daripada sumbu yang ringkas.
 */
export function nominalSingkat(nilai: unknown): string {
  const jt = Number(nilai) / 1_000_000;
  if (!Number.isFinite(jt)) return '0';
  return Math.abs(jt) >= 1000
    ? `${(jt / 1000).toFixed(1)} M`
    : `${jt.toFixed(0)} jt`;
}
