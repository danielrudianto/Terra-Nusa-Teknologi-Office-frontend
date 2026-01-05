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
import moment from 'moment';

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
      date: Date;
      minimumDate: Date | null;
      maximumDate: Date | null;
    },
    private dialog: MatDialogRef<DateSelectorComponent>,
    private apiService: ApiService,
    private snackBar: MatSnackBar
  ) {}

  selectedDate: Date = this.data.date;

  onSubmit() {
    this.apiService
      .post('outgoing-payments/move', {
        id: this.data.id,
        date: moment(this.selectedDate).format("YYYY-MM-DD"),
      })
      .subscribe({
        next: (_) => {
          this.dialog.close("moved");
        },
        error: (error) => {
          this.snackBar.open(error.error.detail, 'Close', {
            duration: 3000,
          });
        },
      });
  }

  onSelectedChanged(event: any){
    this.selectedDate = new Date(event);
  }
}
