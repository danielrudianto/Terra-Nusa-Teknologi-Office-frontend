import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import { debounceTime } from 'rxjs';

import { DialogGeserDirective } from '../../directives/dialog-geser.directive';
import { ApiService } from '../../services/api.service';
import { vendorDisplayName } from '../../helpers/purchase-order-shared.helper';

/**
 * Pilih purchase order yang akan ditagih, lalu salin datanya ke pembelian.
 *
 * Dokumen pembelian mengulang hampir seluruh isi purchase order-nya: pemasok,
 * proyek, jenis biaya, DPP, dan tarif pajaknya. Mengetiknya ulang bukan hanya
 * lambat — angka yang diketik ulang dapat berbeda dari dokumen yang
 * ditandatangani, dan selisihnya baru ketahuan saat rekonsiliasi.
 *
 * Dokumen DRAF tetap ditawarkan. Tagihan kerap datang sebelum persetujuan
 * internal selesai, dan menyembunyikannya memaksa yang mencatat kembali
 * mengetik manual — persis keadaan yang hendak dihindari. Statusnya ditandai
 * pada tiap baris.
 */
@Component({
  selector: 'app-purchase-order-picker',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    DialogGeserDirective,
    TranslatePipe,
  ],
  templateUrl: './purchase-order-picker.component.html',
  styleUrls: ['./purchase-order-picker.component.scss'],
})
export class PurchaseOrderPickerComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly dialogRef = inject(
    MatDialogRef<PurchaseOrderPickerComponent>,
  );

  readonly searchBar = new FormControl('');

  daftar: any[] = [];
  jumlah = 0;
  page = 0;
  isLoading = false;

  ngOnInit(): void {
    this.cari(0);
    this.searchBar.valueChanges
      .pipe(debounceTime(400))
      .subscribe(() => this.cari(0));
  }

  cari(halaman: number): void {
    this.page = halaman;
    this.isLoading = true;
    this.apiService
      .get('purchase-orders/', {
        keyword: (this.searchBar.value || '').trim(),
        page: halaman + 1,
        pageSize: 10,
      })
      .subscribe({
        next: (res: any) => {
          this.daftar = res?.data ?? [];
          this.jumlah = res?.count ?? 0;
        },
        error: () => {
          this.daftar = [];
          this.jumlah = 0;
        },
      })
      .add(() => {
        this.isLoading = false;
      });
  }

  /** Nama pemasok beserta awalannya, seperti tercetak pada dokumen. */
  pemasok(po: any): string {
    // `vendorDisplayName` menangani awalan ganda ("PT. PT Adhimix"), titik
    // berlebih, dan prefiks non-entitas seperti "Pribadi".
    const hasil = vendorDisplayName(po?.supplier_name, po?.supplier_prefix);
    return hasil === '-' ? '—' : hasil;
  }

  sudahDisetujui(po: any): boolean {
    return (
      !!po?.isApproved || String(po?.status || '').toLowerCase() === 'approved'
    );
  }

  angka(v: unknown): number {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  }

  tutup(): void {
    this.dialogRef.close();
  }

  pilih(po: any): void {
    /*
     * Yang dikembalikan hanya bidang yang BENAR-BENAR dipakai pembelian.
     *
     * Mengembalikan seluruh dokumen membuat pemanggil tergoda menyalin
     * bidang lain yang artinya berbeda di sana — `date` purchase order
     * adalah tanggal terbit dokumennya, bukan tanggal faktur pemasok.
     */
    this.dialogRef.close({
      purchaseOrderName: po?.name ?? '',
      supplierID: po?.supplierID ?? null,
      supplierName: po?.supplier_name ?? '',
      projectName: po?.projectName ?? '',
      purchaseType: po?.purchaseType ?? '',
      dpp: this.angka(po?.dpp),
      ppn: this.angka(po?.ppn),
      pphCode: po?.pphCode ?? '',
      pphTaxObject: po?.pphTaxObject ?? '',
      pphPercentage: this.angka(po?.pphPercentage),
    });
  }
}
