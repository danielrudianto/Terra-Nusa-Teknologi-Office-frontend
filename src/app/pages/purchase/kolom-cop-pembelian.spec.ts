/*
 * DAFTAR PEMBELIAN — kolom CoP.
 *
 * "pembelian minta 1 kolom lagi dong kalau ada COP nya ada link buat view
 *  COP boleh ga?"
 *
 * Kaitannya sudah lama tersimpan di `purchases.certificateOfPaymentID`, dan
 * layar DETAIL sudah menampilkannya. Yang belum: daftarnya. Menelusuri
 * pembelian mana yang berasal dari CoP berarti membuka baris satu per satu.
 *
 * Empat hal yang dijaga di sini, dan tiga di antaranya gagal dengan DIAM:
 *
 *   1. Kolomnya benar-benar TERGAMBAR — diukur di DOM, bukan dibaca dari
 *      daftar `displayedColumns`. Kolom yang terdaftar tetapi `ng-container`
 *      -nya salah nama tidak melempar apa pun; selnya hanya kosong.
 *   2. Yang tidak punya CoP tidak menawarkan tautan apa pun.
 *   3. CoP yang sudah DIHAPUS tetap menyebut nomornya, tetapi bukan sebagai
 *      tautan — tautan yang selalu gagal lebih membingungkan daripada teks.
 *   4. Menekannya MENAHAN kliknya, supaya baris di belakangnya tidak ikut
 *      terpicu dan dialog pembelian tidak menutupi CoP yang barusan diminta.
 */

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { PurchaseListComponent } from './purchase-list/purchase-list.component';
import { CertificateOfPaymentViewComponent } from '../certificate-of-payment/certificate-of-payment-view/certificate-of-payment-view.component';
import { PurchaseViewComponent } from './purchase-view/purchase-view.component';
import { ApiService } from 'src/app/services/api.service';
import { PermissionService } from 'src/app/services/permission.service';
import { SettingsService } from 'src/app/services/setting.service';
import { SelaraskanLunasService } from 'src/app/services/selaraskan-lunas.service';

/** Dialog yang dibuka, berikut datanya. */
let dibuka: any[] = [];

function baris(tambahan: any): any {
  return {
    id: 1,
    date: '2026-09-02',
    invoiceName: 'INV-1',
    purchaseOrderName: '001-SPK-H203-H1',
    projectName: 'H203',
    supplier: { id: 108, name: 'Pemasok', prefix: 'PT' },
    dpp: 1000,
    ppn: 0,
    pbbkb: 0,
    otherValue: 0,
    lastStatus: 'ready',
    isPaid: false,
    isInternal: false,
    ...tambahan,
  };
}

