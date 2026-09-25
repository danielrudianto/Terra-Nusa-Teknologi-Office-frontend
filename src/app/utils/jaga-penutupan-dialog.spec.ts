/*
 * DIALOG YANG MELAPORKAN SESUATU HARUS TETAP MELAPORKANNYA WALAU DITUTUP
 * LEWAT LATAR ATAU `Esc`.
 *
 * Cacat aslinya, dan ia tidak menghasilkan galat apa pun:
 *
 *   * menyetujui CoP dari menu titik-tiga di daftar -> barisnya hilang;
 *   * menyetujui CoP dari DALAM dialog lihat, lalu menutupnya dengan menekan
 *     di luar kotaknya — cara yang paling wajar — -> barisnya TETAP ADA.
 *
 * Sebabnya: tombol tutupnya menutup dengan membawa bendera perubahan,
 * tetapi penutupan bawaan Angular Material menutup dengan `undefined`, dan
 * daftar di belakangnya hanya memuat ulang bila benderanya benar.
 */

import { Subject } from 'rxjs';

import { jagaPenutupanDialog } from './jaga-penutupan-dialog';

function refTiruan() {
  const latar = new Subject<MouseEvent>();
  const tombol = new Subject<KeyboardEvent>();
  const ref: any = {
    disableClose: false,
    ditutupDengan: [] as any[],
    close(v: any) {
      this.ditutupDengan.push(v);
    },
    backdropClick: () => latar.asObservable(),
    keydownEvents: () => tombol.asObservable(),
  };
  return { ref, latar, tombol };
}

describe('jagaPenutupanDialog', () => {
  it('klik latar menutup dengan NILAI, bukan undefined', () => {
    const { ref, latar } = refTiruan();
    let berubah = false;
    jagaPenutupanDialog(ref, () => berubah);
    berubah = true; // disetujui SESUDAH penjagaan dipasang
    latar.next(new MouseEvent('click'));
    expect(ref.ditutupDengan).toEqual([true]);
  });

  it('`Esc` menutup dengan nilai yang sama', () => {
    const { ref, tombol } = refTiruan();
    jagaPenutupanDialog(ref, () => 'ubah');
    tombol.next(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(ref.ditutupDengan).toEqual(['ubah']);
  });

  it('tombol lain TIDAK menutup dialog', () => {
    // Isian di dalam dialog masih memerlukan papan tiknya.
    const { ref, tombol } = refTiruan();
    jagaPenutupanDialog(ref, () => true);
    for (const key of ['Enter', 'a', 'Tab', 'ArrowDown']) {
      tombol.next(new KeyboardEvent('keydown', { key }));
    }
    expect(ref.ditutupDengan).toEqual([]);
  });

  it('`disableClose` dipasang — tanpa itu Material menutup lebih dulu', () => {
    const { ref } = refTiruan();
    jagaPenutupanDialog(ref, () => true);
    expect(ref.disableClose).toBeTrue();
  });

  it('nilainya dibaca SAAT DITUTUP, bukan saat dipasang', () => {
    /*
     * Ini inti perbaikannya. Penjagaan dipasang di `ngOnInit`, ketika
     * bendera perubahannya masih `false`. Menyalin nilainya saat itu membuat
     * penjagaan ini melaporkan "tidak ada yang berubah" selamanya — persis
     * cacat yang hendak dibereskan, hanya berpindah tempat.
     */
    const { ref, latar } = refTiruan();
    const keadaan = { berubah: false };
    jagaPenutupanDialog(ref, () => keadaan.berubah);
    keadaan.berubah = true;
    latar.next(new MouseEvent('click'));
    expect(ref.ditutupDengan).toEqual([true]);
  });

  it('ref kosong tidak melempar', () => {
    expect(() => jagaPenutupanDialog(null, () => true)).not.toThrow();
    expect(() => jagaPenutupanDialog(undefined, () => true)).not.toThrow();
  });
});
