import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { ApiService } from 'src/app/services/api.service';
import {
  PoRingkas,
  PurchaseOrderAutocompleteComponent,
} from './purchase-order-autocomplete.component';

/*
 * Nilai tiap pilihan di sini DOKUMENNYA, bukan nomornya — pemanggil perlu
 * proyek dan pemasoknya ikut terbawa, bukan cuma teks.
 *
 * Konsekuensinya satu, dan sempat terlewat: tanpa `displayWith`,
 * MatAutocomplete menuliskan nilai itu apa adanya ke dalam kotak, dan yang
 * muncul adalah `[object Object]`. Menyetel `teks` di penangan pilihannya
 * tidak menolong — MatAutocomplete menulis langsung ke elemen input-nya
 * sendiri, SESUDAH itu, dan tulisannya yang menang.
 *
 * Karena itu uji di bawah membaca `input.value` yang benar-benar dirender,
 * bukan properti komponennya.
 */

const PO = {
  id: 7,
  name: '111-SPK-R501-B',
  projectName: 'R501',
  supplierName: 'PT. Angkut Teknologi Indonesia',
};

describe('PurchaseOrderAutocomplete', () => {
  function buat() {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [
        PurchaseOrderAutocompleteComponent,
        TranslateModule.forRoot(),
      ],
      providers: [
        provideNoopAnimations(),
        {
          provide: ApiService,
          useValue: { get: () => of({ data: [PO], count: 1 }) },
        },
      ],
    });
    const f = TestBed.createComponent(PurchaseOrderAutocompleteComponent);
    f.detectChanges();
    return f;
  }

  function kotak(f: any): HTMLInputElement {
    return f.nativeElement.querySelector('input') as HTMLInputElement;
  }

  describe('apa yang tertulis di kotaknya', () => {
    it('menulis NOMOR PO, bukan [object Object]', () => {
      const f = buat();
      const po = { ...PO, asal: 'daftar' } as PoRingkas;

      // Jalur yang sama dengan yang dipakai MatAutocomplete saat menulis
      // kembali nilainya ke dalam kotak.
      expect(f.componentInstance.tampilkan(po))
        .withContext('kotaknya menampilkan [object Object] setelah dipilih')
        .toBe('111-SPK-R501-B');
    });

    it('meneruskan teks apa adanya', () => {
      /*
       * Nomor awal dokumennya masuk sebagai TEKS, bukan objek — dan
       * `displayWith` ikut dipanggil atasnya saat kotaknya pertama digambar.
       */
      const f = buat();
      expect(f.componentInstance.tampilkan('111-SPK-R501-B')).toBe(
        '111-SPK-R501-B',
      );
    });

    it('mengosongkan kotak untuk nilai kosong', () => {
      const f = buat();
      expect(f.componentInstance.tampilkan(null)).toBe('');
      expect(f.componentInstance.tampilkan('')).toBe('');
    });

    it('tidak jatuh pada dokumen tanpa nomor', () => {
      const f = buat();
      const rusak = { id: 1, projectName: '', supplierName: '' } as any;
      expect(f.componentInstance.tampilkan(rusak)).toBe('');
    });
  });

  describe('terpasang pada autocomplete-nya', () => {
    it('displayWith benar-benar dipakai templatnya', () => {
      /*
       * Fungsinya boleh benar, tetapi kalau tidak terikat ke
       * `mat-autocomplete`, kotaknya tetap menampilkan `[object Object]`.
       */
      const f = buat();
      const auto = f.debugElement.query(
        (n: any) => n.name === 'mat-autocomplete',
      );
      expect(auto).withContext('mat-autocomplete tidak ditemukan').toBeTruthy();
      expect(auto.componentInstance.displayWith)
        .withContext('displayWith tidak terpasang pada mat-autocomplete')
        .toBe(f.componentInstance.tampilkan);
    });

    it('dipanggil tanpa pemiliknya pun tetap benar', () => {
      /*
       * MatAutocomplete menyimpan fungsinya lalu memanggilnya lepas dari
       * komponennya. Sebuah metode biasa kehilangan `this` di sana; karena
       * itu ia ditulis sebagai properti berisi panah.
       */
      const f = buat();
      const lepas = f.componentInstance.tampilkan;
      expect(lepas({ ...PO, asal: 'daftar' } as PoRingkas)).toBe(
        '111-SPK-R501-B',
      );
    });
  });

  describe('isinya tetap bekerja', () => {
    it('memilih satu dokumen mengeluarkan dokumennya, bukan teksnya', () => {
      const f = buat();
      let keluar: PoRingkas | null | undefined;
      f.componentInstance.dipilih.subscribe(
        (v: PoRingkas | null) => (keluar = v),
      );

      f.componentInstance.pilih({ ...PO, asal: 'daftar' } as PoRingkas);

      expect(keluar?.name).toBe('111-SPK-R501-B');
      expect(keluar?.projectName)
        .withContext('proyeknya harus ikut; pembelian menyimpannya sendiri')
        .toBe('R501');
    });

    it('kotaknya ikut menampilkan nomornya setelah dipilih', fakeAsync(() => {
      /*
       * `tick()` diperlukan: `[ngModel]` satu arah menuliskan nilainya ke
       * elemen lewat microtask, bukan langsung pada `detectChanges`.
       */
      const f = buat();
      f.componentInstance.pilih({ ...PO, asal: 'daftar' } as PoRingkas);
      f.detectChanges();
      tick();
      f.detectChanges();

      expect(kotak(f).value).toBe('111-SPK-R501-B');
    }));

    it('ketikan yang belum cocok mengeluarkan null', fakeAsync(() => {
      const f = buat();
      let keluar: PoRingkas | null | undefined = undefined;
      f.componentInstance.dipilih.subscribe(
        (v: PoRingkas | null) => (keluar = v),
      );

      f.componentInstance.nomorAwal = '111-SPK-R501-B';
      f.componentInstance.onKetik('111-SPK');
      tick(300);

      expect(keluar).toBeNull();
    }));

    it('kembali ke nomor semula bukan keadaan "belum sah"', fakeAsync(() => {
      /*
       * Menghapus satu huruf lalu mengetiknya lagi tidak boleh mengunci
       * formulirnya pada nomor yang sebenarnya tidak diubah sama sekali.
       */
      const f = buat();
      let keluar: PoRingkas | null | undefined = undefined;
      f.componentInstance.dipilih.subscribe(
        (v: PoRingkas | null) => (keluar = v),
      );

      f.componentInstance.nomorAwal = '111-SPK-R501-B';
      f.componentInstance.onKetik('111-SPK-R501-B');
      tick(300);

      expect(keluar).toBeTruthy();
      expect(keluar!.asal).toBe('semula');
    }));
  });
});
