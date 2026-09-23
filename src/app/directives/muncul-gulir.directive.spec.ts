import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MunculGulirDirective } from './muncul-gulir.directive';

@Component({
  standalone: true,
  imports: [MunculGulirDirective],
  template: `<div appMunculGulir="kiri" [mgJeda]="80" style="height:40px">isi</div>`,
})
class Uji {}

describe('MunculGulirDirective', () => {
  afterEach(() => document.documentElement.removeAttribute('data-gerak'));

  it('dipasang tersembunyi, lalu tampil saat masuk layar', async () => {
    const f = TestBed.createComponent(Uji);
    document.body.appendChild(f.nativeElement);
    f.detectChanges();
    const el: HTMLElement = f.nativeElement.querySelector('div');
    expect(el.classList).toContain('akn-mg');
    expect(el.classList).toContain('akn-mg--kiri');
    /*
     * DITUNGGU SAMPAI MUNCUL, bukan ditunggu 200 ms.
     *
     * Yang menampilkannya `IntersectionObserver` — pengamat yang dijadwalkan
     * peramban, bukan timer. Pada mesin yang sedang sibuk panggilannya dapat
     * tiba setelah 200 ms, dan ujinya merah tanpa ada yang rusak. Uji yang
     * kadang merah lebih buruk daripada tidak ada uji: yang membacanya
     * berhenti mempercayai warnanya.
     */
    for (let i = 0; i < 40 && !el.classList.contains('akn-mg--tampil'); i++) {
      await new Promise((r) => setTimeout(r, 50));
    }
    expect(el.classList).toContain('akn-mg--tampil');
    f.nativeElement.remove();
  });

  it('sakelar gerak mati: tidak disembunyikan sama sekali', () => {
    document.documentElement.setAttribute('data-gerak', 'mati');
    const f = TestBed.createComponent(Uji);
    f.detectChanges();
    expect(f.nativeElement.querySelector('div').classList).not.toContain('akn-mg');
  });
});
