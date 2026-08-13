import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import moment from 'moment';

import { ApiService } from '../../../services/api.service';

/**
 * Menonaktifkan karyawan, atau mengaktifkannya kembali.
 *
 * Status kepegawaian ditentukan oleh `endDate`: terisi berarti sudah tidak
 * bekerja, kosong berarti masih aktif. Tidak ada kolom status tersendiri,
 * sehingga tanggalnya bukan sekadar keterangan — itulah penandanya.
 *
 * Dibuat sebagai dialog tersendiri di daftar karyawan, bukan diselipkan ke
 * pembuatan slip gaji. Menonaktifkan orang adalah keputusan kepegawaian;
 * menaruhnya di alur penggajian membuatnya hanya ditemukan oleh yang
 * kebetulan sedang membuat slip, dan mudah terlewat pada bulan ketika
 * orangnya memang sudah tidak digaji.
 */
@Component({
  selector: 'app-employee-status',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    TranslatePipe,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './employee-status.component.html',
  styleUrl: './employee-status.component.scss',
})
export class EmployeeStatusComponent {
  private readonly api = inject(ApiService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  constructor(
    @Inject(MAT_DIALOG_DATA) public karyawan: any,
    private dialogRef: MatDialogRef<EmployeeStatusComponent>,
  ) {
    if (this.sudahNonaktif) {
      this.formGroup.get('endDate')?.setValue(new Date(this.karyawan.endDate));
    }
  }

  isSubmitting = false;

  formGroup = new FormGroup({
    endDate: new FormControl<Date | null>(new Date(), Validators.required),
  });

  /** Sudah punya tanggal terakhir berarti sudah dinonaktifkan. */
  get sudahNonaktif(): boolean {
    return !!this.karyawan?.endDate;
  }

  /**
   * Tanggal terakhir tidak boleh mendahului tanggal masuk.
   *
   * Selisih terbalik membuat masa kerjanya terbaca negatif di mana pun
   * dihitung, dan itu jenis kekeliruan yang tidak menampilkan galat —
   * hanya angka yang salah.
   */
  get tanggalTerbalik(): boolean {
    const mulai = this.karyawan?.startDate;
    const akhir = this.formGroup.value.endDate;
    return !!mulai && !!akhir && moment(akhir).isBefore(moment(mulai), 'day');
  }

  get tanggalDiMasaDepan(): boolean {
    const akhir = this.formGroup.value.endDate;
    return !!akhir && moment(akhir).isAfter(moment(), 'day');
  }

  nonaktifkan(): void {
    if (this.formGroup.invalid || this.tanggalTerbalik || this.isSubmitting) return;
    this.kirim(
      moment(this.formGroup.value.endDate).format('YYYY-MM-DD'),
      'employeeStatus.deactivated',
    );
  }

  aktifkanLagi(): void {
    if (this.isSubmitting) return;
    // `null`, bukan string kosong: kolomnya nullable dan penyaring status
    // memeriksa NULL, bukan panjang teksnya.
    this.kirim(null, 'employeeStatus.reactivated');
  }

  private kirim(endDate: string | null, kunciSukses: string): void {
    this.isSubmitting = true;

    /*
     * Seluruh data karyawan dikirim ulang, bukan hanya endDate.
     *
     * Endpoint `PUT /employees` menerima objek utuh dan menimpa seluruh
     * kolomnya; mengirim sebagian membuat sisanya tertulis kosong.
     */
    this.api
      .put('employees', { ...this.karyawan, endDate })
      .subscribe({
        next: () => {
          this.snackBar.open(this.translate.instant(kunciSukses), 'Close', {
            duration: 3000,
          });
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.snackBar.open(
            err?.error?.detail ??
              this.translate.instant('notify.saveFailed'),
            'Close',
            { duration: 4000 },
          );
        },
      })
      .add(() => {
        this.isSubmitting = false;
      });
  }

  batal(): void {
    this.dialogRef.close(false);
  }
}
