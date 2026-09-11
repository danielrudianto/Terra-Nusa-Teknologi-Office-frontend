import { DecimalPipe } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { provideMomentDateAdapter } from '@angular/material-moment-adapter';
import { provideNgxMask } from 'ngx-mask';
import { Observable, of, throwError } from 'rxjs';

import { ApiService } from 'src/app/services/api.service';
import { ExpenseCreateComponent } from './expense-create.component';

/*
 * Membuat beban + slip pembayarannya adalah DUA permintaan beruntun.
 *
 * Yang kedua dapat gagal setelah yang pertama berhasil — dan justru itu yang
 * terjadi: bebannya tersimpan, slipnya ditolak, dan layar menampilkan
 * "Terjadi kesalahan di server. Coba lagi beberapa saat lagi."
 *
 * Dua akibatnya, dan yang kedua jauh lebih mahal:
 *
 *   1. Pesannya menyebut kerusakan server, padahal bebannya tersimpan.
 *   2. Formulirnya dibiarkan terisi penuh — sehingga langkah paling wajar
 *      berikutnya, menekan simpan sekali lagi, memasukkan beban yang sama
 *      untuk KEDUA KALINYA.
 *
 * Yang diuji di sini perilakunya: apa yang muncul di layar, dan apa yang
 * tersisa di formulir.
 */

interface Panggilan {
  jalur: string;
  muatan: any;
}

