import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

import { ApiService } from 'src/app/services/api.service';
import { DataRekap } from 'src/app/helpers/tender-rekap.helper';
import { TenderQuoteViewComponent } from './tender-quote-view.component';

/*
 * Dialog lihat penawaran.
 *
 * Yang dijaga di sini BUKAN tata letaknya, melainkan dua hal yang diam-diam
 * salah bila rumusnya disalin ulang ke komponen ini:
 *
 *   * angkanya harus sama persis dengan penyebut bersama yang juga dipakai
 *     layar perbandingan, PDF, dan Excel — dialog yang menghitung sendiri
 *     akan berselisih dengan lembar Excel-nya tanpa ada yang menyadarinya;
 *
 *   * baris yang TIDAK ditawar harus terbaca sebagai tidak ditawar, bukan
 *     sebagai Rp 0. Perbedaannya menentukan: yang tidak menawar tidak boleh
 *     dihitung sebagai penawaran termurah.
 */

const REKAP: DataRekap = {
  nomor: 12,
  nama: 'Besi beton pile cap',
  proyek: 'R501',
  jenis: 'barang',
  tanggal: '2026-09-01',
  items: [
    { id: 1, name: 'Besi D16', quantity: 10, unit: 'btg' },
    { id: 2, name: 'Besi D19', quantity: 5, unit: 'btg' },
    { id: 3, name: 'Kawat bendrat', quantity: 2, unit: 'kg' },
    // Baris tanpa volume: harganya ada, jumlahnya TIDAK dapat dihitung.
    { id: 4, name: 'Mobilisasi', quantity: null, unit: null },
  ],
  quotes: [],
};

const PENAWARAN = {
  id: 77,
  supplierName: 'Sumber Rezeki',
  supplierPrefix: 'PT',
  includePpn: true,
  ppnPercentage: 11,
  otherCost: 250000,
  otherCostNote: 'ongkos angkut',
  deliveryMethod: 'loco',
  paymentTerm: 'Tempo',
  creditTerm: 30,
  quotationNumber: '045/QT/IX/2026',
  /*
   * Keterangan BERKATEGORI, bukan lagi satu teks bebas.
   *
   * Jalan mundur untuk penawaran lama ada di SERVER (`_keterangan` di
   * `tender_repository`), bukan di layar — sehingga apa pun yang sampai ke
   * dialog ini sudah berbentuk `noteList`. Menaruh jalan mundur kedua di
   * frontend berarti dua tempat yang harus tetap sepakat tentang hal yang
   * sama.
   */
  noteList: [
    { category: 'teknis', content: 'Garansi mutu 1 tahun' },
    { category: 'pembayaran', content: 'Uang muka 30%' },
  ],
  quotedAt: '2026-09-03',
  items: [
    { tenderItemID: 1, price: 100000, notes: null },
    { tenderItemID: 2, price: 200000, notes: 'merek pengganti: KS' },
    // Tersimpan, tetapi TANPA harga — bukan sama dengan harga nol.
    { tenderItemID: 3, price: null, notes: null },
    { tenderItemID: 4, price: 500000, notes: null },
  ],
};

let diminta: string[] = [];

function apiTiruan() {
  return {
    get: (jalur: string): Observable<any> => {
      diminta.push(jalur);
      return of({ data: [] });
    },
  };
}

function susun() {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [TenderQuoteViewComponent, TranslateModule.forRoot()],
    providers: [
      provideNoopAnimations(),
      { provide: ApiService, useValue: apiTiruan() },
      { provide: MatDialogRef, useValue: { close: () => {} } },
      {
        provide: MAT_DIALOG_DATA,
        useValue: { rekap: REKAP, quote: PENAWARAN },
      },
    ],
  });

  const f = TestBed.createComponent(TenderQuoteViewComponent);
  f.detectChanges();
  return f;
}

describe('dialog lihat penawaran tender', () => {
  beforeEach(() => {
    diminta = [];
  });

  it('menghitung dengan penyebut yang sama seperti rekap cetak', () => {
    const k = susun().componentInstance;

    // 10 x 100.000 + 5 x 200.000 + 1 x 500.000(tanpa volume, tidak dihitung)
    expect(k.subtotal).toBe(2_000_000);
    expect(k.nilaiPpn).toBe(220_000);
    expect(k.dibayarkan).toBe(2_220_000);

    // PPN dikreditkan sehingga tidak menjadi beban; biaya lain seluruhnya
    // menjadi beban.
    expect(k.biayaSebenarnya).toBe(2_250_000);
  });

  it('baris tanpa harga tidak dibaca sebagai nol', () => {
    const k = susun().componentInstance;

    expect(k.harga(3))
      .withContext('harga kosong harus null, bukan 0 — yang tidak menawar')
      .toBeNull();
    expect(k.jumlahDitawar).toBe(3);
    expect(k.tidakLengkap).toBeTrue();
  });

  it('baris tanpa volume tidak dijumlahkan menjadi nol', () => {
    const k = susun().componentInstance;
    const mobilisasi = REKAP.items[3];

    // Harganya ada, tetapi tanpa volume tidak ada yang dapat dikalikan.
    // Nol akan terbaca seperti digratiskan.
    expect(k.jumlahBaris(mobilisasi)).toBeNull();
  });

  it('menandai Loco yang ongkosnya belum ditaksir hanya bila memang kosong', () => {
    const k = susun().componentInstance;
    expect(k.locoTanpaOngkos)
      .withContext('ongkosnya sudah diisi 250.000')
      .toBeFalse();
  });

  it('meminta riwayat penawaran ini, bukan riwayat tendernya', () => {
    susun();
    expect(diminta).toContain('audit-logs/tender_quotes/77');
    expect(diminta.some((j) => j.startsWith('audit-logs/tenders/')))
      .withContext('riwayat tender adalah dokumen yang berbeda')
      .toBeFalse();
  });

  it('menampilkan catatan per baris yang tidak muat di layar perbandingan', () => {
    const teks: string = susun().nativeElement.textContent;
    expect(teks).toContain('merek pengganti: KS');
  });

  it('menampilkan nomor penawaran pemasok', () => {
    // Dipakai menunjuk dokumen aslinya ketika keputusannya ditinjau kembali.
    expect(susun().nativeElement.textContent).toContain('045/QT/IX/2026');
  });

  it('mengelompokkan keterangan menurut kategorinya', () => {
    const k = susun().componentInstance;

    // Urutannya tetap: pembayaran lebih dulu, walaupun `teknis` yang
    // diisikan lebih awal pada data.
    expect(k.kategoriTerisi).toEqual(['pembayaran', 'teknis']);
    expect(k.keteranganPada('teknis')).toEqual(['Garansi mutu 1 tahun']);
    expect(k.keteranganPada('nonteknis')).toEqual([]);

    const teks: string = susun().nativeElement.textContent;
    expect(teks).toContain('Garansi mutu 1 tahun');
    expect(teks).toContain('Uang muka 30%');
  });
});
