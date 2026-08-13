import { CommonModule } from '@angular/common';
import { Component, Inject, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

import { AuditTrailComponent } from 'src/app/components/audit-trail/audit-trail.component';
import { CanDirective } from 'src/app/directives/can.directive';

/**
 * Rincian satu kontrak atau adendum.
 *
 * Dibuat sebagai dialog, bukan baris yang melebar: satu proyek dapat memuat
 * banyak dokumen, dan menampilkan seluruh rinciannya sekaligus membuat
 * daftarnya tidak lagi dapat dibaca sekilas.
 *
 * Tombol hapus diletakkan di sini, bukan pada barisnya. Pada daftar, tombol
 * hapus berjejer sedekat itu dengan baris lain — dan yang salah tekan baru
 * menyadarinya setelah dokumennya hilang.
 */
@Component({
  selector: 'app-contract-view',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    MatDialogModule,
    MatIconModule,
    MatButtonModule,
    AuditTrailComponent,
    CanDirective,
  ],
  templateUrl: './contract-view.component.html',
  styleUrl: './contract-view.component.scss',
})
export class ContractViewComponent {
  constructor(
    private dialogRef: MatDialogRef<ContractViewComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { contract: any; projectName?: string },
  ) {}

  get k(): any {
    return this.data?.contract ?? {};
  }

  get isAdendum(): boolean {
    return this.k.documentType === 'adendum';
  }

  /** DPP ditambah PPN-nya. */
  get nilai(): number {
    const dpp = Number(this.k.dpp ?? 0);
    const ppn = Number(this.k.ppn ?? 0);
    return dpp + (dpp * ppn) / 100;
  }

  get nilaiPpn(): number {
    return (Number(this.k.dpp ?? 0) * Number(this.k.ppn ?? 0)) / 100;
  }

  /**
   * Nilai PPh yang dipotong.
   *
   * Ditampilkan terpisah karena tidak mengurangi nilai kontrak — yang
   * berkurang adalah jumlah yang dibayarkan, bukan yang diperjanjikan.
   */
  get nilaiPph(): number {
    return (
      (Number(this.k.dpp ?? 0) * Number(this.k.pphPercentage ?? 0)) / 100
    );
  }

  hapus(): void {
    this.dialogRef.close({ hapus: true, contract: this.k });
  }

  tutup(): void {
    this.dialogRef.close();
  }
}
