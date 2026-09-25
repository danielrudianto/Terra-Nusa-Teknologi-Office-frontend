/*
 * PEMBELIAN DARI CoP — nomor invoice, nomor kuitansi, dan tanggalnya.
 *
 * Sebelumnya nomor invoice hanya sampai ke formulir ini lewat `?invoice=`,
 * yaitu bila pembeliannya dibuat LEWAT tombol "Cetak invoice" di CoP.
 * Memilih CoP dari dalam formulir meninggalkan kotaknya kosong — dan yang
 * terlihat oleh pemakainya adalah "kadang keisi, kadang tidak".
 *
 * Yang dijaga di sini:
 *
 *   1. Nomornya disusun oleh SATU penyusun yang sama dengan layar cetak
 *      (`nomorInvoiceCop`), termasuk akhiran " (B)" untuk insentif bor.
 *      Nomor di pembukuan dan nomor di kertas pemasok tidak boleh berbeda.
 *   2. Kuitansi memakai nomor yang SAMA dengan invoice-nya.
 *   3. Tanggal pembelian = tanggal CoP, dibaca sebagai tanggal setempat.
 *   4. Hanya SPK tenaga kerja — bentuk nomor ini tidak berlaku bagi SPK
 *      barang.
 *   5. Gagal memuat meninggalkan kotaknya KOSONG, bukan nomor setengah jadi.
 */

import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { provideMomentDateAdapter } from '@angular/material-moment-adapter';
import { of, throwError } from 'rxjs';

import { PurchaseCreateComponent } from './purchase-create/purchase-create.component';
import { ApiService } from 'src/app/services/api.service';
import { CertificateOfPaymentService } from 'src/app/services/certificate-of-payment.service';
import { nomorInvoiceCop } from 'src/app/helpers/invoice-tenaga.helper';

const COP: any = {
  id: 7,
  date: '2026-08-28',
  periodEnd: '2026-08-26',
  projectName: 'R501',
  purchaseOrderID: 92,
  purchaseOrderName: '092-SPK-R501-D',
  supplierID: 967,
  netAmount: 360000,
  ppn: 0,
  pphCode: null,
  pphTaxObject: null,
  pphPercentage: 0,
};

const RINCI = {
  items: [{ purchaseOrderItemID: 5, quantity: 12, price: 30000, unit: 'hari' }],
  adjustments: [],
};

const PO = { items: [{ id: 5, remarks_3: 'Upah operator', task: 'Operator', unit: 'hari' }] };

describe('nomorInvoiceCop — penyusun nomornya', () => {
  it('bentuknya: tgl cut-off, id pemasok 3 digit, INV, proyek, bulan Romawi, tahun', () => {
    expect(
      nomorInvoiceCop({
        cop: { ...COP, ...RINCI },
        poItems: PO.items,
        supplierID: 967,
        tanggal: '2026-08-28',
      }),
    ).toBe('26-967-INV-R501-VIII-2026');
  });

  it('CUT-OFF dari akhir periode, BUKAN dari tanggal CoP', () => {
    // 26 (periodEnd) — bukan 28 (date). Keduanya Agustus, jadi hanya angka
    // di depan yang membedakannya; tertukar tanpa uji ini.
    const n = nomorInvoiceCop({
      cop: { ...COP, ...RINCI },
      poItems: PO.items,
      supplierID: 967,
      tanggal: '2026-08-28',
    });
    expect(n.startsWith('26-')).toBeTrue();
  });

  it('CoP tanpa periode memakai tanggalnya sendiri sebagai cut-off', () => {
    const n = nomorInvoiceCop({
      cop: { ...COP, ...RINCI, periodEnd: null },
      poItems: PO.items,
      supplierID: 967,
      tanggal: '2026-08-28',
    });
    expect(n.startsWith('28-')).toBeTrue();
  });

  it('baris insentif bor menambahkan akhiran " (B)"', () => {
    expect(
      nomorInvoiceCop({
        cop: {
          ...COP,
          items: [{ purchaseOrderItemID: 9, quantity: 3, price: 50000 }],
          adjustments: [],
        },
        poItems: [{ id: 9, remarks_3: 'Insentif bor', task: 'Bor', unit: 'titik' }],
        supplierID: 967,
        tanggal: '2026-08-28',
      }),
    ).toBe('26-967-INV-R501-VIII-2026 (B)');
  });

  it('keterangan kurang -> nomor KOSONG, bukan nomor setengah jadi', () => {
    expect(
      nomorInvoiceCop({ cop: { ...COP, ...RINCI }, supplierID: null, tanggal: '2026-08-28' }),
    ).toBe('');
    expect(
      nomorInvoiceCop({
        cop: { ...COP, ...RINCI, projectName: '' },
        supplierID: 967,
        tanggal: '2026-08-28',
      }),
    ).toBe('');
  });
});

