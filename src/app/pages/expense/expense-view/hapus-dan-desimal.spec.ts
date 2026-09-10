import { TestBed } from '@angular/core/testing';
import { DatePipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { ApiService } from 'src/app/services/api.service';
import { ExpenseViewComponent } from './expense-view.component';

/**
 * Dua hal pada layar beban: pembulatan dan penghapusan.
 *
 * Beban kerap bersen. Tagihan listrik, air, dan potongan PPh menghasilkan
 * angka yang tidak bulat; dibulatkan ke rupiah, jumlah yang tampil tidak
 * cocok dengan bukti bayarnya, dan yang mencocokkan menyimpulkan datanya
 * salah — padahal yang salah hanya tampilannya.
 *
 * Penghapusan tidak dilakukan dari dialog ini: ia hanya mengembalikan
 * niatnya, karena yang memegang halaman dan penyaring daftar adalah
 * daftarnya, dan daftar itulah yang harus dimuat ulang sesudahnya.
 */
describe('ExpenseView — desimal dan niat hapus', () => {
  const beban = {
    expense: {
      id: 7,
      // 1.234.567,89 — sen-nya harus bertahan sampai layar.
      dpp: 1234567.89,
      ppn: 0,
      pbbkb: 0,
      pphPercentage: 0,
      date: '2026-09-01',
      createdAt: '2026-09-01',
      dueDate: '2026-09-30',
      invoiceName: 'INV-1',
      receiptName: '',
      taxInvoiceName: '',
      purchaseType: '5.1.7',
      description: 'Listrik',
      bankName: 'BCA',
      bankAccountName: 'PLN',
      bankAccountNumber: '123',
    },
    payments: [],
  };

  const tutup = { close: jasmine.createSpy('close') };

  function buat() {
    tutup.close.calls.reset();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ExpenseViewComponent, TranslateModule.forRoot()],
      providers: [
        DatePipe,
        { provide: ApiService, useValue: { get: () => of(beban) } },
        { provide: MAT_DIALOG_DATA, useValue: { id: 7 } },
        { provide: MatDialogRef, useValue: tutup },
        { provide: MatSnackBar, useValue: { open: () => {} } },
        { provide: Router, useValue: { navigate: () => {} } },
      ],
    });
    const f = TestBed.createComponent(ExpenseViewComponent);
    f.detectChanges();
    return f;
  }

  it('nilai uang tampil dengan dua angka di belakang koma', () => {
    const f = buat();
    const teks: string = f.nativeElement.textContent ?? '';

    // Pemisah ribuan dan desimalnya ikut locale, dan locale pada lingkungan
    // uji bukan id-ID. Yang dijaga di sini BANYAKNYA angka desimal, bukan
    // tanda bacanya.
    expect(teks).toMatch(/1[.,]234[.,]567[.,]89/);
  });

  it('sennya tidak dibulatkan menjadi rupiah bulat', () => {
    // Penjaga arah sebaliknya: bila suatu saat formatnya dikembalikan ke
    // "1.0-0", uji di atas gagal — tetapi uji ini yang menyebutkan sebabnya.
    const f = buat();
    const teks: string = f.nativeElement.textContent ?? '';

    expect(teks).not.toMatch(/1[.,]234[.,]568(?![\d.,])/);
  });

  it('hapus() hanya mengembalikan niatnya, tidak memanggil server', () => {
    const f = buat();
    f.componentInstance.hapus();

    expect(tutup.close).toHaveBeenCalledWith('delete');
  });
});
