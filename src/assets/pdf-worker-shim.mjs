/*
 * Shim worker pdf.js.
 *
 * pdf.js v5 memanggil `Promise.try(...)` (usulan ES2025) DI DALAM worker.
 * Peramban lama (< Chrome 128 / Safari 18.2) belum memilikinya, sehingga
 * mengunggah PDF melempar "Promise.try is not a function" dari dalam worker —
 * konteks terpisah yang tidak tersentuh polyfill utas utama.
 *
 * Berkas ini ditambal LEBIH DULU, lalu memuat worker pdf.js aslinya. Impor
 * dinamis dipakai (bukan `import` statik) supaya polyfill di atas benar-benar
 * berjalan sebelum kode worker aslinya dievaluasi — `import` statik akan
 * diangkat ke atas dan berjalan duluan.
 */
if (typeof Promise.try !== 'function') {
  Promise.try = function (fn, ...args) {
    return new Promise((resolve, reject) => {
      try {
        resolve(fn(...args));
      } catch (e) {
        reject(e);
      }
    });
  };
}

await import('./pdf.worker.min.mjs');
