/**
 * Menyalin teks ke papan klip, dengan jalur cadangan.
 *
 * KENAPA TIDAK LANGSUNG `navigator.clipboard.writeText`
 *
 * `navigator.clipboard` TIDAK ADA di luar konteks aman. Peramban hanya
 * menyediakannya pada `https://` dan `localhost`; pada `http://` biasa ia
 * `undefined`, dan `navigator.clipboard.writeText(...)` melempar
 * `TypeError: Cannot read properties of undefined`.
 *
 * Itu bukan kemungkinan teoretis di sistem ini: daftar CORS di `main.py`
 * memuat `http://terrabot.alphakonstruksi.id` dan `http://m.terrabot...`,
 * jadi ada jalan masuk yang bukan HTTPS. Di situ tombol salinnya akan
 * melempar, dan yang menekannya hanya melihat tombol yang tidak melakukan
 * apa-apa.
 *
 * Jalur cadangannya `document.execCommand('copy')` atas sebuah `<textarea>`
 * sementara. Ia sudah usang dan suatu saat akan hilang — tetapi selama ia
 * masih ada, ia bekerja persis di tempat yang tidak dilayani
 * `navigator.clipboard`, dan itulah gunanya.
 *
 * KENAPA MENGEMBALIKAN boolean, BUKAN MELEMPAR
 *
 * Yang memanggilnya selalu perlu memberi tahu penggunanya — berhasil atau
 * tidak. Pengecualian membuat setiap pemanggil harus menulis `try/catch`
 * sendiri, dan satu yang lupa berarti janji yang tidak ditepati tanpa satu
 * pun tanda di layar: teks yang dikira tersalin, lalu ditempel, dan yang
 * muncul isi papan klip sebelumnya.
 */

/** Panjang maksimum yang masuk akal untuk disalin dari satu kolom. */
const MAKS = 100_000;

export async function salinTeks(teks: unknown): Promise<boolean> {
  const isi = String(teks ?? '').slice(0, MAKS);
  if (!isi) return false;

  // Jalur utama — tersedia pada konteks aman (https / localhost).
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(isi);
      return true;
    }
  } catch {
    // Izin ditolak, atau dokumennya sedang tidak fokus. Dicoba dengan cara
    // lama sebelum menyerah — bukan langsung dinyatakan gagal.
  }

  return salinCaraLama(isi);
}

/**
 * Cara lama: `document.execCommand('copy')` atas `<textarea>` sementara.
 *
 * Beberapa hal di sini terlihat berlebihan dan tidak satu pun boleh dilepas:
 *
 *   * `position: fixed` dengan `opacity: 0` — BUKAN `display: none`. Elemen
 *     yang tidak dirender tidak dapat dipilih, dan `execCommand('copy')`
 *     menyalin YANG SEDANG TERPILIH. Dengan `display: none` fungsinya
 *     mengembalikan `false` tanpa keterangan apa pun.
 *   * `readOnly` — mencegah papan ketik layar muncul di ponsel saat elemennya
 *     difokuskan.
 *   * `finally` untuk membuangnya — bila `execCommand` melempar, textarea itu
 *     akan tertinggal di DOM selamanya, satu untuk setiap penekanan tombol.
 */
function salinCaraLama(isi: string): boolean {
  if (typeof document === 'undefined') return false;

  const kotak = document.createElement('textarea');
  kotak.value = isi;
  kotak.setAttribute('readonly', '');
  kotak.style.position = 'fixed';
  kotak.style.top = '0';
  kotak.style.left = '0';
  kotak.style.opacity = '0';
  kotak.style.pointerEvents = 'none';

  document.body.appendChild(kotak);
  try {
    kotak.focus();
    kotak.select();
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    kotak.remove();
  }
}
