/*
 * Mengetik di kotak "Cari menu" membekukan halaman (22 Sep 2026).
 *
 * `hasilMaster` membuat larik baru tiap putaran deteksi perubahan; `*ngFor`
 * lalu membuat ulang butir menunya, `routerLinkActive` di tiap butir memicu
 * putaran berikutnya — tanpa ujung. Getternya harus mengembalikan larik yang
 * SAMA selama masukannya sama.
 */
import { SideNavComponent } from './side-nav.component';

describe('cari menu: hasil Data Master', () => {
  function nav(): any {
    const c: any = Object.create(SideNavComponent.prototype);
    Object.assign(c, {
      filter: 'kli',
      items: [{ name: 'g', children: [{ route: '/Master' }] }],
      izin: { canRead: () => true },
      translate: { currentLang: 'id', instant: (k: string) => (k.includes('client') ? 'Klien' : k) },
    });
    return c;
  }

  it('larik yang sama selama masukannya sama', () => {
    const c = nav();
    const a = c.hasilMaster;
    expect(a.length).toBeGreaterThan(0);
    expect(c.hasilMaster).toBe(a);
    expect(c.hasilMaster[0]).toBe(a[0]);
  });

  it('berubah saat kata carinya berubah', () => {
    const c = nav();
    const a = c.hasilMaster;
    c.filter = 'zzz';
    expect(c.hasilMaster).not.toBe(a);
    expect(c.hasilMaster.length).toBe(0);
  });

  it('tanpa pencarian: larik kosong yang tetap', () => {
    const c = nav();
    c.filter = '';
    expect(c.hasilMaster).toBe(c.hasilMaster);
  });
});
