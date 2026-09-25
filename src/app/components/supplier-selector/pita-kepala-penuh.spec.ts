/*
 * PITA KEPALA DIALOG HARUS MENYENTUH KEDUA TEPI.
 *
 * Keluhan aslinya: "background tulisan Pilih Supplier biru, tapi dia gak
 * sampai ujung — jadi ketauan tambahan gitu loh". Persis itu: pembungkus
 * dialognya punya `padding: 1rem`, sehingga pita berlatar warnanya berhenti
 * sejengkal sebelum tepi dan terbaca sebagai tempelan, bukan sebagai kepala
 * dialog.
 *
 * Tidak ada galat, tidak ada uji yang gagal — hanya satu dialog yang
 * bentuknya berbeda dari seluruh dialog lain, dan bedanya baru terlihat
 * ketika dibuka berdampingan.
 *
 * Yang diperiksa di sini geometrinya, bukan nilai CSS-nya: aturan boleh
 * ditulis dengan cara lain, yang tidak boleh berubah adalah pitanya
 * menempel kiri dan kanan.
 */

import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';

import { SupplierSelectorComponent } from './supplier-selector.component';

describe('Pemilih pemasok — pita kepala', () => {
  function buat() {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [SupplierSelectorComponent, TranslateModule.forRoot()],
      providers: [
        provideNoopAnimations(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialogRef, useValue: { close: () => {} } },
        { provide: MAT_DIALOG_DATA, useValue: {} },
      ],
    });
    const f = TestBed.createComponent(SupplierSelectorComponent);
    f.detectChanges();
    return f;
  }

  it('pita menempel tepi KIRI dan KANAN pembungkusnya', () => {
    const f = buat();
    const bungkus: HTMLElement = f.nativeElement.querySelector('.ss');
    const pita: HTMLElement = f.nativeElement.querySelector('.ss-head');
    expect(bungkus).toBeTruthy();
    expect(pita).toBeTruthy();

    const b = bungkus.getBoundingClientRect();
    const p = pita.getBoundingClientRect();
    // Satu piksel ditoleransi untuk pembulatan tata letak.
    expect(Math.abs(p.left - b.left))
      .withContext('pita tidak menempel tepi kiri — pembungkusnya berpadding?')
      .toBeLessThanOrEqual(1);
    expect(Math.abs(p.right - b.right))
      .withContext('pita tidak menempel tepi kanan')
      .toBeLessThanOrEqual(1);
  });

  it('pita menempel tepi ATAS — tidak ada celah latar di atasnya', () => {
    const f = buat();
    const b = f.nativeElement.querySelector('.ss').getBoundingClientRect();
    const p = f.nativeElement.querySelector('.ss-head').getBoundingClientRect();
    expect(Math.abs(p.top - b.top)).toBeLessThanOrEqual(1);
  });

  it('pembungkusnya TIDAK berpadding — paddingnya milik isi dan kaki', () => {
    // Inti cacatnya. Diperiksa langsung supaya sebabnya tersebut, bukan
    // hanya akibatnya.
    const f = buat();
    const bungkus: HTMLElement = f.nativeElement.querySelector('.ss');
    const g = getComputedStyle(bungkus);
    for (const sisi of ['paddingLeft', 'paddingRight', 'paddingTop'] as const) {
      expect(parseFloat(g[sisi]) || 0)
        .withContext(`${sisi} pada pembungkus mengurung pitanya`)
        .toBe(0);
    }
  });

  it('isi dialog TETAP berpadding — kalau tidak, teksnya menempel tepi', () => {
    const f = buat();
    const isi: HTMLElement = f.nativeElement.querySelector('.ss-content');
    const g = getComputedStyle(isi);
    expect(parseFloat(g.paddingLeft) || 0).toBeGreaterThan(8);
  });
});
