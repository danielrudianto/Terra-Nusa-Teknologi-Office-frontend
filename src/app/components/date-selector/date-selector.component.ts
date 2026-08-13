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
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-date-selector',
  providers: [provideNativeDateAdapter()],
  imports: [
    TranslatePipe,
    MatDialogModule,
    MatDatepickerModule,
    MatButtonModule,
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

  onSubmit() {
    this.apiService
      .post('outgoing-payments/move', {
        id: this.data.id,
        date: moment(this.selectedDate).format('YYYY-MM-DD'),
      })
      .subscribe({
        next: (_) => {
          this.dialog.close('moved');
        },
        error: (error) => {
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
