import { aksiDari, cariKotakPencarian, cariTombolBaru } from './pintasan';

const ev = (key: string, o: any = {}) =>
  ({ key, ctrlKey: false, altKey: false, metaKey: false, target: document.body, ...o }) as any;

describe('pintasan', () => {
  it('/ N ? dikenali', () => {
    expect(aksiDari(ev('/'), false)).toBe('cari');
    expect(aksiDari(ev('n'), false)).toBe('baru');
    expect(aksiDari(ev('N'), false)).toBe('baru');
    expect(aksiDari(ev('?'), false)).toBe('bantuan');
    expect(aksiDari(ev('x'), false)).toBeNull();
  });

  it('diam saat mengetik, saat dialog terbuka, dan dengan pengubah', () => {
    const input = document.createElement('input');
    expect(aksiDari(ev('n', { target: input }), false)).toBeNull();
    expect(aksiDari(ev('n'), true)).toBeNull();
    expect(aksiDari(ev('n', { ctrlKey: true }), false)).toBeNull();
    const ed = document.createElement('div');
    ed.contentEditable = 'true';
    document.body.appendChild(ed);
    expect(aksiDari(ev('/', { target: ed }), false)).toBeNull();
    ed.remove();
  });

  it('menemukan kotak pencarian yang terlihat, melewati yang tersembunyi', () => {
    const akar = document.createElement('div');
    akar.innerHTML = `
      <div class="x-search" style="display:none"><input id="a"></div>
      <div class="cl-search"><input id="b"></div>`;
    document.body.appendChild(akar);
    expect(cariKotakPencarian(akar)?.id).toBe('b');
    akar.remove();
  });

  it('tombol baru yang terkunci tidak dipakai', () => {
    const akar = document.createElement('div');
    akar.innerHTML = `<app-header-title><button class="header-button" disabled>+</button></app-header-title>`;
    document.body.appendChild(akar);
    expect(cariTombolBaru(akar)).toBeNull();
    akar.querySelector('button')!.removeAttribute('disabled');
    expect(cariTombolBaru(akar)).not.toBeNull();
    akar.remove();
  });
});
