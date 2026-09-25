/*
 * SPK TENAGA KERJA (D) — letak baris lembur.
 *
 * Dua hal, dan keduanya berangkat dari keluhan yang sama: "uang lembur di
 * atas upah harian".
 *
 *   1. URUTAN. Baris lembur dulu sengaja dikirim PALING DEPAN, dengan alasan
 *      supaya terbaca berpasangan dengan upah pokoknya. Di lapangan alasan
 *      itu tidak terbukti — yang terbaca justru susunan yang tidak cocok
 *      dengan formulirnya (tarif lembur diisi di Ketentuan Kerja, paling
 *      bawah) maupun dengan cara orang membacanya. Urutan `id` di basis data
 *      mengikuti urutan pengiriman, dan `URUT_BARIS` di server mengurutkan
 *      menurut `id` — jadi satu tempat ini menentukan susunan SPK tercetak
 *      DAN daftar volume berita acara.
 *
 *   2. TABEL CETAK. Tarif lembur sudah disebutkan pada Ketentuan Kerja
 *      beserta satuan dan syaratnya. Mencetaknya sekali lagi sebagai baris
 *      "Komponen Upah" membuat satu kesepakatan terbaca seperti dua. Ia
 *      tetap menjadi baris di basis data — itu yang memberinya tempat di
 *      daftar volume CoP, dan itulah alasan ia dibuat.
 */

import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';

import { PurchaseOrderCreateDComponent } from './purchase-order-create/purchase-order-create-d/purchase-order-create-d.component';
import { ApiService } from 'src/app/services/api.service';
import { AdendumService } from 'src/app/services/adendum.service';
import {
  barisCetakSpkD,
  barisLemburSpk,
  dataCetakSpkD,
} from 'src/app/helpers/invoice-tenaga.helper';

function komponen(): any {
  TestBed.configureTestingModule({
    providers: [
      FormBuilder,
      { provide: ApiService, useValue: { get: () => ({ subscribe: () => {} }) } },
      { provide: MatDialog, useValue: {} },
      { provide: Router, useValue: { navigate: () => {} } },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            paramMap: { get: () => null },
            queryParamMap: { get: () => null },
          },
        },
      },
      { provide: MatSnackBar, useValue: { open: () => {} } },
      { provide: TranslateService, useValue: { instant: (k: string) => k } },
    ],
  });
  return TestBed.runInInjectionContext(() => {
    const fb = TestBed.inject(FormBuilder);
    return new (PurchaseOrderCreateDComponent as any)(
      TestBed.inject(AdendumService),
      TestBed.inject(MatDialog),
      fb,
      TestBed.inject(ApiService),
      TestBed.inject(ActivatedRoute),
      TestBed.inject(Router),
      TestBed.inject(MatSnackBar),
    );
  });
}

afterEach(() => TestBed.resetTestingModule());

/** Formulir terisi: satu pekerjaan, dua komponen upah, plus tarif lembur. */
function terisi(): any {
  const c = komponen();
  c.ensureWorker();
  const w = c.worker;
  w.patchValue({ task: 'Operator boredpile' });
  const upah = w.get('wages');
  upah.at(0).patchValue({ label: 'Upah harian', amount: 350000, unit: 'hari', quantity: 0 });
  c.addWage(0);
  upah.at(1).patchValue({ label: 'Uang makan', amount: 30000, unit: 'hari', quantity: 0 });
  c.formGroup.patchValue({ overtimeRate: 50000, overtimeUnit: 'jam' });
  return c;
}

describe('SPK D — baris lembur PALING BAWAH', () => {
  it('lembur menyusul seluruh komponen upah, bukan mendahuluinya', () => {
    const items = terisi().formatData().items;
    expect(items.length).toBe(3);
    expect(items[0].remarks_3).toBe('Upah harian');
    expect(items[1].remarks_3).toBe('Uang makan');
    // Urutan `id` mengikuti urutan kirim; `id` menentukan susunan cetak.
    expect(items[2].remarks_2).toBe('LEMBUR');
  });

  it('tanpa tarif lembur, tidak ada baris tambahan sama sekali', () => {
    const c = terisi();
    c.formGroup.patchValue({ overtimeRate: 0 });
    const items = c.formatData().items;
    expect(items.length).toBe(2);
    expect(items.some((x: any) => x.remarks_2 === 'LEMBUR')).toBeFalse();
  });
});

describe('SPK D tercetak — lembur di luar tabel upah', () => {
  const ITEMS = [
    { remarks_3: 'Upah harian', task: 'Operator', price: 350000, unit: 'hari' },
    { remarks_3: 'Uang makan', task: 'Operator', price: 30000, unit: 'hari' },
    { remarks_3: 'Lembur', task: 'Operator', price: 50000, unit: 'jam', remarks_2: 'LEMBUR' },
  ];

  it('baris lembur tidak ikut tercetak; sisanya utuh dan urut', () => {
    const baris = barisCetakSpkD(ITEMS);
    expect(baris.length).toBe(2);
    expect(baris.map((b) => b.label)).toEqual(['Upah harian', 'Uang makan']);
    expect(baris[0].amount).toBe(350000);
    expect(baris[0].unit).toBe('hari');
  });

  it('penandanya dibaca tanpa peduli besar-kecil huruf atau spasi', () => {
    expect(barisLemburSpk({ remarks_2: ' lembur ' })).toBeTrue();
    expect(barisLemburSpk({ remarks_2: 'LEMBUR' })).toBeTrue();
    // `remarks_3` BUKAN penanda — ia label yang dibaca orang dan dapat
    // diterjemahkan. Penanda yang ikut berubah bahasa berhenti jadi penanda.
    expect(barisLemburSpk({ remarks_3: 'Lembur' })).toBeFalse();
    expect(barisLemburSpk({})).toBeFalse();
    expect(barisLemburSpk(null)).toBeFalse();
  });

  it('label kosong jatuh ke `task`, bukan menjadi baris tanpa nama', () => {
    expect(barisCetakSpkD([{ task: 'Operator', price: 1, unit: 'hari' }])[0].label).toBe(
      'Operator',
    );
  });

  it('daftar kosong atau tidak ada tidak melempar', () => {
    expect(barisCetakSpkD(null)).toEqual([]);
    expect(barisCetakSpkD([])).toEqual([]);
  });

  it('lampiran SPK di belakang invoice memakai penyaring yang SAMA', () => {
    // Dua jalur cetak, satu penyaring — yang tertinggal tidak menimbulkan
    // galat, hanya satu dokumen yang barisnya berbeda dari dokumen kembarnya.
    const d = dataCetakSpkD({ items: ITEMS, customData: {} });
    expect(d.items.length).toBe(2);
    expect(d.items.some((x: any) => x.label === 'Lembur')).toBeFalse();
  });
});
