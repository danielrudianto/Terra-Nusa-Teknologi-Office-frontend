import {
  Component,
  EventEmitter,
  Input,
  Output,
  SimpleChange,
} from '@angular/core';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-calendar-day-view',
  standalone: false,
  templateUrl: './calendar-day-view.component.html',
  styleUrl: './calendar-day-view.component.scss',
})
export class CalendarDayViewComponent {
  constructor(private apiService: ApiService) {}

  @Input('date') date!: number | null;
  @Input('month') month!: number;
  @Input('year') year!: number;
  @Input('bankAccountID') bankAccountID: any[] = [];

  @Output('onClose') onClose: EventEmitter<void> = new EventEmitter();

  isLoadingData: boolean = false;

  ngOnChanges(changes: SimpleChange) {
    this.fetchDailyData();
  }

  fetchDailyData() {
    this.isLoadingData = true;
    this.apiService
      .get('calendar/daily', {
        date: `${this.year}-${String(this.month + 1).padStart(2, '0')}-${String(
          this.date
        ).padStart(2, '0')}`,
        bankAccounts: this.bankAccountID.map((account) => account.id),
      })
      .subscribe({
        next: (data) => {
          console.log(data);
        },
        error: (error) => {
          this.closeDialog();
        },
      })
      .add(() => {
        this.isLoadingData = false;
      });
  }

  closeDialog() {
    this.onClose.emit();
  }
}
