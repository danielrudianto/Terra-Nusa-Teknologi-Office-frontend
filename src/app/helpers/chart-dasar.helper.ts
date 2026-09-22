import { gerakMati } from '../animations/gerak';
import { Chart, ChartType, Plugin, registerables } from 'chart.js';
// Plugin zoom membawa Hammer sendiri (dependensinya, bukan dependensi kita):
// Hammer yang menangani SEMUA seretan — tetikus maupun jari. `hammerjs`
// tercantum di `allowedCommonJsDependencies` karena paket itu bukan ESM.
import zoomPlugin from 'chartjs-plugin-zoom';
import { uangDokumenRp } from './uang.helper';

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

  Chart.register(...registerables, zoomPlugin, geserZoom);

  Chart.defaults.font.family = FONT_APLIKASI;
  Chart.defaults.font.size = 11;

  pasangGeserZoom();
  pasangGerakMasuk();
}

/**
 * GRAFIK TUMBUH SAAT PERTAMA TAMPIL — batang naik satu per satu dari kiri,
 * garis naik dari dasar, donat berputar penuh.
 *
 * Jedanya hanya untuk gambar PERTAMA tiap grafik (`$aknSudahMasuk`).
 * Mengganti saringan, menggeser, atau memperbesar sesudahnya bergerak
 * serentak dan singkat: batang yang menunggu giliran setiap kali tahunnya
 * diganti terasa lambat, bukan mahal.
 *
 * Mematuhi saklar gerak (`gerakMati`) — dibaca SAAT grafik bergerak,
 * bukan saat didaftarkan, supaya mengubah setelan berlaku tanpa memuat
 * ulang halaman.
 */
function pasangGerakMasuk(): void {
  const a: any = Chart.defaults.animation;
  a.easing = 'easeOutQuart';
  a.duration = () => (gerakMati() ? 0 : 750);
  a.delay = (ctx: any) => {
    if (gerakMati() || ctx?.type !== 'data' || ctx.chart?.$aknSudahMasuk) return 0;
    return Math.min(ctx.dataIndex ?? 0, 24) * 16 + (ctx.datasetIndex ?? 0) * 70;
  };
  Chart.register({
    id: 'aknGerakMasuk',
    afterRender(chart: any) {
      chart.$aknSudahMasuk = true;
    },
  });
}

/**
 * GESER & ZOOM SEPERTI GRAFIK SAHAM — berlaku untuk SEMUA grafik sekaligus.
 *
 * Dipasang sebagai bawaan global di sini, bukan di tiap komponen: setiap
 * grafik di aplikasi ini sudah melewati `pastikanChart()` (dituntut
 * `grafikcek.py`), jadi satu tempat mencakup semuanya — termasuk grafik
 * berikutnya yang belum ditulis.
 *
 *   seret                 → geser mendatar
 *   Ctrl + gulir / cubit  → perbesar-perkecil (di trackpad Mac, cubit
 *                           dikirim sebagai Ctrl + gulir, jadi ikut jalan)
 *   klik dua kali         → kembali ke tampilan semula
 *
 * Gulir TANPA Ctrl sengaja TIDAK memperbesar. Grafik di aplikasi ini duduk
 * di tengah halaman yang panjang; roda yang ditangkap grafik membuat halaman
 * berhenti bergulir tiap kali kursor melintas di atasnya.
 *
 * Hanya sumbu X. Sumbu Y rupiah yang ikut bergeser membuat nol hilang dari
 * layar, dan batang yang tidak berpangkal di nol membohongi perbandingannya.
 *
 * Dibatasi pada data ASLI (`'original'`): tidak dapat digeser ke ruang
 * kosong sebelum titik pertama atau sesudah titik terakhir. Akibatnya
 * menggeser baru berpengaruh SETELAH diperbesar — pada tampilan penuh
 * seluruh data sudah terlihat, dan tidak ada yang dapat digeser.
 */
/** Grafik tanpa sumbu X mendatar — tidak ada yang dapat digeser. */
const JENIS_BUNDAR = ['pie', 'doughnut', 'polarArea', 'radar'];

