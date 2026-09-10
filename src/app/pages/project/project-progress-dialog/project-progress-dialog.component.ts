import { CommonModule } from '@angular/common';
import { Component, Inject, inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { ApiService } from 'src/app/services/api.service';

export interface DataDialogProgress {
  /** Proyek yang dicatat kemajuannya. */
  projectID: number;
  /** Diisi bila sedang menyunting catatan yang sudah ada. */
  progress?: {
    id: number;
    date: string;
    percentage: number | string;
    description?: string | null;
  } | null;
}

/**
 * Catat atau sunting satu titik kemajuan proyek.
 *
 * Satu titik, bukan seluruh riwayat. Yang mengisinya berdiri di lokasi dan
 * melaporkan keadaan pada satu tanggal; formulir yang menampilkan seluruh
 * riwayat sekaligus mengundang penyuntingan angka lama untuk "merapikan"
 * kurvanya — dan kurva yang dirapikan berhenti menjawab pertanyaan yang
 * membuatnya dibuat.
 */
@Component({
  selector: 'app-project-progress-dialog',
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
    TranslatePipe,
  ],
  templateUrl: './project-progress-dialog.component.html',
  styleUrl: './project-progress-dialog.component.scss',
})
export class ProjectProgressDialogComponent {
  private readonly api = inject(ApiService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  menyimpan = false;

  readonly form = new FormGroup({
    // Tipenya `any`: adapter Moment mengisi bidang ini dengan objek
    // Moment, bukan `Date`.
    date: new FormControl<any>(null, Validators.required),
    percentage: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(0),
      Validators.max(100),
    ]),
    description: new FormControl<string>(''),
  });

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: DataDialogProgress,
    private dialogRef: MatDialogRef<ProjectProgressDialogComponent>,
  ) {
    const p = data?.progress;
    if (p) {
      this.form.patchValue({
        date: p.date ? new Date(p.date) : null,
        percentage: Number(p.percentage),
        description: p.description ?? '',
      });
    }
  }

  get menyunting(): boolean {
    return !!this.data?.progress?.id;
  }

  /**
   * Tanggal dikirim sebagai `YYYY-MM-DD` SETEMPAT, bukan ISO UTC.
   *
   * Dua hal yang harus benar sekaligus:
   *
   * 1. Nilainya BUKAN `Date`. Aplikasi ini memasang adapter Moment
   *    (`provideMomentDateAdapter` di `app.module`), sehingga datepicker
   *    mengembalikan objek Moment. Memanggil `.getMonth()` langsung pada
   *    nilai formulir melempar "getMonth is not a function" tepat saat
   *    tombol Simpan ditekan — dan tidak ada satu pun tanda sebelum itu.
   *    `new Date(v)` menerima keduanya: Moment lewat `valueOf()`, dan teks
   *    lewat parsernya sendiri.
   *
   * 2. Disusun dari bagian waktu SETEMPAT. `toISOString()` mengubahnya ke
   *    UTC lebih dulu, dan bagi WIB itu memundurkan tanggalnya sehari untuk
   *    opname dini hari — kurvanya bergeser tanpa ada yang tahu sebabnya.
   *
   * Bentuknya sengaja sama dengan `tanggalIso` pada dialog rencana kas.
   */
  private tanggalLokal(v: any): string | null {
    if (!v) return null;
    const t = v instanceof Date ? v : new Date(v);
    if (isNaN(t.getTime())) return null;
    const dd = (n: number) => String(n).padStart(2, '0');
    return `${t.getFullYear()}-${dd(t.getMonth() + 1)}-${dd(t.getDate())}`;
  }

  simpan(): void {
    if (this.form.invalid || this.menyimpan) {
      this.form.markAllAsTouched();
      return;
    }

    const nilai = this.form.getRawValue();
    const tanggal = this.tanggalLokal(nilai.date);
    if (!tanggal) {
      // Tidak seharusnya terjadi — bidangnya wajib — tetapi mengirim `null`
      // ke server menghasilkan 400 yang tidak menyebutkan bidang mana.
      this.form.controls.date.setErrors({ required: true });
      this.form.markAllAsTouched();
      return;
    }

    const muatan = {
      date: tanggal,
      percentage: Number(nilai.percentage),
      description: (nilai.description || '').trim() || null,
    };

    this.menyimpan = true;

    const permintaan = this.menyunting
      ? this.api.put(`projects/progress/${this.data.progress!.id}`, muatan)
      : this.api.post(`projects/${this.data.projectID}/progress`, muatan);

    permintaan.subscribe({
      next: () => {
        this.snackBar.open(
          this.translate.instant('notify.createSuccess'),
          'Close',
          { duration: 3000 },
        );
        this.dialogRef.close(true);
      },
      error: (err: any) => {
        /*
         * Kode tetap dari server dipetakan ke kalimat.
         *
         * "PROGRESS_DATE_EXISTS" tidak memberi tahu apa yang harus dilakukan
         * berikutnya; kalimatnya menyebutkan bahwa catatan tanggal itu
         * disunting, bukan ditambah lagi.
         */
        const kode = err?.error?.detail;
        const peta: Record<string, string> = {
          PROGRESS_DATE_EXISTS: 'projectProgress.errDateExists',
          PROGRESS_PERCENTAGE_INVALID: 'projectProgress.errPercentage',
          PROGRESS_DATE_REQUIRED: 'projectProgress.errDateRequired',
          PROGRESS_NOTHING_TO_UPDATE: 'projectProgress.errNothingChanged',
        };
        const pesan = peta[kode]
          ? this.translate.instant(peta[kode])
          : (kode ?? this.translate.instant('notify.saveFailed'));
        this.snackBar.open(pesan, 'Close', { duration: 6000 });
      },
    }).add(() => {
      this.menyimpan = false;
    });
  }

  batal(): void {
    this.dialogRef.close(false);
  }
}
