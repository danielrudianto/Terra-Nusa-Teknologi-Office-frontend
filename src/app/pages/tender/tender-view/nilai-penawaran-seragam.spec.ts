import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { ApiService } from 'src/app/services/api.service';
import { TenderService } from 'src/app/services/tender.service';
import {
  DataRekap,
  PenawaranRekap,
  biayaSebenarnya,
  dibayarkan,
  hargaBaris,
  jumlahDitawar,
  nilaiPpn,
  subtotal,
  tidakLengkap,
} from 'src/app/helpers/tender-rekap.helper';
import { TenderViewComponent } from './tender-view.component';

/*
 * Layar perbandingan dan rekap cetak harus MENJAWAB SAMA.
 *
 * Ketujuh rumus ini pernah ada dua kali: sekali di `tender-rekap.helper`
 * untuk PDF dan Excel, sekali lagi disalin ke komponen ini untuk layarnya.
 * Salinan yang menua adalah pola kegagalan yang paling sering muncul di
 * basis kode ini — dan yang paling sulit terlihat, karena keduanya masih
 * menjawab angka yang MASUK AKAL.
 *
 * Salah satu selisihnya sudah nyata dan diperbaiki bersama uji ini: salinan
 * di komponen mengembalikan `Number(b.price)` untuk baris yang TERSIMPAN
 * tanpa harga, dan `Number(null)` adalah 0 — sehingga baris yang tidak
 * dijawab pemasok tampil sebagai Rp 0 dan ditandai hijau sebagai penawaran
 * termurah pada baris itu.
 *
 * Yang dijaga di sini bukan satu angka, melainkan tidak adanya salinan
 * kedua: setiap rumus dibandingkan langsung dengan penyebut bersamanya.
 */

const ITEMS = [
  { id: 1, name: 'Besi D16', quantity: 10, unit: 'btg' },
  { id: 2, name: 'Besi D19', quantity: 5, unit: 'btg' },
  { id: 3, name: 'Kawat bendrat', quantity: 2, unit: 'kg' },
  { id: 4, name: 'Mobilisasi', quantity: null, unit: null },
];

const QUOTES: PenawaranRekap[] = [
  {
    id: 1,
    supplierName: 'Sumber Rezeki',
    supplierPrefix: 'PT',
    includePpn: true,
    ppnPercentage: 11,
    otherCost: 250000,
    deliveryMethod: 'loco',
    items: [
      { tenderItemID: 1, price: 100000 },
      { tenderItemID: 2, price: 200000 },
      // Baris tersimpan TANPA harga: tidak ditawar, bukan digratiskan.
      { tenderItemID: 3, price: null },
      { tenderItemID: 4, price: 500000 },
    ],
  },
  {
    id: 2,
    supplierName: 'Maju Jaya',
    supplierPrefix: 'CV',
    includePpn: false,
    otherCost: null,
    deliveryMethod: 'franco',
    items: [
      { tenderItemID: 1, price: 105000 },
      { tenderItemID: 2, price: 195000 },
      { tenderItemID: 3, price: 25000 },
      { tenderItemID: 4, price: 400000 },
    ],
  },
];

const REKAP = { items: ITEMS, quotes: QUOTES } as unknown as DataRekap;

function komponen(): TenderViewComponent {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [TenderViewComponent, TranslateModule.forRoot()],
    providers: [
      provideNoopAnimations(),
      { provide: ApiService, useValue: { get: () => of({ data: [] }) } },
      { provide: TenderService, useValue: { ambil: () => of(null) } },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: { get: () => '9' } } },
      },
    ],
  });

  /*
   * Sengaja TANPA `detectChanges()`.
   *
   * Yang diuji perhitungannya, bukan tampilannya; menjalankan `ngOnInit`
   * hanya akan memuat data tiruan lalu menimpa yang dipasang di bawah ini.
   */
  const f = TestBed.createComponent(TenderViewComponent);
  const k = f.componentInstance;
  k.data = { tenderType: 'barang', items: ITEMS, quotes: QUOTES };
  return k;
}

describe('nilai penawaran tender: layar dan rekap cetak', () => {
  it('harga per baris sama, termasuk baris yang tidak ditawar', () => {
    const k = komponen();
    for (const q of QUOTES) {
      for (const it of ITEMS) {
        expect(k.harga(q, it.id))
          .withContext(`penawaran ${q.id} baris ${it.id}`)
          .toBe(hargaBaris(q, it.id));
      }
    }

    // Yang membuat uji ini ada: dulu 0, bukan null.
    expect(k.harga(QUOTES[0], 3)).toBeNull();
  });

  it('subtotal, PPN, dibayarkan, dan biaya sebenarnya sama', () => {
    const k = komponen();
    for (const q of QUOTES) {
      expect(k.total(q)).toBe(subtotal(REKAP, q));
      expect(k.nilaiPpn(q)).toBe(nilaiPpn(REKAP, q));
      expect(k.dibayarkan(q)).toBe(dibayarkan(REKAP, q));
      expect(k.biayaSebenarnya(q)).toBe(biayaSebenarnya(REKAP, q));
    }
  });

  it('kelengkapan penawaran dinilai sama', () => {
    const k = komponen();
    for (const q of QUOTES) {
      expect(k.jumlahDitawar(q)).toBe(jumlahDitawar(REKAP, q));
      expect(k.tidakLengkap(q)).toBe(tidakLengkap(REKAP, q));
    }

    // Penawaran pertama melewatkan satu baris; yang kedua lengkap.
    expect(k.tidakLengkap(QUOTES[0])).toBeTrue();
    expect(k.tidakLengkap(QUOTES[1])).toBeFalse();
  });

  it('baris yang tidak ditawar tidak ditandai termurah', () => {
    const k = komponen();
    /*
     * Inilah akibat yang terlihat pemakai.
     *
     * Dengan salinan lama, baris 3 pada penawaran pertama berharga 0 —
     * lebih murah daripada 25.000 milik pemasok kedua — sehingga kolom yang
     * TIDAK menawar justru ditandai sebagai yang termurah.
     */
    expect(k.isTermurah(QUOTES[0], 3)).toBeFalse();
    expect(k.isTermurah(QUOTES[1], 3))
      .withContext('hanya satu yang menawar baris ini; tidak ada pembanding')
      .toBeFalse();
  });
});