function pasangGeserZoom(): void {
  const z: any = ((Chart.defaults.plugins as any).zoom ??= {});
  z.pan = { ...(z.pan || {}), enabled: true, mode: 'x', threshold: 6 };
  z.zoom = {
    ...(z.zoom || {}),
    mode: 'x',
    wheel: { enabled: true, modifierKey: 'ctrl', speed: 0.12 },
    pinch: { enabled: true },
    drag: { enabled: false },
  };
  z.limits = {
    ...(z.limits || {}),
    x: { min: 'original', max: 'original' },
  };

  // Grafik BUNDAR tidak punya sumbu X: tidak ada yang dapat digeser pada
  // lingkaran. Dimatikan lewat `Chart.overrides[jenis]` — mekanisme resmi
  // chart.js untuk bawaan per jenis grafik, yang didahulukan di atas
  // `Chart.defaults`.
  //
  // BUKAN dengan menulis ke `chart.options` di dalam plugin. Itu versi
  // pertamanya, dan ketahuan di uji: `chart.options` adalah proksi yang
  // menulis TEMBUS ke `Chart.defaults`. Satu grafik pai yang tampil
  // mematikan geser untuk SELURUH grafik sesudahnya, se-aplikasi, tanpa
  // galat — dan halaman laporan pembelian memuat grafik pai.
  const mati = {
    pan: { enabled: false },
    zoom: { wheel: { enabled: false }, pinch: { enabled: false } },
  };
  for (const jenis of JENIS_BUNDAR) {
    const o: any = (Chart.overrides as any)[jenis];
    if (!o) continue;
    o.plugins = { ...(o.plugins || {}), zoom: mati };
  }
}

/**
 * Pelengkap plugin zoom: kursor, petunjuk, dan klik ganda.
 *
 * - Grafik tanpa sumbu X (pai, donat) dilewati; geser-zoom-nya sudah
 *   dimatikan lewat `Chart.overrides` di `pasangGeserZoom`.
 * - Kursor tangan (`grab`) memberi tahu bahwa grafiknya dapat diseret;
 *   tanpa itu fiturnya ada tetapi tidak ditemukan siapa pun.
 * - Petunjuk cara pakainya lewat `title` kanvas — muncul saat kursor diam
 *   di atas grafik, tanpa menambah satu baris pun di halaman.
 * - Klik ganda mengembalikan tampilan semula. Pendengarnya DIBUANG saat
 *   grafiknya dihancurkan, supaya kanvas yang dipakai ulang tidak menumpuk
 *   pendengar lama.
 */
const PETUNJUK =
  'Seret untuk menggeser · Ctrl + gulir (atau cubit) untuk memperbesar · ' +
  'klik dua kali untuk kembali ke 12 terakhir';

/**
 * Deret panjang dibuka pada 12 titik TERAKHIR; sisanya tinggal digeser.
 * Hanya untuk sumbu X kategori (bulan, minggu) — indeksnya jelas.
 */
export const JENDELA_AWAL = 12;

/*
 * Grafik yang MENGATUR JENDELANYA SENDIRI (mis. arus kas proyek: 30/60/90
 * hari) atau yang bentuk utuhnya justru yang dibaca (kurva S) menolaknya:
 *   plugins: { geserZoomAkn: { jendelaAwal: false } }
 */
declare module 'chart.js' {
  interface PluginOptionsByType<TType extends ChartType> {
    geserZoomAkn?: { jendelaAwal?: boolean };
  }
}
const JENDELA = new WeakMap<object, number>();

function pasangJendela(chart: any): void {
  const n = chart.data?.labels?.length ?? 0;
  if (n > JENDELA_AWAL) {
    chart.zoomScale?.('x', { min: n - JENDELA_AWAL, max: n - 1 }, 'none');
  } else {
    chart.resetZoom?.('none');
  }
}

const PENDENGAR = new WeakMap<
  object,
  { kanvas: HTMLCanvasElement; kembali: () => void }
>();

