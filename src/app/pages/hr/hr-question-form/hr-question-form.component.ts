import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { ApiService } from 'src/app/services/api.service';

/**
 * Buat atau ubah satu soal.
 *
 * Dialog yang sama dipakai untuk keduanya — pola yang sudah berlaku pada
 * pemasok dan alat: dua layar terpisah untuk isian yang sama berarti setiap
 * penambahan kolom harus dikerjakan dua kali, dan yang terlupakan salah satu
 * baru ketahuan setelah dipakai.
 */
@Component({
  selector: 'app-hr-question-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
  ],
  templateUrl: './hr-question-form.component.html',
  styleUrl: './hr-question-form.component.scss',
})
export class HrQuestionFormComponent {
  private readonly apiService = inject(ApiService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  isSubmitting = false;
  ujian: any[] = [];

  /** Kategori yang dipakai bank soal yang dipindahkan dari sistem lama. */
  readonly kategori = ['civil', 'geo', 'drawing'];

  formGroup = new FormGroup({
    testID: new FormControl<number | null>(null, Validators.required),
    question: new FormControl('', [
      Validators.required,
      Validators.minLength(5),
      Validators.maxLength(2000),
    ]),
    notes: new FormControl('', Validators.maxLength(500)),
    // Lampiran berupa HTML — tabel berat besi, gambar potongan.
    attachment: new FormControl('', Validators.maxLength(4000)),
    category: new FormControl('civil', Validators.required),
    maxScore: new FormControl(5, [
      Validators.required,
      Validators.min(1),
      Validators.max(100),
    ]),
    allowsUpload: new FormControl(false),
  });

  constructor(
    private dialog: MatDialogRef<HrQuestionFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {
    this.ujian = data?.ujian ?? [];

    if (data?.soal) {
      const s = data.soal;
      this.formGroup.patchValue({
        testID: s.testID,
        question: s.question,
        notes: s.notes ?? '',
        attachment: s.attachment ?? '',
        category: s.category,
        maxScore: s.maxScore,
        allowsUpload: !!s.allowsUpload,
      });
      // Paket ujian tidak dapat dipindah saat menyunting.
      //
      // Memindahkannya membuat nomor urutnya bertabrakan dengan soal yang
      // sudah ada di paket tujuan, dan jawaban lama tetap menunjuk ke soal
      // ini — sehingga satu lembar jawaban memuat soal dari dua ujian.
      this.formGroup.get('testID')?.disable();
    } else if (data?.testID) {
      this.formGroup.patchValue({ testID: data.testID });
    }
  }

  get isUbah(): boolean {
    return !!this.data?.soal;
  }

  /**
   * Soal gambar menerima unggahan; yang lain tidak.
   *
   * Diisikan otomatis saat kategorinya diubah, tetapi tetap dapat disunting —
   * sebagian soal hitungan pun kadang meminta lampiran perhitungan.
   */
  onKategoriUbah(nilai: string): void {
    if (this.isUbah) return;
    this.formGroup.get('allowsUpload')?.setValue(nilai === 'drawing');
  }

  simpan(): void {
    if (this.formGroup.invalid || this.isSubmitting) return;
    this.isSubmitting = true;

    // `getRawValue` supaya `testID` yang dinonaktifkan ikut terbaca; tanpa
    // itu nilainya undefined dan soalnya tersimpan tanpa paket ujian.
    const v = this.formGroup.getRawValue();
    const muatan: any = {
      question: (v.question || '').trim(),
      notes: (v.notes || '').trim() || null,
      attachment: (v.attachment || '').trim() || null,
      category: v.category,
      maxScore: v.maxScore,
      allowsUpload: !!v.allowsUpload,
    };

    const permintaan = this.isUbah
      ? this.apiService.put(`hr/questions/${this.data.soal.id}`, muatan)
      : this.apiService.post('hr/questions', {
          ...muatan,
          testID: v.testID,
        });

    permintaan
      .subscribe({
        next: () => {
          this.snackBar.open(
            this.translate.instant(
              this.isUbah ? 'hrQuestion.tersimpan' : 'hrQuestion.dibuat',
            ),
            this.translate.instant('common.close'),
            { duration: 3000 },
          );
          this.dialog.close(true);
        },
        error: (err) =>
          this.snackBar.open(
            err?.error?.detail ||
              this.translate.instant('hrQuestion.gagalSimpan'),
            this.translate.instant('common.close'),
            { duration: 4000 },
          ),
      })
      .add(() => (this.isSubmitting = false));
  }

  batal(): void {
    this.dialog.close();
  }
}
