/*
 * SPK TENAGA KERJA (jenis D): volume kontrak dan baris lembur.
 *
 * DUA cacat yang tidak menimbulkan galat, dan keduanya baru terlihat di
 * lapangan:
 *
 * 1. Formulir ini tidak punya kotak volume sama sekali; tiap baris upah
 *    dikirim dengan `quantity: 1` yang ditulis mati di kode — penambal supaya
 *    bentuk muatan lama tetap terpakai. Sejak SPK D dilayani Certificate of
 *    Payment, angka itu dibaca sebagai PLAFON: "Volume SPK 1 m'", dan setiap
 *    berita acara bervolume sebenarnya ditolak. SPK yang sah, sudah
 *    ditandatangani, berhenti dapat ditagih.
 *
 * 2. Lembur hanya klausul: `overtimeRate` tersimpan di `customData`, dan
 *    `customData` tidak pernah menjadi baris `purchase_order_items`. Lembur
 *    karena itu tidak muncul di daftar pagu CoP sama sekali — satu-satunya
 *    jalan menagihnya lewat pembuat faktur, DI LUAR CoP. Satu SPK ditagih
 *    lewat dua jalur yang tidak saling membaca.
 */

import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';

import { PurchaseOrderCreateDComponent } from './purchase-order-create-d.component';
import { ApiService } from 'src/app/services/api.service';
import { AdendumService } from 'src/app/services/adendum.service';

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

describe('SPK tenaga kerja: volume kontrak', () => {
  it('baris upah baru lahir TANPA plafon, bukan berplafon 1', () => {
    /*
     * Ini cacat aslinya. `1` di sini tidak terlihat sebagai penambal di
     * tempat lain — ia terbaca sebagai kesepakatan.
     */
    const c = komponen();
    const w = c.buildWage();

    expect(w.get('quantity').value)
      .withContext(
        'baris lahir berplafon — CoP akan menolak volume berapa pun',
      )
      .toBe(0);
  });

  it('nilai baris = volume x tarif bila volumenya diisi', () => {
    const c = komponen();
    expect(c.nilaiUpah({ quantity: 2000, amount: 35000 })).toBe(70000000);
  });

  it('nilai baris = TARIF saja bila volumenya dikosongkan', () => {
    /*
     * Kontrak harga satuan: nilai SPK-nya memang tarif itu sendiri.
     * Mengalikannya dengan nol akan membuat SELURUH SPK bernilai Rp 0 —
     * tercetak rapi, ditandatangani, dan tidak ada satu pun layar yang
     * menyebutnya janggal.
     */
    const c = komponen();
    expect(c.nilaiUpah({ quantity: 0, amount: 7500000 })).toBe(7500000);
  });
});

describe('SPK tenaga kerja: lembur sebagai baris tagihan', () => {
  it('tanpa tarif lembur, tidak ada baris lembur', () => {
    const c = komponen();
    c.formGroup.patchValue({ overtimeRate: 0 });

    expect(c.barisLembur()).toEqual([]);
  });

  it('tarif lembur melahirkan SATU baris item bertanda mesin', () => {
    /*
     * Penandanya `remarks_2`, bukan `remarks_3`.
     *
     * `remarks_3` berisi label yang dibaca orang, dan kelak ia dapat
     * diterjemahkan atau diketik sendiri. Penanda yang ikut berubah bahasa
     * berhenti menjadi penanda — dan yang terjadi bukan galat: baris
     * lemburnya sekadar muncul sebagai komponen upah tambahan setiap kali
     * dokumennya disunting, lalu tergandakan saat disimpan.
     */
    const c = komponen();
    c.ensureWorker();
    c.formGroup.patchValue({ overtimeRate: 50000, overtimeVolume: 200 });

    const baris = c.barisLembur();
    expect(baris.length).toBe(1);
    expect(baris[0].remarks_2).toBe('LEMBUR');
    expect(baris[0].price).toBe(50000);
    expect(baris[0].quantity).toBe(200);
  });

  it('baris lembur TIDAK membawa jadwal sendiri', () => {
    /*
     * Lembur dibayar mengikuti jadwal upah pokoknya. Mengarang jadwal di sini
     * memunculkan satu kalimat klausul tambahan yang tidak pernah disepakati
     * siapa pun — dan kalimat itu tercetak pada dokumen yang ditandatangani.
     */
    const c = komponen();
    c.ensureWorker();
    c.formGroup.patchValue({ overtimeRate: 50000 });

    expect(c.barisLembur()[0].schedule).toBeNull();
  });

  it('kotak volume lembur muncul hanya setelah tarifnya diisi', () => {
    const c = komponen();
    expect(c.tarifLembur()).toBe(0);

    c.formGroup.patchValue({ overtimeRate: 50000 });
    expect(c.tarifLembur()).toBe(50000);
  });

  it('dibuka kembali: baris lembur TIDAK menjadi komponen upah tambahan', () => {
    /*
     * Tanpa pemisahan, tiap kali dokumennya dibuka lalu disimpan, jumlah
     * barisnya bertambah satu dan nilai SPK naik bersamanya. Tidak ada galat
     * sama sekali.
     */
    const c = komponen();
    c.muatPekerjaan({
      items: [
        {
          task: 'Operator Drilling Rig',
          quantity: 2000,
          price: 35000,
          unit: "m'",
          remarks_2: '',
          remarks_3: 'Upah borongan',
        },
        {
          task: 'Operator Drilling Rig',
          quantity: 200,
          price: 50000,
          unit: 'jam',
          remarks_2: 'LEMBUR',
          remarks_3: 'Lembur',
        },
      ],
    });

    expect(c.wagesAt(0).length)
      .withContext('baris lembur ikut menjadi komponen upah — tergandakan')
      .toBe(1);
    expect(c.formGroup.get('overtimeVolume').value).toBe(200);
  });

  it('dokumen LAMA bervolume 1 dibaca sebagai tanpa plafon', () => {
    /*
     * Satu adalah angka penambal, bukan kesepakatan. Membacanya apa adanya
     * membuat dokumen lama yang dibuka untuk disunting tampak berplafon 1 —
     * dan menyimpannya kembali MENGUNCI penambal itu menjadi plafon
     * sungguhan.
     */
    const c = komponen();
    c.muatPekerjaan({
      items: [
        {
          task: 'Tukang cor',
          quantity: 1,
          price: 150000,
          unit: 'hari',
          remarks_3: 'Upah harian',
        },
      ],
    });

    expect(c.wagesAt(0).at(0).get('quantity').value).toBe(0);
  });
});