export const geserZoom: Plugin = {
  id: 'geserZoomAkn',
  afterInit(chart, _args, opsi: any) {
    // HANYA MEMBACA setelan — tidak pernah menulis ke `chart.options`
    // (lihat `pasangGeserZoom`: proksinya menulis tembus ke bawaan global).
    //
    // Jenis grafik dibaca dari KONFIGURASINYA, bukan dari `chart.scales`:
    // pada `afterInit` sumbunya belum dibangun (itu terjadi pada `update()`
    // sesudahnya), sehingga `chart.scales.x` selalu kosong di sini dan
    // SETIAP grafik terbaca sebagai grafik bundar. Itu yang terjadi pada
    // versi pertamanya.
    const zoom: any = (chart.options.plugins as any)?.zoom;
    if (JENIS_BUNDAR.includes((chart.config as any).type)) return;
    if (zoom?.pan?.enabled === false) return;

    const kanvas = chart.canvas;
    kanvas.style.cursor = 'grab';
    if (!kanvas.title) kanvas.title = PETUNJUK;

    // Klik ganda kembali ke jendela awal, bukan ke seluruh deret.
    const kembali = () =>
      opsi?.jendelaAwal === false ||
      (chart as any).scales?.x?.type !== 'category'
        ? (chart as any).resetZoom?.()
        : pasangJendela(chart);
    kanvas.addEventListener('dblclick', kembali);
    PENDENGAR.set(chart, { kanvas, kembali });
  },
  /*
   * Jendela awal dipasang setelah sumbunya jadi, dan diulang bila JUMLAH
   * labelnya berubah (data dimuat ulang di tempat). `resetZoom` dulu, agar
   * batas 'original' plugin zoom dicatat ulang dari data baru — tanpa itu
   * batas geser tertinggal di rentang lama dan bulan terbaru tak terjangkau.
   */
  afterUpdate(chart, _args, opsi: any) {
    if (JENIS_BUNDAR.includes((chart.config as any).type)) return;
    if (opsi?.jendelaAwal === false) return;
    const x: any = (chart as any).scales?.x;
    if (!x || x.type !== 'category') return;
    const n = chart.data?.labels?.length ?? 0;
    const lama = JENDELA.get(chart);
    if (lama === n) return;
    JENDELA.set(chart, n);
    if (lama !== undefined) (chart as any).resetZoom?.('none');
    pasangJendela(chart);
  },
  // Kanvasnya DISIMPAN saat dipasang: pada `afterDestroy` chart.js sudah
  // mengosongkan `chart.canvas`, dan membuang pendengar dari `null` gagal
  // diam-diam — pendengarnya tertinggal pada kanvas yang dipakai ulang.
  afterDestroy(chart) {
    const p = PENDENGAR.get(chart);
    if (p) p.kanvas.removeEventListener('dblclick', p.kembali);
    PENDENGAR.delete(chart);
  },
};

/**
 * Nominal rupiah untuk tooltip — dua desimal, seperti di mana pun.
 *
 * KENAPA ALASANNYA BERBALIK
 *
 * Dulu ini sengaja BULAT. Alasannya benar pada zamannya: `toLocaleString`
 * tanpa pengaturan menampilkan sampai tiga desimal, dan pada angka yang
 * disusun dari penjumlahan `float` itu membocorkan galat pembulatannya ke
 * layar — `Rp 535.401.957,759` untuk saldo yang di kartu sebelahnya tertulis
 * `535.401.958`. Dua tulisan berbeda untuk satu angka membuat keduanya
 * berhenti dipercaya, jadi tooltipnya disamakan dengan kartunya.
 *
 * Yang berubah adalah KARTUNYA. Seluruh nilai uang di aplikasi ini sekarang
 * dua desimal, jadi membulatkan di sini justru menghasilkan selisih yang dulu
 * dihindari — dengan arah yang terbalik. Dan dua desimal tetap menutup
 * kebocoran `float` yang menjadi sebab aslinya: yang dibuang tiga desimal,
 * bukan dua.
 */
export function rupiah(nilai: unknown): string {
  return uangDokumenRp(nilai);
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
