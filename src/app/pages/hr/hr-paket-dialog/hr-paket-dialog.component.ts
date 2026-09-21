import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { ApiService } from 'src/app/services/api.service';
import { ServerMessageService } from 'src/app/services/server-message.service';

/** `paket` kosong berarti membuat baru. */
export interface DataPaket {
  paket?: any;
}

/** Batasnya SAMA dengan yang ditegakkan server (`UjianBaru`). */
export const DURASI_MIN = 5;
export const DURASI_MAKS = 480;

@Component({
  selector: 'app-hr-paket-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    TranslateModule,
  ],
  templateUrl: './hr-paket-dialog.component.html',
  styleUrls: ['./hr-paket-dialog.component.scss'],
})
export class HrPaketDialogComponent {
  private readonly api = inject(ApiService);
  private readonly pesanServer = inject(ServerMessageService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  readonly dialogRef = inject(MatDialogRef<HrPaketDialogComponent>);
  readonly data = inject<DataPaket>(MAT_DIALOG_DATA);

  readonly menyimpan = signal(false);

  readonly sunting = !!this.data?.paket?.id;

  nama = this.data?.paket?.name ?? '';
  keterangan = this.data?.paket?.description ?? '';
  durasi: number = this.data?.paket?.durationMinutes ?? 90;
  aktif: boolean = this.data?.paket?.isActive ?? true;

  /**
   * Durasi saat dialog dibuka.
   *
   * Dipakai untuk mengetahui apakah durasinya BENAR-BENAR diubah — server
   * hanya menolak bila nilainya berbeda, dan mengirim nilai yang sama
   * tidak boleh memicu penolakan.
   */
  private readonly durasiAwal: number = this.data?.paket?.durationMinutes ?? 90;

  readonly min = DURASI_MIN;
  readonly maks = DURASI_MAKS;

  get durasiTidakSah(): boolean {
    const n = Number(this.durasi);
    return !Number.isFinite(n) || n < DURASI_MIN || n > DURASI_MAKS;
  }

  get namaTidakSah(): boolean {
    return (this.nama ?? '').trim().length < 2;
  }

  /** Durasi diubah pada paket yang sudah ada — server mungkin menolaknya. */
  get durasiBerubah(): boolean {
    return this.sunting && Number(this.durasi) !== Number(this.durasiAwal);
  }

  get bolehSimpan(): boolean {
    return !this.menyimpan() && !this.namaTidakSah && !this.durasiTidakSah;
  }

  async simpan(): Promise<void> {
    if (!this.bolehSimpan) return;
    this.menyimpan.set(true);
    try {
      const muatan: any = {
        name: this.nama.trim(),
        description: (this.keterangan ?? '').trim() || null,
        isActive: this.aktif,
      };
      /*
       * Durasi hanya DIKIRIM bila memang berubah.
       *
       * Server menolak perubahan durasi selagi ada yang mengerjakan.
       * Mengirimnya setiap kali — walau nilainya sama — membuat penolakan
       * itu muncul saat yang diubah hanya namanya, dan yang membacanya
       * menyimpulkan paketnya terkunci seluruhnya.
       */
      if (!this.sunting || this.durasiBerubah) {
        muatan.durationMinutes = Number(this.durasi);
      }

      if (this.sunting) {
        await firstValueFrom(
          this.api.put(`hr/tests/${this.data.paket.id}`, muatan),
        );
      } else {
        await firstValueFrom(this.api.post('hr/tests', muatan));
      }
      this.snackBar.open(
        this.translate.instant('hrPaket.tersimpan'),
        'Close',
        { duration: 2500 },
      );
      this.dialogRef.close(true);
    } catch (e) {
      this.snackBar.open(this.pesanServer.terjemahkan(e), 'Close', {
        duration: 6000,
      });
    } finally {
      this.menyimpan.set(false);
    }
  }
}
