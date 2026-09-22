import { Component, LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { registerLocaleData } from '@angular/common';
import localeId from '@angular/common/locales/id';
import { RupiahComponent } from './rupiah.component';

registerLocaleData(localeId);

@Component({
  standalone: true,
  imports: [RupiahComponent],
  template: `<app-rupiah [nilai]="n" [digit]="d" />`,
})
class Tuan {
  n: any = 1234567.5;
  d = '1.2-2';
}

describe('RupiahComponent', () => {
  function teks(n: any, d = '1.2-2') {
    TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'id' }] });
    const f = TestBed.createComponent(Tuan);
    f.componentInstance.n = n;
    f.componentInstance.d = d;
    f.detectChanges();
    return (f.nativeElement.textContent as string).replace(/\s+/g, ' ').trim();
  }

  it('format lokal id, dua desimal', () => {
    expect(teks(1234567.5)).toBe('Rp1.234.567,50');
  });
  it('digit ikut masukan', () => {
    expect(teks(1234567.5, '1.0-0')).toBe('Rp1.234.568');
  });
  it('negatif: tanda di depan Rp', () => {
    expect(teks(-2500)).toBe('−Rp2.500,00');
  });
  it('nol negatif dibaca nol', () => {
    expect(teks(-0.001)).toBe('Rp0,00');
  });
  it('null dibaca nol', () => {
    expect(teks(null)).toBe('Rp0,00');
  });
});