async function pasang(rows: any[], bolehCop = true) {
  dibuka = [];
  TestBed.configureTestingModule({
    imports: [PurchaseListComponent, TranslateModule.forRoot()],
    providers: [
      provideNoopAnimations(),
      {
        provide: ApiService,
        useValue: {
          get: (jalur: string) =>
            jalur === 'purchases'
              ? of({ data: rows, count: rows.length })
              : of(null),
        },
      },
      {
        provide: PermissionService,
        useValue: {
          // `permissions` adalah SIGNAL, bukan metode: `CanDirective`
          // membacanya di dalam `effect` supaya menu ikut muncul begitu
          // petanya datang. Ganda yang hanya punya `can()` membuat seluruh
          // daftar melempar sebelum satu baris pun tergambar.
          permissions: signal({}),
          can: (modul: string) =>
            modul === 'certificate_of_payment' ? bolehCop : true,
          level: () => 5,
        },
      },
      { provide: SettingsService, useValue: { pageSize: 25 } },
      { provide: SelaraskanLunasService, useValue: { selaraskan: () => of(null) } },
      { provide: MatSnackBar, useValue: { open: () => {} } },
      {
        provide: MatDialog,
        useValue: {
          open: (komp: any, cfg: any) => {
            dibuka.push({ komp, cfg });
            return { afterClosed: () => of(undefined) };
          },
        },
      },
      { provide: Router, useValue: { navigate: () => {} } },
      {
        provide: ActivatedRoute,
        useValue: { queryParams: of({}), snapshot: { queryParams: {} } },
      },
    ],
  });

  const fixture = TestBed.createComponent(PurchaseListComponent);
  fixture.componentInstance.fetchData(0);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

afterEach(() => TestBed.resetTestingModule());

describe('daftar pembelian — kolom CoP', () => {
  it('kolomnya ada di susunan kolom, di sebelah nomor PO', async () => {
    const f = await pasang([baris({})]);
    const kolom = f.componentInstance.displayedColumns;

    expect(kolom).toContain('cop');
    expect(kolom.indexOf('cop')).toBe(kolom.indexOf('purchaseOrderName') + 1);
  });

  it('CoP yang ada TERGAMBAR sebagai tautan, dengan nomornya', async () => {
    const f = await pasang([
      baris({
        certificateOfPaymentID: 214,
        certificate_of_payment_name: '014/COP/H203/IX/2026',
      }),
    ]);

    const tautan = Array.from(
      f.nativeElement.querySelectorAll('button.pl-polink'),
    ).map((b: any) => (b.textContent || '').trim());

    expect(tautan).toContain('014/COP/H203/IX/2026');
  });

  it('menekannya membuka dialog CoP dengan id yang benar', async () => {
    const f = await pasang([
      baris({
        certificateOfPaymentID: 214,
        certificate_of_payment_name: '014/COP/H203/IX/2026',
      }),
    ]);

    const tombol = Array.from(
      f.nativeElement.querySelectorAll('button.pl-polink'),
    ).find((b: any) => (b.textContent || '').includes('COP')) as any;
    expect(tombol).withContext('tautan CoP tidak ditemukan').toBeTruthy();
    tombol.click();

    const cop = dibuka.find((d) => d.komp === CertificateOfPaymentViewComponent);
    expect(cop).withContext('dialog CoP tidak terbuka').toBeTruthy();
    expect(cop.cfg.data).toEqual({ id: 214 });
  });

  it('menahan kliknya — baris di belakangnya TIDAK ikut terpicu', async () => {
    const f = await pasang([
      baris({
        certificateOfPaymentID: 214,
        certificate_of_payment_name: '014/COP/H203/IX/2026',
      }),
    ]);

    const tombol = Array.from(
      f.nativeElement.querySelectorAll('button.pl-polink'),
    ).find((b: any) => (b.textContent || '').includes('COP')) as any;
    tombol.click();
    await f.whenStable();

    expect(
      dibuka.some((d) => d.komp === PurchaseViewComponent),
    ).withContext('dialog pembelian ikut terbuka').toBeFalse();
  });

  it('tanpa CoP: tidak ada tautan, hanya tanda pisah', async () => {
    const f = await pasang([baris({})]);

    const tautan = Array.from(
      f.nativeElement.querySelectorAll('button.pl-polink'),
    ).map((b: any) => (b.textContent || '').trim());

    expect(tautan.some((t: string) => t.includes('COP'))).toBeFalse();
  });

  it('CoP terhapus: nomornya tetap terbaca, tetapi bukan tautan', async () => {
    const f = await pasang([
      baris({
        certificateOfPaymentID: 214,
        certificate_of_payment_name: '014/COP/H203/IX/2026',
        certificate_of_payment_deleted: true,
      }),
    ]);

    const teks = (f.nativeElement.textContent || '') as string;
    expect(teks).toContain('014/COP/H203/IX/2026');

    const tombol = Array.from(
      f.nativeElement.querySelectorAll('button.pl-polink'),
    ).filter((b: any) => (b.textContent || '').includes('COP'));
    expect(tombol.length).withContext('yang terhapus masih dapat ditekan').toBe(0);
  });

  it('tanpa izin baca CoP: nomornya terbaca, tautannya tidak', async () => {
    const f = await pasang(
      [
        baris({
          certificateOfPaymentID: 214,
          certificate_of_payment_name: '014/COP/H203/IX/2026',
        }),
      ],
      false,
    );

    expect((f.nativeElement.textContent || '').includes('014/COP/H203/IX/2026'))
      .withContext('nomornya ikut disembunyikan')
      .toBeTrue();
    const tombol = Array.from(
      f.nativeElement.querySelectorAll('button.pl-polink'),
    ).filter((b: any) => (b.textContent || '').includes('COP'));
    expect(tombol.length).toBe(0);
  });

  it('nomor CoP kosong jatuh ke #id, bukan sel kosong', async () => {
    // Sambungan namanya dapat kosong pada data lama. Sel kosong membuat
    // pembelian terlihat seperti tidak punya CoP sama sekali.
    const f = await pasang([baris({ certificateOfPaymentID: 214 })]);

    expect((f.nativeElement.textContent || '').includes('#214')).toBeTrue();
  });
});
