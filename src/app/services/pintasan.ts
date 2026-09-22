/**
 * PINTASAN PAPAN KETIK — logika murni, tanpa Angular, supaya dapat diuji
 * tanpa merender apa pun. Dipasang oleh MainComponent.
 *
 *   /   fokus ke kotak pencarian halaman
 *   N   tombol "Tambah ..." di kepala halaman
 *   ?   daftar pintasan
 *
 * Tidak pernah menyala saat:
 *  - sedang mengetik (input, textarea, select, contenteditable) — huruf "n"
 *    di nama klien bukan perintah;
 *  - Ctrl/Alt/Meta ditekan — itu milik peramban dan sistem operasi;
 *  - ada dialog terbuka — pintasannya milik halaman di BELAKANG dialog.
 */
export type AksiPintasan = 'cari' | 'baru' | 'bantuan' | null;

export function sedangMengetik(el: EventTarget | null): boolean {
  const e = el as HTMLElement | null;
  if (!e || !e.tagName) return false;
  const tag = e.tagName.toLowerCase();
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    e.isContentEditable === true
  );
}

export function aksiDari(
  ev: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'altKey' | 'metaKey' | 'target'>,
  adaDialog: boolean,
): AksiPintasan {
  if (ev.ctrlKey || ev.altKey || ev.metaKey) return null;
  if (adaDialog || sedangMengetik(ev.target)) return null;
  if (ev.key === '/') return 'cari';
  if (ev.key === 'n' || ev.key === 'N') return 'baru';
  if (ev.key === '?') return 'bantuan';
  return null;
}

/** Kotak pencarian halaman yang sedang TERLIHAT. */
export function cariKotakPencarian(akar: ParentNode): HTMLInputElement | null {
  const calon = akar.querySelectorAll<HTMLInputElement>(
    'input[type="search"], [class*="-search"] input, [class*="-cari"] input',
  );
  for (const el of Array.from(calon)) {
    if (el.offsetParent !== null && !el.disabled) return el;
  }
  return null;
}

/** Tombol "Tambah ..." di kepala halaman — hanya bila tidak terkunci. */
export function cariTombolBaru(akar: ParentNode): HTMLButtonElement | null {
  const el = akar.querySelector<HTMLButtonElement>(
    'app-header-title .header-button:not([disabled])',
  );
  return el && el.offsetParent !== null ? el : null;
}
