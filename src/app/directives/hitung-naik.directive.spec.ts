import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HitungNaikDirective } from './hitung-naik.directive';
import { pasangGerak } from '../animations/gerak';

@Component({
  standalone: true,
  imports: [HitungNaikDirective],
  template: `<span [appHitungNaik]="n" [hnFormat]="f" [hnDurasi]="200"></span>`,
})
class Tuan {
  n: number | null = 1234.5;
  f = (x: any) => (x == null ? '—' : 'Rp ' + Number(x).toFixed(0));
}

const tunggu = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('HitungNaikDirective', () => {
  afterEach(() => pasangGerak(true));

  function buat() {
    const f = TestBed.createComponent(Tuan);
    // Dipaku di pojok layar: badan dokumen Karma bisa memanjang oleh uji
    // lain, dan elemen di bawah lipatan memang (sengaja) tidak menghitung.
    f.nativeElement.style.cssText = 'position:fixed;top:0;left:0;z-index:9999';
    document.body.appendChild(f.nativeElement);
    f.detectChanges();
    return { f, el: f.nativeElement.querySelector('span') as HTMLElement };
  }

  it('menulis nilai AKHIR seketika, sebelum gerakan apa pun', () => {
    const { el } = buat();
    expect(el.textContent).toBe('Rp 1235');
    expect(el.getAttribute('aria-label')).toBe('Rp 1235');
  });

  it('menghitung naik saat terlihat lalu berhenti tepat di nilainya', async () => {
    const { el } = buat();
    const terlihat: number[] = [];
    for (let i = 0; i < 12; i++) {
      await tunggu(25);
      terlihat.push(Number((el.textContent || '').replace(/\D/g, '')));
    }
    // Ada angka perantara: benar-benar bergerak, bukan langsung.
    expect(terlihat.some((x) => x > 0 && x < 1235)).toBeTrue();
    await tunggu(250);
    expect(el.textContent).toBe('Rp 1235');
    expect(el.style.opacity).toBe('');
  });

  it('saklar gerak mati: langsung nilai akhir, tidak pernah disembunyikan', async () => {
    pasangGerak(false);
    const { el } = buat();
    expect(el.style.opacity).toBe('');
    await tunggu(60);
    expect(el.textContent).toBe('Rp 1235');
  });

  it('di luar layar: tersembunyi sebentar, lalu tetap DITAMPILKAN (jaring pengaman)', async () => {
    const f = TestBed.createComponent(Tuan);
    f.nativeElement.style.cssText = 'position:fixed;top:-9999px;left:0';
    document.body.appendChild(f.nativeElement);
    f.detectChanges();
    const el = f.nativeElement.querySelector('span') as HTMLElement;
    expect(el.textContent).toBe('Rp 1235');
    expect(el.style.opacity).toBe('0');
    await tunggu(1600);
    expect(el.style.opacity).toBe('');
    expect(el.textContent).toBe('Rp 1235');
  });

  it('null diteruskan ke pemformat', () => {
    const f = TestBed.createComponent(Tuan);
    f.componentInstance.n = null;
    f.detectChanges();
    expect(f.nativeElement.querySelector('span').textContent).toBe('—');
  });
});
