/*
 * AVATAR DI DALAM INDUK OnPush.
 *
 * Gejalanya: membuka layar view CoP, Nazula tampil BERINISIAL. Menutup lalu
 * membukanya lagi — wajahnya ada. Tidak ada galat, di layar maupun konsol.
 *
 * Sebabnya urutan pemancaran, bukan datanya:
 *
 *   * pembukaan PERTAMA — `AvatarService` memancarkan `null` seketika
 *     (inisial), lalu konfigurasi sungguhannya menyusul lewat `subscribe`.
 *     Pada induk OnPush, `this.svg` yang disetel di dalam callback itu tidak
 *     menandai siapa pun kotor, sehingga tampilannya tidak pernah diperiksa
 *     ulang;
 *
 *   * pembukaan KEDUA — jawabannya sudah di cache, `BehaviorSubject`
 *     memancarkannya SERENTAK di dalam `ngOnChanges`, di tengah putaran
 *     deteksi yang memang sedang berjalan. `svg` terisi sebelum digambar,
 *     jadi wajahnya muncul.
 *
 * Yang diuji di sini PEMBUKAAN PERTAMA, dan harus di dalam induk OnPush —
 * pada induk biasa kekeliruan ini tidak dapat dibuat muncul sama sekali.
 */

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { AvatarComponent } from './avatar.component';
import { AvatarService, KeadaanAvatar } from '../../services/avatar.service';

/** Induk OnPush — seperti layar view CoP. */
@Component({
  standalone: true,
  imports: [AvatarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-avatar [userId]="11" [name]="'Nazula Lintang Rahmadhani'" />`,
})
class IndukOnPush {}

describe('avatar di dalam induk OnPush', () => {
  let aliran: Subject<KeadaanAvatar>;
  let fixture: ComponentFixture<IndukOnPush>;

  beforeEach(() => {
    aliran = new Subject<KeadaanAvatar>();
    TestBed.configureTestingModule({
      imports: [IndukOnPush],
      providers: [{ provide: AvatarService, useValue: { get: () => aliran } }],
    });
    fixture = TestBed.createComponent(IndukOnPush);
    fixture.detectChanges();
  });

  function teks(): string {
    return (fixture.nativeElement as HTMLElement).textContent || '';
  }

  function adaSvg(): boolean {
    return !!(fixture.nativeElement as HTMLElement).querySelector('.av__svg');
  }

  it('sebelum jawabannya tiba: inisial', () => {
    expect(teks().trim()).toBe('NR');
    expect(adaSvg()).toBeFalse();
  });

  it('avatar yang tiba BELAKANGAN tetap tergambar', fakeAsync(() => {
    aliran.next({ face: 'face-02', tone: 'tone-02' } as any);
    tick();
    fixture.detectChanges();

    expect(adaSvg())
      .withContext(
        'wajahnya tidak pernah tergambar — inisial bertahan sampai ' +
          'halamannya dibuka ulang, tanpa galat di mana pun',
      )
      .toBeTrue();
  }));

  it('jawaban "tidak punya avatar" mengembalikan inisial', fakeAsync(() => {
    aliran.next({ face: 'face-02', tone: 'tone-02' } as any);
    tick();
    fixture.detectChanges();
    expect(adaSvg()).toBeTrue();

    /*
     * `null` susulan berarti avatarnya ternyata tidak ada — mis. sesudah
     * dihapus. Wajah yang tertinggal di layar setelah itu adalah wajah
     * seseorang yang sudah tidak punya avatar.
     */
    aliran.next(null);
    tick();
    fixture.detectChanges();

    expect(adaSvg()).toBeFalse();
    expect(teks().trim()).toBe('NR');
  }));
});
