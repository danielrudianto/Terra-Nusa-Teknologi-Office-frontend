import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

import { DialogGeserDirective } from 'src/app/directives/dialog-geser.directive';

@Component({
  selector: 'app-terlewat-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    TranslateModule,
    DialogGeserDirective,
  ],
  templateUrl: './terlewat-dialog.component.html',
  styleUrl: './terlewat-dialog.component.scss',
})
export class TerlewatDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<TerlewatDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public input: any,
  ) {}

  get daftar(): any[] {
    return this.input?.daftar ?? [];
  }

  get total(): number {
    return this.daftar.reduce((a, p) => a + Number(p.amount || 0), 0);
  }

  /**
   * Berapa hari terlewat.
   *
   * Disebut karena urutan penanganannya bergantung pada itu: yang terlewat
   * tiga hari berbeda mendesaknya dari yang terlewat tiga pekan, dan tanggal
   * mentah menuntut yang membacanya menghitung sendiri.
   */
  hariTerlewat(p: any): number {
    const tgl = new Date(String(p.date).slice(0, 10));
    const kini = new Date();
    kini.setHours(0, 0, 0, 0);
    return Math.max(
      0,
      Math.round((kini.getTime() - tgl.getTime()) / 86400000),
    );
  }

  /**
   * Sebutan dokumen yang ditagih.
   *
   * Satu pembayaran dapat menunjuk pembelian, beban, reimbursement, slip
   * gaji, atau pinjaman — dan yang menelusurinya perlu tahu yang mana tanpa
   * membuka satu per satu.
   */
  /*
   * Bentuknya sudah DIRATAKAN server.
   *
   * Sebelumnya dialog ini menyusun keterangannya sendiri dari objek
   * bersarang — dan itu berarti dua tempat memutuskan hal yang sama, dengan
   * satu di antaranya pasti tertinggal. Server yang memutuskan sekarang.
   */
  dokumen(p: any): string {
    return p?.keterangan || '—';
  }

  lawan(p: any): string {
    return p?.lawan || '';
  }

  proyek(p: any): string {
    return p?.projectName || '';
  }

  tutup(): void {
    this.dialogRef.close();
  }
}
