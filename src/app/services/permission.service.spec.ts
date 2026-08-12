import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { PermissionService } from './permission.service';
import { ApiService } from './api.service';

/**
 * Pengujian layanan izin.
 *
 * Yang dijaga di sini adalah tiga keadaan yang pernah salah dan tidak
 * terlihat sebagai galat — menu hanya lenyap, dan penyebabnya sulit ditebak:
 *
 *   1. gagal memuat tidak boleh dianggap selesai, agar dapat dicoba lagi
 *   2. sesi yang berakhir tidak boleh mengosongkan peta izin, karena menu
 *      akan lenyap mendahului pesan "silakan masuk kembali"
 *   3. tanpa token, jangan bertanya sama sekali
 */
describe('PermissionService', () => {
  let api: jasmine.SpyObj<ApiService>;

  const buat = () => {
    TestBed.configureTestingModule({
      providers: [PermissionService, { provide: ApiService, useValue: api }],
    });
    return TestBed.inject(PermissionService);
  };

  beforeEach(() => {
    api = jasmine.createSpyObj('ApiService', ['get']);
    localStorage.setItem('access_token', 'token-uji');
  });

  afterEach(() => {
    localStorage.removeItem('access_token');
    TestBed.resetTestingModule();
  });

  it('memuat izin dan menandainya selesai', async () => {
    api.get.and.returnValue(
      of({ level: 3, permissions: { purchase_order: { read: true } } }),
    );

    const s = buat();
    await s.load();

    expect(s.can('purchase_order', 'read')).toBeTrue();
    expect(s.loaded()).toBeTrue();
  });

  it('menolak aksi yang tidak ada di peta izin', async () => {
    api.get.and.returnValue(
      of({ level: 1, permissions: { purchase_order: { read: true } } }),
    );

    const s = buat();
    await s.load();

    expect(s.can('purchase_order', 'delete')).toBeFalse();
    expect(s.can('bank', 'read')).toBeFalse();
  });

  it('tidak menandai selesai bila pemuatannya gagal', async () => {
    // Ditandai selesai berarti tidak pernah dicoba lagi, dan menu tetap
    // kosong sampai halaman dimuat ulang.
    api.get.and.returnValue(throwError(() => ({ status: 500 })));

    const s = buat();
    await s.load();

    expect(s.loaded()).toBeFalse();
  });

  it('tidak mengosongkan izin ketika sesi berakhir', async () => {
    api.get.and.returnValue(
      of({ level: 3, permissions: { purchase_order: { read: true } } }),
    );
    const s = buat();
    await s.load();

    api.get.and.returnValue(throwError(() => ({ status: 401 })));
    await s.load(true);

    // Interceptor sudah mengarahkan ke halaman masuk; menu dibiarkan apa
    // adanya supaya tidak lenyap mendahului pesannya.
    expect(s.can('purchase_order', 'read')).toBeTrue();
  });

  it('tidak menghubungi server bila tidak ada token', async () => {
    localStorage.removeItem('access_token');

    const s = buat();
    await s.load();

    expect(api.get).not.toHaveBeenCalled();
  });

  it('hanya sekali menghubungi server untuk beberapa pemanggilan bersamaan', async () => {
    api.get.and.returnValue(of({ level: 3, permissions: {} }));

    const s = buat();
    await Promise.all([s.load(), s.load(), s.load()]);

    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it('mengosongkan izin saat keluar', async () => {
    api.get.and.returnValue(
      of({ level: 5, permissions: { bank: { delete: true } } }),
    );
    const s = buat();
    await s.load();

    s.clear();

    expect(s.can('bank', 'delete')).toBeFalse();
    expect(s.loaded()).toBeFalse();
  });
});
