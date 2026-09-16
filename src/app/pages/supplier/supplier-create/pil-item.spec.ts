import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

/**
 * Pil (chip) item yang dijual pada formulir pemasok.
 *
 * KELUHANNYA: "pas pill nya gw klik kan harusnya delete ya. ini kok ngga ya??"
 *
 * Markup di bawah SALINAN PERSIS dari `supplier-create.component.html`,
 * termasuk satu hal yang mudah luput: seluruhnya berada di dalam
 * `<form (ngSubmit)>`. Tombol `<button matChipRemove>` ditulis TANPA
 * `type="button"`, dan tombol tanpa tipe di dalam form bertipe `submit`.
 *
 * Diuji di peramban sungguhan, bukan dibaca: yang menentukan adalah apa yang
 * terjadi pada klik, dan itu hasil dari penanganan kejadian Material,
 * perilaku bawaan tombol, dan form — tiga hal yang tidak dapat disimpulkan
 * dari satu berkas mana pun.
 */

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatChipsModule, MatIconModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <div class="sc-tags" *ngIf="items.length > 0">
        <mat-chip-set>
          <mat-chip
            *ngFor="let item of items"
            class="pil-hapus"
            [removable]="true"
            (removed)="remove(item)"
            (click)="remove(item)"
            title="Klik untuk menghapus"
          >
            {{ item }}
            <button matChipRemove type="button" aria-label="hapus">
              <mat-icon>close</mat-icon>
            </button>
          </mat-chip>
        </mat-chip-set>
      </div>
      <input matInput formControlName="soldItems" />
    </form>
  `,
})
class TuanRumah {
  private fb = new FormBuilder();
  form = this.fb.group({ soldItems: [''] });
  items = ['Besi beton', 'Semen', 'Pasir'];
  submitDipanggil = 0;

  remove(item: string) {
    const i = this.items.indexOf(item);
    if (i >= 0) this.items.splice(i, 1);
  }

  onSubmit() {
    this.submitDipanggil++;
  }
}

describe('Pil item yang dijual', () => {
  function pasang() {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [TuanRumah, NoopAnimationsModule],
      errorOnUnknownElements: false,
      errorOnUnknownProperties: false,
    });
    const f = TestBed.createComponent(TuanRumah);
    f.detectChanges();
    return f;
  }

  it('tombol × MENGHAPUS pilnya', () => {
    const f = pasang();
    const tombol: HTMLElement =
      f.nativeElement.querySelector('[matChipRemove]') ??
      f.nativeElement.querySelector('.mat-mdc-chip-remove');
    expect(tombol).withContext('tombol hapus tidak ada di DOM').toBeTruthy();

    tombol.click();
    f.detectChanges();

    expect(f.componentInstance.items).toEqual(['Semen', 'Pasir']);
  });

  it('tombol × TIDAK ikut mengirim formulirnya', () => {
    /*
     * `<button>` tanpa `type` di dalam `<form>` bertipe `submit`.
     *
     * TERUS TERANG: uji ini HIJAU dengan atau tanpa `type="button"`. Saya
     * mencobanya — melepas atributnya tidak membuat satu pun uji di berkas
     * ini merah, karena Material memanggil `preventDefault()` pada kliknya
     * dan pengirimannya memang tertahan hari ini.
     *
     * Jadi uji ini TIDAK menjaga atribut itu; ia menjaga AKIBATNYA — bahwa
     * mengklik × tidak pernah menyimpan pemasok. `type="button"` tetap
     * ditulis di templatenya sebagai lapis kedua: menggantungkan diri pada
     * penanganan pustaka berarti klik × akan mengirim formulir begitu
     * penanganan itu berubah, dan yang mengkliknya mengira ia sedang
     * menghapus satu pil.
     */
    const f = pasang();
    const tombol: HTMLElement = f.nativeElement.querySelector('[matChipRemove]');
    tombol.click();
    f.detectChanges();

    expect(f.componentInstance.submitDipanggil)
      .withContext('klik × mengirim formulir — pemasok akan tersimpan')
      .toBe(0);
  });

  it('tombol × hanya menghapus SATU kali, bukan dua', () => {
    /*
     * Badan pil dan tombol × sekarang KEDUANYA memanggil `remove`.
     *
     * Material memanggil `stopPropagation()` pada klik ×, sehingga kliknya
     * tidak naik ke badan pil. Kalau suatu saat tidak, satu klik menghapus
     * dua pil — yang kedua tidak pernah disentuh siapa pun.
     */
    const f = pasang();
    const tombol: HTMLElement = f.nativeElement.querySelector('[matChipRemove]');
    tombol.click();
    f.detectChanges();
    expect(f.componentInstance.items.length).toBe(2);
  });

  it('KLIK PADA BADAN PIL menghapusnya juga', () => {
    /*
     * Inti keluhannya. Sasaran × hanya ~18px; pil-nya ~28px tinggi dan
     * selebar teksnya. Orang mengklik pilnya — itu sasaran yang terlihat —
     * dan tidak terjadi apa-apa.
     *
     * Tidak ada galat, tidak ada umpan balik. Yang mengklik menyimpulkan
     * pilnya memang tidak bisa dihapus, lalu mengulangi formulirnya dari awal.
     */
    const f = pasang();
    const pil: HTMLElement = f.nativeElement.querySelector('mat-chip');
    expect(pil).toBeTruthy();

    pil.click();
    f.detectChanges();

    expect(f.componentInstance.items)
      .withContext(
        'klik pada badan pil tidak menghapus apa pun — inilah keluhan yang ' +
          'memulai berkas ini',
      )
      .toEqual(['Semen', 'Pasir']);
  });

  it('klik badan pil tidak mengirim formulirnya', () => {
    const f = pasang();
    const pil: HTMLElement = f.nativeElement.querySelector('mat-chip');
    pil.click();
    f.detectChanges();
    expect(f.componentInstance.submitDipanggil).toBe(0);
  });
});
