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

/*
 * `Map.prototype.getOrInsert` / `getOrInsertComputed` — usulan "Upsert"
 * yang baru mendarat sekitar Chrome 142, dan dipakai pdf.js v5 di DALAM
 * worker juga. Alasannya sama persis dengan `Promise.try` di atas: worker
 * adalah konteks terpisah yang tidak tersentuh tambalan utas utama.
 */
if (typeof Map.prototype.getOrInsert !== 'function') {
  Map.prototype.getOrInsert = function (kunci, nilai) {
    if (!this.has(kunci)) this.set(kunci, nilai);
    return this.get(kunci);
  };
}
if (typeof Map.prototype.getOrInsertComputed !== 'function') {
  Map.prototype.getOrInsertComputed = function (kunci, buat) {
    // `has` lebih dahulu: nilai yang memang tersimpan sebagai `undefined`
    // akan dihitung ulang setiap kali bila diperiksa lewat nilainya.
    if (!this.has(kunci)) this.set(kunci, buat(kunci));
    return this.get(kunci);
  };
}

/*
 * PENANDA VERSI DITERUSKAN ke worker aslinya.
 *
 * Berkas ini maupun `pdf.worker.min.mjs` tidak berhash namanya, sementara
 * `/assets/` disajikan dengan `expires 30d`. Tanpa penanda yang ikut
 * berpindah, peramban yang sudah menyinggah worker versi lama tetap
 * memakainya berminggu-minggu sesudah paketnya dinaikkan — dan yang muncul
 * hanyalah "The API version ... does not match the Worker version ...".
 *
 * Diambil dari alamat berkas ini sendiri, yang sudah membawa `?v=` dari
 * pemanggilnya; tidak ada versi kedua yang harus dijaga tetap sama.
 */
const versi = new URL(import.meta.url).searchParams.get('v');
await import(versi ? `./pdf.worker.min.mjs?v=${versi}` : './pdf.worker.min.mjs');
