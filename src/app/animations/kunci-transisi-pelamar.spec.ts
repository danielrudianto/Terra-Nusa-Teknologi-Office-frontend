import { routes } from '../app-routing.module';
import { kunciTransisi, SimpulRute } from './transisi-rute';

/**
 * "penyakit sama nih, tiap gw pilih menu di secondary side navigation,
 *  transition nya 1 page"
 *
 * Penyakit yang sama dengan Data Master dulu (`kunci-transisi.spec.ts`),
 * sebab yang berbeda. Daftar pelamar adalah rute AKAR, dan menu samping
 * kelompoknya menyimpan pilihan di parameter KUERI (`?kelompok=submit`).
 * Di luar subpohon bersarang kunci kerangka utama adalah URL PENUH —
 * termasuk kuerinya — jadi setiap klik kelompok menganimasikan seluruh
 * halaman.
 *
 * Yang diuji di sini RUTE SUNGGUHANNYA, diambil dari `routes`, bukan pohon
 * buatan: penandanya hidup di konfigurasi rute, dan yang dapat hilang
 * adalah baris konfigurasi itu — misalnya saat rutenya dipindah lagi.
 */

function cariRute(jalur: string): any {
  const tumpuk: any[] = [...routes];
  while (tumpuk.length) {
    const r = tumpuk.shift();
    if (r?.path === jalur) return r;
    if (Array.isArray(r?.children)) tumpuk.push(...r.children);
  }
  return null;
}

/** Pohon `/<induk...>/HrCandidate` dengan data rute yang SUNGGUHAN. */
function pohonPelamar(): SimpulRute {
  const rute = cariRute('HrCandidate');
  const daun: SimpulRute = {
    snapshot: { url: [{ path: 'HrCandidate' }], data: rute?.data },
    firstChild: null,
  };
  return { snapshot: { url: [], data: undefined }, firstChild: daun };
}

describe('transisi daftar pelamar', () => {
  it('rutenya ada', () => {
    expect(cariRute('HrCandidate')).not.toBeNull();
  });

  it('rutenya menyatakan mengurus transisinya sendiri', () => {
    expect(cariRute('HrCandidate')?.data?.transisiBersarang).toBeTrue();
  });

  it('berganti kelompok TIDAK mengubah kunci kerangka utama', () => {
    const a = kunciTransisi(pohonPelamar(), '/HrCandidate?kelompok=submit');
    const b = kunciTransisi(pohonPelamar(), '/HrCandidate?kelompok=ditolak');
    expect(a).toBe(b);
  });

  it('mengetik pencarian TIDAK mengubah kunci kerangka utama', () => {
    const a = kunciTransisi(pohonPelamar(), '/HrCandidate');
    const b = kunciTransisi(pohonPelamar(), '/HrCandidate?cari=budi');
    expect(a).toBe(b);
  });

  it('kuncinya tetap menyebut halamannya', () => {
    // Datang dari halaman lain TETAP menganimasikan kerangka utama.
    expect(kunciTransisi(pohonPelamar(), '/HrCandidate?kelompok=submit')).toBe(
      '/HrCandidate',
    );
  });
});
