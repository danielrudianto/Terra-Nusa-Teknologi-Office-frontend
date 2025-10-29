import { Component, Inject, model } from '@angular/core';
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

@Component({
  selector: 'app-date-selector',
  providers: [provideNativeDateAdapter()],
  imports: [MatDialogModule, MatDatepickerModule, MatButtonModule],
  templateUrl: './date-selector.component.html',
  styleUrl: './date-selector.component.scss',
})
export class DateSelectorComponent {
  isSubmitting: boolean = false;
  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: {
      id: number;
      date: Date | null;
      minimumDate: Date | null;
      maximumDate: Date | null;
    },
    private dialog: MatDialogRef<DateSelectorComponent>,
    private apiService: ApiService,
    private snackBar: MatSnackBar
  ) {}

  selected = model<Date | null>(this.data.date);

  onSubmit() {
    if (this.selected == null) return;
    this.apiService
      .post('outgoing-payments/move', {
        id: this.data.id,
        date: this.selected,
      })
      .subscribe({
        next: (_) => {
          this.dialog.close(this.selected);
        },
        error: (error) => {
          this.snackBar.open(error.error.detail, 'Close', {
            duration: 3000,
          });
        },
      });
  }
}
