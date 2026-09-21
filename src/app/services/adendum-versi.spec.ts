/*
 * Versi baris PO yang dikirim kembali saat menyimpan ubahan.
 *
 * Tanpa versi, server menyimpan TANPA penjagaan: dua orang yang menyunting
 * PO yang sama saling menimpa diam-diam. Keenam belas formulir PO mengirim
 * versinya lewat satu fungsi ini.
 */

import { of } from 'rxjs';
import { convertToParamMap } from '@angular/router';
import { AdendumService } from './adendum.service';

function layanan(query: Record<string, string>, dokumen: any) {
  const api: any = { get: () => of(dokumen) };
  const route: any = { snapshot: { queryParamMap: convertToParamMap(query) } };
  return new AdendumService(api, route);
}

describe('AdendumService.denganVersi', () => {
  it('mode UBAH: versi dari dokumen yang dimuat ikut dikirim', (done) => {
    const a = layanan({ ubah: '42' }, { id: 42, rowVersion: 7 });
    a.muatInduk().subscribe(() => {
      expect(a.denganVersi({ note: 'x' })).toEqual({ note: 'x', rowVersion: 7 } as any);
      done();
    });
  });

  it('versi 0 tetap dikirim — bukan dianggap "tidak ada"', (done) => {
    // `if (v)` akan membuang 0, dan PO yang belum pernah disunting
    // (versi 0) disimpan tanpa penjagaan.
    const a = layanan({ ubah: '42' }, { id: 42, rowVersion: 0 });
    a.muatInduk().subscribe(() => {
      expect((a.denganVersi({}) as any).rowVersion).toBe(0);
      done();
    });
  });

  it('ADENDUM tidak diberi versi — ia menerbitkan dokumen baru', (done) => {
    const a = layanan({ adendumDari: '42' }, { id: 42, rowVersion: 7 });
    a.muatInduk().subscribe(() => {
      expect('rowVersion' in a.denganVersi({})).toBeFalse();
      done();
    });
  });

  it('pembuatan biasa tidak diberi versi', () => {
    const a = layanan({}, null);
    expect('rowVersion' in a.denganVersi({})).toBeFalse();
  });

  it('dokumen tanpa versi dari server tidak mengirim versi palsu', (done) => {
    const a = layanan({ ubah: '42' }, { id: 42 });
    a.muatInduk().subscribe(() => {
      expect('rowVersion' in a.denganVersi({})).toBeFalse();
      done();
    });
  });

  it('muatan aslinya tidak diubah', (done) => {
    const a = layanan({ ubah: '42' }, { id: 42, rowVersion: 3 });
    const asli = { note: 'x' };
    a.muatInduk().subscribe(() => {
      a.denganVersi(asli);
      expect('rowVersion' in asli).toBeFalse();
      done();
    });
  });
});
