import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { ProjectSelectorComponent } from '../../../components/project-selector/project-selector.component';
import {
  IRekapItem,
  IRekapPO,
  unduhRekapPurchaseOrder,
} from '../../../helpers/purchase-order-rekap-excel';
import { unduhRekapPurchaseOrderPdf } from '../../../helpers/purchase-order-rekap-pdf';
import { ApiService } from '../../../services/api.service';
import { ServerMessageService } from '../../../services/server-message.service';
import { DialogGeserDirective } from '../../../directives/dialog-geser.directive';

/**
 * Pilih proyek, lalu unduh rekap purchase order-nya sebagai Excel.
 *
 * Proyek dipilih lebih dulu, bukan mengikuti penyaring yang sedang aktif di
 * daftar: rekap adalah dokumen yang dikirim ke luar, dan menerbitkannya dari
 * keadaan layar yang kebetulan sedang tersaring menghasilkan berkas yang
 * isinya tidak sesuai judulnya.
 */
@Component({
  selector: 'app-purchase-order-rekap',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    ProjectSelectorComponent,
    TranslatePipe,
    DialogGeserDirective,
  ],
  templateUrl: './purchase-order-rekap.component.html',
  styleUrls: ['./purchase-order-rekap.component.scss'],
})
export class PurchaseOrderRekapComponent {
  private readonly dialogRef = inject(
    MatDialogRef<PurchaseOrderRekapComponent>,
  );
  private readonly apiService = inject(ApiService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly pesanServer = inject(ServerMessageService);

  /**
   * PUSAT sengaja tidak ditawarkan.
   *
   * Ia bukan proyek melainkan pusat biaya, sehingga rekap purchase order
   * proyek untuknya tidak bermakna.
   */
  readonly proyek = new FormControl<string | null>(null, Validators.required);

  /**
   * Bentuk berkas yang diunduh.
   *
   * Keduanya BUKAN salinan satu sama lain. Excel memuat rincian per barang
   * dan dapat disaring serta dijumlah; PDF memuat ikhtisar dan satu baris per
   * dokumen, karena ia dibaca dan dikirim — bukan diolah.
   */
  bentuk: 'excel' | 'pdf' = 'excel';

  sedangMenyusun = false;

  pilihBentuk(v: 'excel' | 'pdf'): void {
    this.bentuk = v;
  }

  tutup(): void {
    this.dialogRef.close();
  }

  unduh(): void {
    const kode = this.proyek.value;
    if (!kode || this.sedangMenyusun) return;

    this.sedangMenyusun = true;
    this.apiService.get('purchase-orders/rekap', { proyek: kode }).subscribe({
      next: async (res: any) => {
        const daftar: IRekapPO[] = res?.purchaseOrders || [];
        const items: IRekapItem[] = res?.items || [];

        if (!daftar.length) {
          this.sedangMenyusun = false;
          this.snackBar.open(
            this.translate.instant('poRekap.kosong'),
            'Close',
            { duration: 4000 },
          );
          return;
        }

        try {
          if (this.bentuk === 'pdf') {
            unduhRekapPurchaseOrderPdf(kode, daftar, items);
          } else {
            await unduhRekapPurchaseOrder(kode, daftar, items);
          }
          this.dialogRef.close(true);
        } catch (e) {
          // Penyusunan berkas berjalan di peramban; kegagalannya tidak
          // menghasilkan galat server, sehingga perlu disebut sendiri.
          console.error('Gagal menyusun rekap:', e);
          this.snackBar.open(
            this.translate.instant('poRekap.gagal'),
            'Close',
            { duration: 5000 },
          );
        } finally {
          this.sedangMenyusun = false;
        }
      },
      error: (err: any) => {
        this.sedangMenyusun = false;
        this.snackBar.open(this.pesanServer.terjemahkan(err), 'Close', {
          duration: 5000,
        });
      },
    });
  }
}
