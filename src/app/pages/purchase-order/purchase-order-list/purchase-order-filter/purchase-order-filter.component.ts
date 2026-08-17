import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { DialogGeserDirective } from 'src/app/directives/dialog-geser.directive';

/**
 * Penyaring daftar purchase order.
 *
 * Dipisahkan menjadi dialog, bukan dijejer pada bilah atas: empat penyaring
 * berjajar membuat bilahnya penuh dan kotak pencarian — yang paling sering
 * dipakai — terdesak menjadi sempit.
 *
 * Nilainya dikembalikan lewat `afterClosed()`; komponen daftar yang
 * memutuskan kapan memuat ulang. Dialog ini tidak memanggil server sama
 * sekali.
 */
@Component({
  selector: 'app-purchase-order-filter',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    TranslateModule,
    DialogGeserDirective,
  ],
  templateUrl: './purchase-order-filter.component.html',
  styleUrl: './purchase-order-filter.component.scss',
})
export class PurchaseOrderFilterComponent {
  status = '';
  purchaseType: string[] = [];
  projectName = '';
  dateFrom: Date | null = null;
  dateTo: Date | null = null;

  /** Kode proyek yang benar-benar dipakai; diisi komponen daftar. */
  projects: string[] = [];

  /** Seluruh kode tipe PO. */
  readonly typeOptions = [
    'A', 'B', 'C', 'D', 'F', 'G', 'H',
    '511', '5112', '512', '516', '63', '641', '642', '651', '652',
  ];

  constructor(
    private dialog: MatDialogRef<PurchaseOrderFilterComponent>,
    @Inject(MAT_DIALOG_DATA) data: any,
  ) {
    this.projects = data?.projects ?? [];
    this.status = data?.status ?? '';
    this.purchaseType = data?.purchaseType ?? [];
    this.projectName = data?.projectName ?? '';
    this.dateFrom = data?.dateFrom ?? null;
    this.dateTo = data?.dateTo ?? null;
  }

  /**
   * Kosongkan seluruh penyaring TANPA menutup dialog.
   *
   * Yang menekannya biasanya hendak menyaring ulang dari awal, bukan keluar —
   * menutup dialog memaksanya membukanya kembali.
   */
  bersihkan(): void {
    this.status = '';
    this.purchaseType = [];
    this.projectName = '';
    this.dateFrom = null;
    this.dateTo = null;
  }

  terapkan(): void {
    this.dialog.close({
      status: this.status,
      purchaseType: this.purchaseType,
      projectName: this.projectName,
      dateFrom: this.dateFrom,
      dateTo: this.dateTo,
    });
  }

  batal(): void {
    this.dialog.close();
  }
}
