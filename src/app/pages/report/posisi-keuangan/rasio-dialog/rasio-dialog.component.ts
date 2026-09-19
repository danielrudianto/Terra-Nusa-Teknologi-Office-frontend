import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { uangDokumen } from 'src/app/helpers/uang.helper';

/** Yang dibutuhkan dialog ini; disusun pemanggilnya. */
export interface DataRasioDialog {
  kode: string;
  teks: string;
  posisi: string | null;
  baik: boolean | null;
  pitaTeks: string;
  acuan?: string | null;
  /** Kunci terjemahan arti & risiko, sudah diselesaikan pemanggilnya. */
  arti: string;
  /** Pembilang, penyebut, pengali — boleh kosong. */
  hitungan: any | null;
}

/**
 * Rincian satu rasio: artinya, risikonya, dan hitungannya.
 *
 * DIPISAH DARI PETAKNYA, dan itu yang diminta.
 *
 * Sebagai baris tabel berkolom, tiap rasio membawa satu paragraf arti dan
 * satu panel hitungan — sebelas rasio berarti sebelas baris tinggi yang
 * harus digulir, dan yang dicari orang (membandingkan angkanya) justru
 * tenggelam. Sebagai petak, kesebelas angka muat dalam satu layar; yang
 * ingin tahu artinya membuka satu.
 */
@Component({
  selector: 'app-rasio-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatDialogModule,
    MatIconModule,
    MatButtonModule,
    TranslateModule,
  ],
  templateUrl: './rasio-dialog.component.html',
  styleUrl: './rasio-dialog.component.scss',
})
export class RasioDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<RasioDialogComponent>,
    private readonly translate: TranslateService,
    @Inject(MAT_DIALOG_DATA) public data: DataRasioDialog,
  ) {}

  uang(n: unknown): string {
    // Spasi TAK-PUTUS: lihat `uangDokumenRp` untuk alasannya.
    return 'Rp\u00a0' + uangDokumen(n);
  }

  /** Rincian penyusun; daftar KOSONG bila memang tidak dirinci. */
  rincian(sisi: any): any[] {
    return Array.isArray(sisi?.rincian) ? sisi.rincian : [];
  }

  /**
   * Label komponen: terjemahan bila ada, label dari server bila tidak.
   *
   * Kategori beban datang dari DATA, bukan dari daftar tetap. Yang belum
   * punya terjemahan akan tercetak sebagai "posisiKeuangan.komponen.sewa" di
   * layar yang dibaca stakeholder.
   */
  labelKomponen(x: any): string {
    const kunci = 'posisiKeuangan.komponen.' + (x?.kategori ?? '');
    const t = this.translate.instant(kunci);
    if (t && t !== kunci) return t;
    return x?.label || x?.kategori || '—';
  }

  tutup(): void {
    this.dialogRef.close();
  }
}