describe('Formulir pembelian — diisi dari CoP', () => {
  function buat(opsi: { rinci?: any; po?: any; gagal?: boolean } = {}) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        provideNoopAnimations(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideMomentDateAdapter(),
        {
          provide: ApiService,
          useValue: {
            get: (jalur: string) => {
              if (opsi.gagal && jalur.startsWith('purchase-orders/')) {
                return throwError(() => new Error('putus'));
              }
              if (jalur.startsWith('purchase-orders/')) return of(opsi.po ?? PO);
              return of({});
            },
          },
        },
        {
          provide: CertificateOfPaymentService,
          useValue: {
            detail: () =>
              opsi.gagal
                ? throwError(() => new Error('putus'))
                : of(opsi.rinci ?? RINCI),
            siapTagih: () => of([]),
          },
        },
      ],
    });
    return TestBed.createComponent(PurchaseCreateComponent).componentInstance as any;
  }

  it('nomor invoice DAN kuitansi terisi, keduanya sama', async () => {
    const c = buat();
    await c.isiNomorDariCop(COP);
    const m = c.metaFormGroup.value;
    expect(m.invoiceName).toBe('26-967-INV-R501-VIII-2026');
    expect(m.receiptName).toBe(m.invoiceName);
  });

  it('tanggal pembelian = tanggal CoP, tanpa mundur sehari', () => {
    const c = buat();
    c.terapkanCop(COP);
    const t: Date = c.metaFormGroup.controls['date'].value;
    expect(t instanceof Date).toBeTrue();
    // 28 Agustus — lewat `new Date('2026-08-28')` ini terbaca UTC dan
    // menjadi 27 Agustus bagi WIB.
    expect(t.getDate()).toBe(28);
    expect(t.getMonth()).toBe(7);
    expect(t.getFullYear()).toBe(2026);
  });

  it('SPK BARANG tidak diberi nomor — bentuk ini hanya untuk tenaga kerja', async () => {
    const c = buat();
    await c.isiNomorDariCop({ ...COP, purchaseOrderName: '092-SPK-R501-B' });
    expect(c.metaFormGroup.value.invoiceName).toBe('');
    expect(c.metaFormGroup.value.receiptName).toBe('');
  });

  it('nomor dari tombol "Cetak invoice" MENANG atas susunan ulang', async () => {
    const c = buat();
    c.nomorDariCetak = '26-967-INV-R501-VIII-2026 (B)';
    await c.isiNomorDariCop(COP);
    // Yang sudah tercetak dipegang pemasok; menyusun ulang tidak boleh
    // menerbitkan nomor kedua atas dokumen yang sama.
    expect(c.metaFormGroup.value.invoiceName).toBe('26-967-INV-R501-VIII-2026 (B)');
    expect(c.metaFormGroup.value.receiptName).toBe('26-967-INV-R501-VIII-2026 (B)');
  });

  it('gagal memuat meninggalkan kotaknya KOSONG, dan tidak melempar', async () => {
    const c = buat({ gagal: true });
    await expectAsync(c.isiNomorDariCop(COP)).toBeResolved();
    expect(c.metaFormGroup.value.invoiceName).toBe('');
  });
});
