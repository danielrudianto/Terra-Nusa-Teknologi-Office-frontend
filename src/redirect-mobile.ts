/**
 * Dari PONSEL di domain desktop, alihkan ke aplikasi mobile.
 *
 * MENGAPA DI SINI, BUKAN DI HALAMAN LOGIN
 *
 * Diletakkan sebelumnya di `LoginComponent`, sehingga hanya jalan bila
 * penggunanya BELUM masuk. Yang sudah punya sesi di ponsel langsung masuk
 * aplikasi tanpa melewati halaman Login — dan tidak pernah teralihkan. Dijalan
 * kan di `main.ts` sebelum bootstrap, ia berlaku untuk KEDUA keadaan: sudah
 * masuk maupun belum.
 *
 * HANYA PONSEL. Tablet dan desktop tetap memakai aplikasi biasa.
 *
 * TIDAK UNTUK PELAMAR. Halaman ujian (`/exam/...`) tidak pernah dialihkan:
 * aplikasi mobile tidak punya rutenya, dan pelamar bukan karyawan.
 *
 * TIDAK BERULANG. Di domain mobile (`m.`) fungsi ini langsung berhenti, jadi
 * tak ada lingkaran. `?desktop=1` memaksa tetap di desktop bagi yang memang
 * menginginkannya dari ponsel (pilihannya menempel selama sesi tab).
 *
 * Kembalian `true` bila SEDANG mengalihkan — pemanggilnya melewati bootstrap.
 */
/**
 * Yang dibaca fungsi ini dari luar dirinya.
 *
 * Disuntikkan lewat parameter, bukan dibaca langsung dari `window`, SUPAYA
 * DAPAT DIUJI: `window.location.hostname` dan `pathname` tidak dapat ditulis
 * di dalam Karma, sehingga aturan "pelamar tidak dialihkan" tidak punya cara
 * dibuktikan kalau fungsinya membaca global secara langsung. Bawaannya tetap
 * `window`, jadi pemanggil di `main.ts` tidak berubah sama sekali.
 */
export interface LingkunganAlih {
  hostname: string;
  pathname: string;
  search: string;
  hash: string;
  protocol: string;
  replace: (url: string) => void;
}

export function redirectPonselKeMobile(
  lokasi: LingkunganAlih = window.location,
  userAgent: string = navigator.userAgent || '',
  simpanan: Pick<Storage, 'getItem' | 'setItem'> | null = (() => {
    try {
      return sessionStorage;
    } catch {
      return null;
    }
  })(),
): boolean {
  try {
    const host = lokasi.hostname;

    if (
      host.startsWith('m.') ||
      host === 'localhost' ||
      /^\d+\.\d+\.\d+\.\d+$/.test(host)
    ) {
      return false;
    }

    /*
     * HALAMAN UJIAN PELAMAR TIDAK PERNAH DIALIHKAN.
     *
     * Ini ditemukan sehari sebelum ujian dipakai: pelamar yang membuka
     * tautannya dari ponsel dilempar ke `m.terrabot...`, dan aplikasi
     * mobile TIDAK punya rute `/exam` sama sekali — penangkap `**` di
     * `mobile.routes.ts` mengembalikannya ke akar, yang berarti halaman
     * LOGIN ERP. Pelamar melihat layar masuk karyawan, bukan ujiannya,
     * dan tautannya tampak rusak.
     *
     * Pengalihan ini memang untuk KARYAWAN yang membuka ERP dari ponsel.
     * Pelamar bukan karyawan, tidak punya akun, dan halamannya sudah
     * dirancang untuk layar kecil sendiri.
     *
     * Diperiksa SEBELUM apa pun yang lain supaya tidak bergantung pada
     * urutan penjagaan lain di bawahnya.
     */
    const jalur = lokasi.pathname || '';
    if (/^\/exam(\/|$)/i.test(jalur)) {
      return false;
    }

    const params = new URLSearchParams(lokasi.search);
    if (params.get('desktop') === '1') {
      try {
        simpanan?.setItem('paksaDesktop', '1');
      } catch {}
      return false;
    }
    try {
      if (simpanan?.getItem('paksaDesktop') === '1') return false;
    } catch {}

    const ua = userAgent;
    const ponsel =
      /iPhone|iPod|Android.*Mobile|Windows Phone|BlackBerry|IEMobile|Opera Mini/i.test(
        ua,
      );
    if (!ponsel) return false;

    // Bawa juga path + query supaya deep link (mis. dari notifikasi) tidak
    // hilang saat berpindah domain.
    const tujuan =
      `${lokasi.protocol}//m.${host}` +
      lokasi.pathname +
      lokasi.search +
      lokasi.hash;
    lokasi.replace(tujuan);
    return true;
  } catch {
    return false;
  }
}