describe('beban tersimpan tetapi slipnya gagal', () => {
  let komponen: ExpenseCreateComponent;
  let panggilan: Panggilan[];
  let pesan: string[];
  let durasi: number[];
  let gagalkanSlip: boolean;

  function siapkan(): void {
    panggilan = [];
    pesan = [];
    durasi = [];

    const api = {
      get: () => of({ data: [], count: 0 }),
      put: () => of({}),
      post: (jalur: string, muatan: any): Observable<any> => {
        panggilan.push({ jalur, muatan });
        if (jalur === 'outgoing-payments' && gagalkanSlip) {
          return throwError(() => ({
            status: 400,
            error: {
              detail: {
                code: 'PAYMENT_LOCKED',
                message: 'Dokumen ini sudah lunas.',
              },
            },
          }));
        }
        return of({ expense_id: 7, payment_id: 9 });
      },
    };

    TestBed.configureTestingModule({
      imports: [ExpenseCreateComponent, TranslateModule.forRoot()],
      providers: [
        provideNoopAnimations(),
        provideNgxMask(),
        // Aplikasinya memakai adapter Moment (app.module.ts); datepicker
        // menolak berjalan tanpa salah satu adapter terpasang.
        provideMomentDateAdapter(),
        DecimalPipe,
        { provide: ApiService, useValue: api },
        {
          provide: MatSnackBar,
          useValue: {
            open: (teks: string, _aksi: string, opsi: any) => {
              pesan.push(teks);
              durasi.push(opsi?.duration ?? 0);
            },
          },
        },
        {
          provide: MatDialog,
          useValue: { open: () => ({ afterClosed: () => of(null) }) },
        },
        { provide: Router, useValue: { navigate: () => {} } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => null } } },
        },
      ],
    });

    komponen = TestBed.createComponent(ExpenseCreateComponent).componentInstance;
  }

  /** Isi formulir secukupnya supaya `onSubmit` punya sesuatu untuk dikirim. */
  function isiFormulir(buatSlip: boolean): void {
    komponen.metaFormGroup.patchValue({
      invoiceName: 'INV-UJI',
      receiptName: 'KWT-UJI',
      date: new Date('2026-09-10'),
      dueDate: new Date('2026-09-10'),
      purchaseType: 'Jasa',
      description: 'Uji',
    });
    komponen.valueFormGroup.patchValue({
      dpp: 1000,
      ppn: 0,
      pbbkb: 0,
      pphCode: '',
      pphPercentage: 0,
    });
    komponen.paymentFormGroup.patchValue({
      bankName: 'Bank Uji',
      bankAccountName: 'Rekening Uji',
      bankAccountNumber: '000',
      paymentMethod: 'Transfer bank',
      paymentTotal: 1000,
      createPayment: buatSlip,
    });
  }

  beforeEach(() => {
    gagalkanSlip = false;
    siapkan();
  });

  it('tetap mengirim slipnya setelah bebannya tersimpan', () => {
    isiFormulir(true);
    komponen.onSubmit();

    expect(panggilan.map((p) => p.jalur)).toEqual([
      'expenses',
      'outgoing-payments',
    ]);
    expect(panggilan[1].muatan.expenseID).toBe(7);
  });

  describe('ketika slipnya ditolak', () => {
    beforeEach(() => {
      gagalkanSlip = true;
      isiFormulir(true);
      komponen.onSubmit();
    });

    it('menyebut bahwa bebannya TERSIMPAN', () => {
      expect(pesan.length).toBe(1);
      expect(pesan[0])
        .withContext(
          'pesan galat mentah membuat pemakai menyimpulkan bebannya gagal',
        )
        .toContain('bebanTersimpanSlipGagal');
    });

    it('menampilkan pesannya cukup lama untuk dibaca sampai habis', () => {
      expect(durasi[0])
        .withContext('pesan dua kalimat tidak terbaca dalam tiga detik')
        .toBeGreaterThanOrEqual(8000);
    });

    it('mengosongkan formulir supaya beban yang sama tidak masuk dua kali', () => {
      expect(komponen.metaFormGroup.controls['invoiceName'].value)
        .withContext(
          'formulir yang masih terisi di atas beban yang sudah tersimpan ' +
            'mengundang penekanan simpan kedua',
        )
        .toBeFalsy();
      expect(komponen.valueFormGroup.controls['dpp'].value).toBeFalsy();
    });

    it('mematikan tombol simpan sampai total dihitung ulang', () => {
      expect(komponen.isFinal).toBe(false);
    });

    it('melepas keadaan "sedang menyimpan"', () => {
      expect(komponen.isSubmitting).toBe(false);
    });

    it('tidak mengirim ulang bebannya', () => {
      expect(panggilan.filter((p) => p.jalur === 'expenses').length).toBe(1);
    });
  });

  describe('ketika pembuatan bebannya sendiri gagal', () => {
    /*
     * Cabang "sekalian buat slip" dulu TIDAK punya penangan galat sama
     * sekali: bila pembuatan bebannya yang gagal, tidak ada apa pun yang
     * muncul di layar — tombolnya kembali hidup, formulirnya tetap terisi,
     * dan tidak ada yang memberi tahu bahwa tidak terjadi apa-apa.
     */
    it('tetap memberi tahu pemakainya', () => {
      TestBed.resetTestingModule();
      panggilan = [];
      pesan = [];
      durasi = [];

      const api = {
        get: () => of({ data: [], count: 0 }),
        put: () => of({}),
        post: (jalur: string): Observable<any> => {
          panggilan.push({ jalur, muatan: null });
          return throwError(() => ({ status: 500 }));
        },
      };

      TestBed.configureTestingModule({
        imports: [ExpenseCreateComponent, TranslateModule.forRoot()],
        providers: [
          provideNoopAnimations(),
          provideNgxMask(),
        // Aplikasinya memakai adapter Moment (app.module.ts); datepicker
        // menolak berjalan tanpa salah satu adapter terpasang.
        provideMomentDateAdapter(),
          DecimalPipe,
          { provide: ApiService, useValue: api },
          {
            provide: MatSnackBar,
            useValue: {
              open: (teks: string, _a: string, o: any) => {
                pesan.push(teks);
                durasi.push(o?.duration ?? 0);
              },
            },
          },
          {
            provide: MatDialog,
            useValue: { open: () => ({ afterClosed: () => of(null) }) },
          },
          { provide: Router, useValue: { navigate: () => {} } },
          {
            provide: ActivatedRoute,
            useValue: { snapshot: { paramMap: { get: () => null } } },
          },
        ],
      });

      komponen =
        TestBed.createComponent(ExpenseCreateComponent).componentInstance;
      isiFormulir(true);
      komponen.onSubmit();

      expect(pesan.length)
        .withContext('kegagalan simpan tidak boleh berlalu tanpa suara')
        .toBe(1);
      expect(komponen.isSubmitting).toBe(false);
    });
  });

  describe('tanpa slip pembayaran', () => {
    it('hanya mengirim bebannya, lalu mengosongkan formulir', () => {
      isiFormulir(false);
      komponen.onSubmit();

      expect(panggilan.map((p) => p.jalur)).toEqual(['expenses']);
      expect(komponen.metaFormGroup.controls['invoiceName'].value).toBeFalsy();
      expect(komponen.isFinal).toBe(false);
    });
  });
});
