import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Router, RouterModule, provideRouter } from '@angular/router';

import { DURASI_BAWAAN, MULAI_TRANSISI, transisiRute } from './transisi-rute';

/**
 * Transisi pada rute BERSARANG.
 *
 * Settings jalan; Purchase Order -> Draf Pembelian tidak. Bedanya satu:
 * PO dan Draf punya komponen induk yang templatenya HANYA
 * `<router-outlet></router-outlet>`, sementara Settings adalah anak langsung.
 *
 * Harness sebelumnya tidak punya lapis itu — dan itu sebabnya ia tidak pernah
 * mereproduksi apa pun.
 */

@Component({ standalone: true, template: `<p id="isi-a" style="height:300px">A</p>` })
class DaftarA {}
@Component({ standalone: true, template: `<p id="isi-b" style="height:300px">B</p>` })
class DaftarB {}

/** Cangkang persis seperti purchase-order.component.html: outlet telanjang. */
@Component({ standalone: true, imports: [RouterModule], template: `<router-outlet></router-outlet>` })
class CangkangA {}
@Component({ standalone: true, imports: [RouterModule], template: `<router-outlet></router-outlet>` })
class CangkangB {}

@Component({
  standalone: true,
  imports: [RouterModule],
  animations: [transisiRute],
  template: `
    <div id="bungkus" [@transisiRute]="{ value: kunci, params: { durasi: durasi, jeda: 0, mulai: mulai } }">
      <router-outlet></router-outlet>
    </div>
  `,
})
class TuanRumah {
  kunci = '/a';
  durasi = DURASI_BAWAAN;
  mulai = MULAI_TRANSISI['push-up'];
}

function jalan(el: Element): Animation[] {
  return ((el as any).getAnimations() as Animation[]).filter(
    (a) => a.playState === 'running' || a.playState === 'paused',
  );
}

describe('Transisi pada rute BERSARANG', () => {
  let f: ComponentFixture<TuanRumah>;
  let router: Router;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [TuanRumah, BrowserAnimationsModule],
      providers: [
        provideRouter([
          { path: 'a', component: CangkangA, children: [{ path: '', component: DaftarA }] },
          { path: 'b', component: CangkangB, children: [{ path: '', component: DaftarB }] },
        ]),
      ],
    });
    router = TestBed.inject(Router);
    f = TestBed.createComponent(TuanRumah);
    f.detectChanges();
    await router.navigate(['/a']);
    f.componentInstance.kunci = '/a';
    f.detectChanges();
  });

  it('BERANIMASI saat berpindah antar rute bersarang', async () => {
    const bungkus = f.nativeElement.querySelector('#bungkus') as HTMLElement;
    (bungkus as any).getAnimations().forEach((a: Animation) => a.finish());

    await router.navigate(['/b']);
    f.componentInstance.kunci = '/b';
    f.detectChanges();

    expect(f.nativeElement.querySelector('#isi-b')).withContext('halaman B harus ada').toBeTruthy();
    expect(jalan(bungkus).length)
      .withContext('tidak ada animasi yang berjalan pada rute bersarang')
      .toBeGreaterThan(0);
  });

  it('halaman lama tidak menempati ruang bersama yang baru', async () => {
    const bungkus = f.nativeElement.querySelector('#bungkus') as HTMLElement;
    (bungkus as any).getAnimations().forEach((a: Animation) => a.finish());
    const sebelum = bungkus.getBoundingClientRect().height;

    await router.navigate(['/b']);
    f.componentInstance.kunci = '/b';
    f.detectChanges();

    const sesudah = bungkus.getBoundingClientRect().height;
    expect(sesudah).withContext(`tinggi ${sebelum} -> ${sesudah}`).toBeLessThan(sebelum * 1.5);
  });
});
