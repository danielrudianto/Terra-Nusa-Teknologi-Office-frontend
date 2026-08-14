import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { ApiService } from 'src/app/services/api.service';
import { ServerMessageService } from 'src/app/services/server-message.service';

/**
 * Kelola periode pengisian formulir keadaan karyawan.
 *
 * Satu periode adalah satu putaran pengisian — biasanya satu tahun. Isinya
 * daftar pertanyaan yang berlaku pada periode itu, dan tiap karyawan punya
 * satu pengisian untuknya.
 *
 * Gunanya satu tetapi menentukan: jawaban 2026 tetap dibaca dengan
 * pertanyaan 2026, walaupun pertanyaan tahun berikutnya sudah berbeda.
 */
@Component({
  selector: 'app-employee-form-period',
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
    TranslatePipe,
  ],
  templateUrl: './employee-form-period.component.html',
  styleUrl: './employee-form-period.component.scss',
})
export class EmployeeFormPeriodComponent implements OnInit {
  constructor(
    private dialogRef: MatDialogRef<EmployeeFormPeriodComponent>,
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private serverMessage: ServerMessageService,
    private translate: TranslateService,
  ) {}

  isLoading = true;
  isSubmitting = false;

  versi: any[] = [];

  /** Karyawan yang belum mengisi periode yang sedang berlaku. */
  belumMengisi: any[] = [];
  memuatBelum = false;

  formGroup = new FormGroup({
    period: new FormControl('', [
      Validators.required,
      Validators.maxLength(50),
    ]),
    title: new FormControl('', Validators.maxLength(200)),
  });

  ngOnInit(): void {
    this.muat();
  }

  get aktif(): any | null {
    return this.versi.find((v) => v.isActive) ?? null;
  }

  private muat(): void {
    this.apiService.get('employee-forms/versions', {}).subscribe({
      next: (res: any) => {
        this.versi = res ?? [];
        this.isLoading = false;
        // Tahun berjalan diusulkan; yang membuat periode hampir selalu
        // memaksudkan tahun ini, dan mengetiknya ulang hanya menambah
        // kesempatan salah ketik.
        if (!this.formGroup.value.period) {
          this.formGroup.patchValue({
            period: String(new Date().getFullYear()),
          });
        }
        if (this.aktif) this.muatBelumMengisi(this.aktif.id);
      },
      error: (err: any) => {
        this.isLoading = false;
        this.beritahu(err);
      },
    });
  }

  /**
   * Siapa yang belum mengisi periode berjalan.
   *
   * Diambil dari server, bukan dihitung di layar: yang belum mengisi tidak
   * punya baris sama sekali, sehingga hanya sambungan kiri luar di basis
   * data yang dapat menemukannya.
   */
  private muatBelumMengisi(versionId: number): void {
    this.memuatBelum = true;
    this.apiService
      .get(`employee-forms/versions/${versionId}/pending`, {})
      .subscribe({
        next: (res: any) => {
          this.belumMengisi = res ?? [];
          this.memuatBelum = false;
        },
        error: () => {
          // Gagal memuat daftar tagihan tidak boleh menghalangi pembuatan
          // periode; daftarnya cukup dibiarkan kosong.
          this.belumMengisi = [];
          this.memuatBelum = false;
        },
      });
  }

  buatPeriode(): void {
    if (this.formGroup.invalid || this.isSubmitting) return;
    this.isSubmitting = true;

    const v = this.formGroup.getRawValue();
    this.apiService
      .post('employee-forms/versions', {
        period: (v.period ?? '').trim(),
        title: (v.title ?? '').trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.snackBar.open(
            this.translate.instant('employeeForm.periodCreated'),
            this.translate.instant('common.close'),
            { duration: 3000 },
          );
          this.isSubmitting = false;
          this.formGroup.reset();
          this.isLoading = true;
          this.muat();
        },
        error: (err: any) => {
          this.isSubmitting = false;
          this.beritahu(err);
        },
      });
  }

  private beritahu(err: any): void {
    this.snackBar.open(
      this.serverMessage.terjemahkan(err),
      this.translate.instant('common.close'),
      { duration: 5000 },
    );
  }

  tutup(): void {
    this.dialogRef.close();
  }
}
