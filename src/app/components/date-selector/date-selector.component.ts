import { Component, Inject, model, inject } from '@angular/core';
import { ServerMessageService } from 'src/app/services/server-message.service';
import { MatButtonModule } from '@angular/material/button';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { ApiService } from '../../services/api.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import moment from 'moment';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-date-selector',
  providers: [provideNativeDateAdapter()],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslatePipe,
    MatDialogModule,
    MatDatepickerModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
  ],
  templateUrl: './date-selector.component.html',
  styleUrl: './date-selector.component.scss',
})
export class DateSelectorComponent {
  private readonly serverMessage = inject(ServerMessageService);
  isSubmitting: boolean = false;
  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: {
      id: number;
      date: Date;
      minimumDate: Date | null;
      maximumDate: Date | null;
    },
    private dialog: MatDialogRef<DateSelectorComponent>,
    private apiService: ApiService,
    private snackBar: MatSnackBar,
  ) {}

  selectedDate: Date = this.data.date;

  private readonly translate = inject(TranslateService);

  /**
   * Alasan pemindahan.
   *
   * Wajib diisi: memindahkan tanggal berarti menunda uang keluar, dan pada
   * saat audit "mengapa dibayar mundur seminggu" adalah pertanyaan yang
   * harus dapat dijawab dokumen — bukan ingatan.
   */
  reasonControl = new FormControl('', [
    Validators.required,
    Validators.minLength(4),
    Validators.maxLength(200),
  ]);

  /** Berapa hari pembayaran tertunda dibanding tanggal semula. */
  get selisihHari(): number {
    const a = new Date(this.data.date);
    const b = new Date(this.selectedDate);
    a.setHours(0, 0, 0, 0);
    b.setHours(0, 0, 0, 0);
    return Math.round((b.getTime() - a.getTime()) / 86400000);
  }

  /** Tanggalnya benar-benar berubah. */
  get adaPerubahan(): boolean {
    return this.selisihHari !== 0;
  }

  onSubmit() {
    if (this.reasonControl.invalid || !this.adaPerubahan) return;
    this.isSubmitting = true;
    this.apiService
      .post('outgoing-payments/move', {
        id: this.data.id,
        date: moment(this.selectedDate).format('YYYY-MM-DD'),
        reason: (this.reasonControl.value || '').trim(),
      })
      .subscribe({
        next: (_) => {
          // Diberitahukan sebelum dialog ditutup: tanpa ini, satu-satunya
          // tanda keberhasilan adalah barisnya hilang dari daftar — yang
          // sama persis dengan tampilan bila sesuatu gagal diam-diam.
          this.snackBar.open(
            this.translate.instant('movePayment.moved'),
            'Close',
            { duration: 3000 },
          );
          this.dialog.close('moved');
        },
        error: (error) => {
          this.isSubmitting = false;
          this.snackBar.open(
          this.serverMessage.terjemahkan(error), 'Close', {
            duration: 3000,
          });
        },
      });
  }

  onSelectedChanged(event: any) {
    this.selectedDate = new Date(event);
  }
}
