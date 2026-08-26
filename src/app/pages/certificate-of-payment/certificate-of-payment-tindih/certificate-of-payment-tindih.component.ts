import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

import { CoPTindih } from 'src/app/services/certificate-of-payment.service';

export interface DataTindih {
  /** Nomor SPK-nya, supaya jelas dokumen mana yang dibandingkan. */
  spk: string;
  /** Periode yang sedang disusun. */
  mulai: string | Date | null;
  selesai: string | Date | null;
  /** CoP lain yang periodenya bertindih. */
  bertindih: CoPTindih[];
}

/**
 * Peringatan periode bertindih — BUKAN penolakan.
 *
 * Dua CoP atas SPK yang sama yang periodenya bertindih berarti hari yang
 * sama disertifikasi dua kali, dan volumenya tertagih dua kali. Tetapi
 * bertindih tidak selalu keliru: pekerjaan yang diperbaiki disertifikasi
 * ulang atas rentang yang sama, dan CoP pembatalan pun begitu.
 *
 * Karena itu dialog ini menunjukkan dokumen pembandingnya beserta
 * periodenya lalu menyerahkan keputusannya — bukan menutup jalan. Yang
 * ditutup adalah kemungkinan bertindih TANPA disadari.
 */
@Component({
  selector: 'app-certificate-of-payment-tindih',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    TranslateModule,
  ],
  templateUrl: './certificate-of-payment-tindih.component.html',
  styleUrl: './certificate-of-payment-tindih.component.scss',
})
export class CertificateOfPaymentTindihComponent {
  private readonly dialogRef =
    inject<MatDialogRef<CertificateOfPaymentTindihComponent, boolean>>(
      MatDialogRef,
    );
  readonly data = inject<DataTindih>(MAT_DIALOG_DATA);

  batal(): void {
    this.dialogRef.close(false);
  }

  lanjut(): void {
    this.dialogRef.close(true);
  }

  /**
   * Hari yang benar-benar tumpang tindih, bukan sekadar "ada tindih".
   *
   * Menyebut rentangnya membuat yang membaca dapat langsung menilai:
   * satu hari di ujung kemungkinan salah ketik, sedangkan dua minggu penuh
   * berarti periodenya memang disusun ulang.
   */
  irisan(b: CoPTindih): { mulai: Date; selesai: Date } | null {
    const a1 = this.keTanggal(this.data.mulai);
    const a2 = this.keTanggal(this.data.selesai);
    const b1 = this.keTanggal(b.periodStart);
    const b2 = this.keTanggal(b.periodEnd);
    if (!a1 || !a2 || !b1 || !b2) return null;
    const mulai = a1 > b1 ? a1 : b1;
    const selesai = a2 < b2 ? a2 : b2;
    return mulai <= selesai ? { mulai, selesai } : null;
  }

  /** Jumlah hari yang tertindih; batasnya inklusif di kedua ujung. */
  jumlahHari(b: CoPTindih): number {
    const i = this.irisan(b);
    if (!i) return 0;
    const HARI = 24 * 60 * 60 * 1000;
    return Math.round((i.selesai.getTime() - i.mulai.getTime()) / HARI) + 1;
  }

  private keTanggal(n: string | Date | null | undefined): Date | null {
    if (!n) return null;
    const d = n instanceof Date ? n : new Date(n);
    return isNaN(d.getTime()) ? null : d;
  }
}
