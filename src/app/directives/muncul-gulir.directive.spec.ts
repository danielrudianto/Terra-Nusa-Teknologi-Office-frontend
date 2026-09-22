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
    await new Promise((r) => setTimeout(r, 200));
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
