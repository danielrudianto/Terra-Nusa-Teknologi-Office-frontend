import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';

import { DialogGeserDirective } from '../../directives/dialog-geser.directive';
import { ApiService } from '../../services/api.service';
import { vendorDisplayName } from '../../helpers/purchase-order-shared.helper';

/**
 * Isi purchase order yang sedang dirujuk sebuah pembelian.
 *
 * Yang mencatat tagihan memegang faktur dari pemasok dan perlu memastikan
 * angkanya sama dengan dokumen yang ditandatangani. Tanpa layar ini, satu-
 * satunya jalan adalah membuka daftar purchase order di tab lain, mencari
 * nomornya, lalu bolak-balik membandingkan — dan yang bolak-balik begitu
 * cenderung berhenti membandingkan setelah dua atau tiga angka.
 *
 * Dimuat ULANG dari server, bukan memakai nilai yang sudah tersalin ke
 * formulir. Justru selisih antara keduanya yang hendak terlihat: bila
 * angkanya sudah diubah tangan di formulir, ringkasan ini tetap menunjukkan
 * isi dokumen aslinya.
 */
@Component({
  selector: 'app-purchase-order-ringkas',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    DialogGeserDirective,
    TranslatePipe,
  ],
  templateUrl: './purchase-order-ringkas.component.html',
  styleUrls: ['./purchase-order-ringkas.component.scss'],
})
export class PurchaseOrderRingkasComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly dialogRef = inject(
    MatDialogRef<PurchaseOrderRingkasComponent>,
  );

  po: any = null;
  isLoading = true;
  gagal = false;

  constructor(@Inject(MAT_DIALOG_DATA) public data: { id: number }) {}

  ngOnInit(): void {
    this.apiService.get(`purchase-orders/${this.data?.id}`, {}).subscribe({
      next: (r: any) => {
        this.po = r ?? null;
        this.gagal = !this.po;
        this.isLoading = false;
      },
      error: () => {
        this.gagal = true;
        this.isLoading = false;
      },
    });
  }

  /** Nama pemasok beserta awalannya, seperti tercetak pada dokumen. */
  get pemasok(): string {
    const hasil = vendorDisplayName(
      this.po?.supplierName,
      this.po?.supplierPrefix,
    );
    return hasil === '-' ? '—' : hasil;
  }

  angka(v: unknown): number {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  }

  get nilaiPpn(): number {
    return (this.angka(this.po?.dpp) * this.angka(this.po?.ppn)) / 100;
  }

  /**
   * Nilai dokumen: DPP ditambah PPN.
   *
   * PPh sengaja TIDAK dikurangkan di sini. Yang tertera pada purchase order
   * adalah nilai pekerjaannya; potongan PPh baru terjadi saat pembayaran, dan
   * mencampur keduanya membuat angka di layar ini tidak dapat dibandingkan
   * dengan angka yang tercetak pada dokumennya.
   */
  get nilaiDokumen(): number {
    return this.angka(this.po?.dpp) + this.nilaiPpn;
  }

  get keadaan(): 'disetujui' | 'diperiksa' | 'draf' {
    if (this.po?.isApproved) return 'disetujui';
    if (this.po?.isChecked) return 'diperiksa';
    return 'draf';
  }

  tutup(): void {
    this.dialogRef.close();
  }
}
