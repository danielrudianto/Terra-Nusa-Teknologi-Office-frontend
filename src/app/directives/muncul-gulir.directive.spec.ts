import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MunculGulirDirective } from './muncul-gulir.directive';

@Component({
  standalone: true,
  imports: [MunculGulirDirective],
  template: `<div appMunculGulir="kiri" [mgJeda]="80" style="height:40px">isi</div>`,
})
class Uji {}

/*
 * PENGAMAT DIPALSUKAN, bukan ditunggu.
 *
 * Versi sebelumnya memakai `IntersectionObserver` sungguhan lalu menunggu
 * sampai dua detik. Yang menjadwalkannya peramban, dan pada mesin uji yang
 * sibuk — atau ketika sisa DOM uji lain menggeser elemennya ke luar layar —
 * panggilannya tidak pernah tiba. Ujinya merah tanpa ada yang rusak, dan
 * uji yang kadang merah lebih buruk daripada tidak ada uji: yang membacanya
 * berhenti mempercayai warnanya, lalu berhenti membacanya.
 *
 * Yang sebenarnya hendak diuji bukan penjadwalan peramban, melainkan
 * perilaku direktifnya: terpasang tersembunyi, tampil ketika pengamat
 * melapor elemennya masuk layar, dan berhenti mengamati sesudahnya. Ketiga
 * hal itu dapat dijalankan tanpa menunggu apa pun.
 */
class PengamatPalsu {
  static terakhir: PengamatPalsu | null = null;
  readonly diamati: Element[] = [];
  terputus = false;

  constructor(private readonly panggilan: IntersectionObserverCallback) {
    PengamatPalsu.terakhir = this;
  }

  observe(el: Element): void {
    this.diamati.push(el);
  }
  disconnect(): void {
    this.terputus = true;
  }
  unobserve(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  /** Jalankan panggilan baliknya seperti peramban ketika elemen masuk layar. */
  masukLayar(isIntersecting = true): void {
    this.panggilan(
      [{ isIntersecting, target: this.diamati[0] } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}

describe('MunculGulirDirective', () => {
  let asli: typeof IntersectionObserver;

  beforeEach(() => {
    asli = window.IntersectionObserver;
    PengamatPalsu.terakhir = null;
    (window as any).IntersectionObserver = PengamatPalsu;
  });

  afterEach(() => {
    (window as any).IntersectionObserver = asli;
    document.documentElement.removeAttribute('data-gerak');
  });

  it('dipasang tersembunyi, lalu tampil saat masuk layar', () => {
    const f = TestBed.createComponent(Uji);
    f.detectChanges();
    const el: HTMLElement = f.nativeElement.querySelector('div');

    expect(el.classList).toContain('akn-mg');
    expect(el.classList).toContain('akn-mg--kiri');
    expect(el.classList).not.toContain('akn-mg--tampil');

    PengamatPalsu.terakhir!.masukLayar();
    expect(el.classList).toContain('akn-mg--tampil');
  });

  it('belum masuk layar: tetap tersembunyi', () => {
    const f = TestBed.createComponent(Uji);
    f.detectChanges();
    const el: HTMLElement = f.nativeElement.querySelector('div');

    PengamatPalsu.terakhir!.masukLayar(false);
    expect(el.classList).not.toContain('akn-mg--tampil');
  });

  it('sekali tampil, pengamatnya dilepas', () => {
    // Menggulir balik tidak boleh memutar ulang animasinya, dan pengamat
    // yang menggantung menahan elemennya dari pembersihan memori.
    const f = TestBed.createComponent(Uji);
    f.detectChanges();
    PengamatPalsu.terakhir!.masukLayar();
    expect(PengamatPalsu.terakhir!.terputus).toBeTrue();
  });

  it('jeda diteruskan sebagai variabel CSS', () => {
    const f = TestBed.createComponent(Uji);
    f.detectChanges();
    const el: HTMLElement = f.nativeElement.querySelector('div');
    expect(el.style.getPropertyValue('--akn-mg-jeda')).toBe('80ms');
  });

  it('sakelar gerak mati: tidak disembunyikan sama sekali', () => {
    document.documentElement.setAttribute('data-gerak', 'mati');
    const f = TestBed.createComponent(Uji);
    f.detectChanges();
    expect(f.nativeElement.querySelector('div').classList).not.toContain('akn-mg');
    // Tidak ada pengamat yang dibuat sama sekali — bukan sekadar kelasnya
    // tidak dipasang.
    expect(PengamatPalsu.terakhir).toBeNull();
  });
});
