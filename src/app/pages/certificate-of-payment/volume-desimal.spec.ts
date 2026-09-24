/*
 * KOTAK VOLUME BAP: apa yang tersimpan saat orang mengetik desimal?
 * ================================================================
 *
 * Tiga berita acara pada 007-SPK-R501-D tersimpan dengan volume
 * 126394, 297169, dan 720404 meter lari — masing-masing dikali Rp 3.000
 * menjadi 379 juta, 891 juta, dan 2,16 MILIAR. Untuk pekerjaan bor yang
 * seminggu menghasilkan puluhan meter.
 *
 * Ketiganya persis seribu kali lipat dari angka yang masuk akal
 * (126,394 m' dalam empat hari = 32 m'/hari — wajar untuk satu rig).
 *
 * HASILNYA: KOTAK INI BERSIH.
 *
 * Diuji dengan mengetik aksara demi aksara ke kotak yang persis sama
 * (`mask="separator.2"`, `thousandSeparator=" "`, ngx-mask 19.0.7):
 *
 *     "126,394"   -> layar "126,39"     nilai 126.39
 *     "720,404"   -> layar "720,40"     nilai 720.4
 *     "126.39"    -> layar "126.39"     nilai 126.39
 *     "67095.22"  -> layar "67 095.22"  nilai 67095.22
 *
 * Koma DITERIMA sebagai pemisah desimal dan tidak pernah dibuang. Jadi
 * layar pembuatan CoP bukan asalnya — angka 126394 itu memang diketik
 * apa adanya, tanpa pemisah, kemungkinan besar dari layar BAP ponsel
 * (`mobile/bap-buat`) yang kotaknya polos tanpa mask sama sekali.
 *
 * Berkas ini karena itu bukan lagi penyelidikan melainkan PENJAGA: kalau
 * suatu saat mask-nya diganti — decimalMarker disetel, versi pustakanya
 * naik — dan koma mulai dibuang diam-diam, uji ini yang jatuh lebih dulu,
 * bukan berita acara berikutnya.
 */

import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, NgxMaskDirective],
  template: `
    <input
      type="text"
      inputmode="decimal"
      thousandSeparator=" "
      decimalScale="2"
      mask="separator.2"
      [validation]="false"
      [formControl]="vol"
    />
  `,
})
class KotakVolume {
  vol = new FormControl<string>('');
}

describe('Kotak volume BAP — koma desimal', () => {
  let fx: ComponentFixture<KotakVolume>;
  let input: HTMLInputElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [KotakVolume],
      providers: [provideNgxMask({ thousandSeparator: ' ' })],
    });
    fx = TestBed.createComponent(KotakVolume);
    fx.detectChanges();
    input = fx.nativeElement.querySelector('input');
  });

  /** Ketik aksara demi aksara, seperti orang sungguhan. */
  function ketik(teks: string): void {
    input.value = '';
    input.dispatchEvent(new Event('input'));
    for (const huruf of teks) {
      input.value = input.value + huruf;
      input.dispatchEvent(new Event('input'));
      fx.detectChanges();
    }
    input.dispatchEvent(new Event('blur'));
    fx.detectChanges();
  }

  function tersimpan(): number {
    return Number(String(fx.componentInstance.vol.value ?? '').replace(/\s/g, ''));
  }

  it('MENDOKUMENTASIKAN apa yang terjadi pada "126,394"', () => {
    ketik('126,394');
    const nilai = tersimpan();
    // Dicetak supaya terbaca di keluaran uji, apa pun hasilnya.
    // eslint-disable-next-line no-console
    console.log('[volume] ketik "126,394" -> layar:', input.value, '| nilai:', nilai);

    /*
     * SATU-SATUNYA yang tidak boleh: 126394.
     *
     * Bukan karena 126,39 atau 126 lebih benar — keduanya masih kehilangan
     * ketelitian, dan itu perkara lain. Yang ini beda jenis: angka yang
     * tersimpan SERIBU KALI lipat dari yang diketik, tanpa galat, tanpa
     * peringatan, dan langsung menjadi rupiah di dokumen yang
     * ditandatangani.
     */
    expect(nilai).not.toBe(126394);
    expect(nilai).toBeLessThan(1000);
  });

  it('"720,404" tidak boleh menjadi 720404', () => {
    ketik('720,404');
    // eslint-disable-next-line no-console
    console.log('[volume] ketik "720,404" -> layar:', input.value, '| nilai:', tersimpan());
    expect(tersimpan()).not.toBe(720404);
    expect(tersimpan()).toBeLessThan(1000);
  });

  it('titik sebagai desimal tetap bekerja', () => {
    ketik('126.39');
    // eslint-disable-next-line no-console
    console.log('[volume] ketik "126.39" -> layar:', input.value, '| nilai:', tersimpan());
    expect(tersimpan()).toBeCloseTo(126.39, 2);
  });

  it('bilangan bulat besar yang MEMANG dimaksud tetap boleh', () => {
    // 67.095,22 kg besi pada 084-SPK-R501-H2 itu nyata dan sudah disetujui.
    ketik('67095.22');
    // eslint-disable-next-line no-console
    console.log('[volume] ketik "67095.22" -> layar:', input.value, '| nilai:', tersimpan());
    expect(tersimpan()).toBeCloseTo(67095.22, 2);
  });
});
