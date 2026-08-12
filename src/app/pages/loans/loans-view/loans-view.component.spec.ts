import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';

import { LoansViewComponent } from './loans-view.component';
import { ApiService } from '../../../services/api.service';

/**
 * Pengujian perhitungan pelunasan pinjaman.
 *
 * Dua kekeliruan pernah terjadi di sini, dan keduanya tidak terlihat sebagai
 * galat:
 *
 *   1. nilai kosong ikut berhitung, sehingga seluruh halaman menampilkan
 *      "NaN%" — terbaca sebagai kerusakan, bukan sebagai data yang kurang;
 *   2. pembayaran yang belum disetujui ikut dihitung sebagai pelunasan,
 *      sehingga hutang tampak lebih kecil daripada kenyataannya. Yang kedua
 *      lebih berbahaya karena angkanya tetap tampak wajar.
 */
describe('LoansViewComponent', () => {
  let fixture: ComponentFixture<LoansViewComponent>;
  let c: LoansViewComponent;
  let api: jasmine.SpyObj<ApiService>;

  const siapkan = (loan: any, payments: any[]) => {
    api.get.and.returnValue(of({ loan, payments }));
    fixture = TestBed.createComponent(LoansViewComponent);
    c = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    api = jasmine.createSpyObj('ApiService', ['get']);
    await TestBed.configureTestingModule({
      imports: [LoansViewComponent],
      providers: [
        { provide: ApiService, useValue: api },
        { provide: MAT_DIALOG_DATA, useValue: { id: 1 } },
        { provide: MatDialogRef, useValue: { close: () => {} } },
        {
          provide: MatSnackBar,
          useValue: { open: () => ({ onAction: () => of(null) }) },
        },
      ],
    }).compileComponents();
  });

  it('hanya menghitung pembayaran yang sudah disetujui', () => {
    siapkan({ id: 1, debt: 10_000_000 }, [
      { amount: 3_000_000, isApprove: true },
      { amount: 2_000_000, isApprove: true },
      { amount: 1_500_000, isApprove: false },
    ]);

    expect(c.totalPaid).toBe(5_000_000);
    expect(c.remaining).toBe(5_000_000);
    expect(c.progress).toBe(50);
  });

  it('memisahkan yang menunggu persetujuan', () => {
    siapkan({ id: 1, debt: 10_000_000 }, [
      { amount: 3_000_000, isApprove: true },
      { amount: 1_500_000, isApprove: false },
      { amount: 500_000, isApprove: null },
    ]);

    expect(c.pendingPayments.length).toBe(2);
    expect(c.pendingAmount).toBe(2_000_000);
  });

  it('tidak menghasilkan NaN bila ada nominal kosong', () => {
    siapkan({ id: 1, debt: 10_000_000 }, [
      { amount: 3_000_000, isApprove: true },
      { amount: null, isApprove: true },
      { amount: 'abc', isApprove: true },
    ]);

    expect(c.totalPaid).toBe(3_000_000);
    expect(Number.isNaN(c.progress)).toBeFalse();
  });

  it('tidak menghasilkan NaN bila nilai hutang kosong', () => {
    siapkan({ id: 1, debt: null }, [{ amount: 1_000_000, isApprove: true }]);

    // Tanpa nilai hutang, persentase tidak punya arti — 0 lebih jujur
    // daripada hasil pembagian yang tidak sah.
    expect(c.progress).toBe(0);
  });

  it('tidak menghitung pembayaran yang sudah dihapus', () => {
    siapkan({ id: 1, debt: 10_000_000 }, [
      { amount: 3_000_000, isApprove: true },
      { amount: 9_000_000, isApprove: true, isDelete: true },
    ]);

    expect(c.totalPaid).toBe(3_000_000);
  });

  it('membatasi kemajuan pada 100 persen', () => {
    siapkan({ id: 1, debt: 1_000_000 }, [
      { amount: 5_000_000, isApprove: true },
    ]);

    expect(c.progress).toBe(100);
  });
});
