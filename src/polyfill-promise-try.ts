/**
 * Polyfill `Promise.try` — dipakai pdf.js v5, belum ada di peramban lama.
 *
 * MENGAPA PERLU
 *
 * pdf.js v5 memanggil `Promise.try(...)` (usulan ES2025). Peramban yang lebih
 * lama dari Chrome 128 / Safari 18.2 belum memilikinya, dan mengunggah PDF
 * langsung melempar "Promise.try is not a function" — baik di utas utama
 * maupun di dalam worker.
 *
 * Diimpor PALING AWAL di bootstrap (sebelum modul lain) supaya sudah ada
 * ketika pdf.js pertama kali dimuat. Worker punya konteks sendiri; ia
 * ditambal terpisah lewat `assets/pdf-worker-shim.mjs`.
 */
(() => {
  const P = Promise as unknown as {
    try?: (fn: (...a: any[]) => any, ...args: any[]) => Promise<any>;
  };
  if (typeof P.try !== 'function') {
    P.try = function (fn: (...a: any[]) => any, ...args: any[]) {
      return new Promise((resolve, reject) => {
        try {
          resolve(fn(...args));
        } catch (e) {
          reject(e);
        }
      });
    };
  }
})();
