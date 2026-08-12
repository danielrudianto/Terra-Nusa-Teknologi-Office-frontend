import { TestBed } from '@angular/core/testing';
import { CanActivateFn, Router } from '@angular/router';

import { authGuard } from './auth.guard';

/**
 * Pengujian penjaga rute.
 *
 * Penjaga ini pernah berisi `return true` saja dan tidak dipasang di rute
 * mana pun — aplikasi terbuka tanpa token sama sekali: berandanya muncul
 * dengan nama "Guest", menunya kosong, dan setiap permintaan ditolak tanpa
 * satu pun keterangan yang menjelaskan sebabnya.
 *
 * Kegagalan seperti itu tidak terlihat sebagai galat, sehingga perlu dijaga
 * pengujian.
 */
describe('authGuard', () => {
  let router: jasmine.SpyObj<Router>;

  const jalankan = (url = '/Purchase-order') =>
    TestBed.runInInjectionContext(() =>
      (authGuard as CanActivateFn)({} as any, { url } as any),
    );

  beforeEach(() => {
    router = jasmine.createSpyObj('Router', ['navigate']);
    TestBed.configureTestingModule({
      providers: [{ provide: Router, useValue: router }],
    });
    localStorage.clear();
  });

  afterEach(() => localStorage.clear());

  it('meloloskan yang punya token', () => {
    localStorage.setItem('access_token', 'token-uji');

    expect(jalankan()).toBeTrue();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('menahan yang tidak punya token', () => {
    expect(jalankan()).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/Login']);
  });

  it('mengingat halaman yang dituju', () => {
    jalankan('/Purchase-order/Create/A');

    expect(localStorage.getItem('returnUrl')).toBe('/Purchase-order/Create/A');
  });

  it('tidak mengingat halaman masuk sebagai tujuan', () => {
    // Menyimpannya membuat pengguna dikembalikan ke halaman masuk setelah
    // berhasil masuk — berputar di tempat.
    jalankan('/Login');

    expect(localStorage.getItem('returnUrl')).toBeNull();
  });

  it('menahan bila token kosong, bukan sekadar tidak ada', () => {
    localStorage.setItem('access_token', '');

    expect(jalankan()).toBeFalse();
  });
});
