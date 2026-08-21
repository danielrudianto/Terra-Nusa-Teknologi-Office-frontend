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
 * TIDAK BERULANG. Di domain mobile (`m.`) fungsi ini langsung berhenti, jadi
 * tak ada lingkaran. `?desktop=1` memaksa tetap di desktop bagi yang memang
 * menginginkannya dari ponsel (pilihannya menempel selama sesi tab).
 *
 * Kembalian `true` bila SEDANG mengalihkan — pemanggilnya melewati bootstrap.
 */
export function redirectPonselKeMobile(): boolean {
  try {
    const host = window.location.hostname;

    if (
      host.startsWith('m.') ||
      host === 'localhost' ||
      /^\d+\.\d+\.\d+\.\d+$/.test(host)
    ) {
      return false;
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get('desktop') === '1') {
      try {
        sessionStorage.setItem('paksaDesktop', '1');
      } catch {}
      return false;
    }
    try {
      if (sessionStorage.getItem('paksaDesktop') === '1') return false;
    } catch {}

    const ua = navigator.userAgent || '';
    const ponsel =
      /iPhone|iPod|Android.*Mobile|Windows Phone|BlackBerry|IEMobile|Opera Mini/i.test(
        ua,
      );
    if (!ponsel) return false;

    // Bawa juga path + query supaya deep link (mis. dari notifikasi) tidak
    // hilang saat berpindah domain.
    const tujuan =
      `${window.location.protocol}//m.${host}` +
      window.location.pathname +
      window.location.search +
      window.location.hash;
    window.location.replace(tujuan);
    return true;
  } catch {
    return false;
  }
}
