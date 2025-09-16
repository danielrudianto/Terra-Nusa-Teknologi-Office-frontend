import {
  Component,
  EventEmitter,
  Input,
  Output,
  SimpleChange,
  SimpleChanges,
} from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ICalendarValue } from 'src/app/model/calendar.model';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-calendar-table',
  standalone: false,
  templateUrl: './calendar-table.component.html',
  styleUrl: './calendar-table.component.scss',
})
export class CalendarTableComponent {
  constructor(private apiService: ApiService, private snackBar: MatSnackBar) {}

  @Input('month') month!: number;
  @Input('year') year!: number;
  @Input('bankAccounts') bankAccounts: any[] = [];
  @Input('values') values: ICalendarValue[] = [];
  @Input('selectedDay') selectedDay: number | null = null;
  @Output('onCalendarBoxClicked') onCalendarBoxClicked: EventEmitter<
    number | null
  > = new EventEmitter<number | null>();

  weeks: (number | null)[][] = [];
  data: any[] = [];
  interpayments: any[] = [];

  ngOnInit() {
    this.generateCalendar();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.hasOwnProperty('selectedDay')) {
      return;
    }

    if (this.month === undefined || this.year === undefined) {
      console.error(
        'Month and year inputs are required for CalendarTableComponent.'
      );
      return;
    }

    this.generateCalendar();
  }

  generateCalendar() {
    this.weeks = [];
    const firstDay = new Date(this.year, this.month, 1);
    const daysInMonth = new Date(this.year, this.month + 1, 0).getDate();
    let firstDayOfWeek = (firstDay.getDay() + 6) % 7;

    let week: (number | null)[] = [];
    if (firstDayOfWeek !== 6) {
      for (let i = 0; i < firstDayOfWeek; i++) {
        week.push(null);
      }
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(this.year, this.month, day);
      const currentDayOfWeek = (currentDate.getDay() + 6) % 7;

      if (currentDayOfWeek < 6) {
        week.push(day);
      }
      if (week.length > 0) {
        if (currentDayOfWeek === 5 || day === daysInMonth) {
          while (week.length < 6) {
            week.push(null);
          }
          this.weeks.push(week);
          week = [];
        }
      }
    }

    this.fetchData();
  }

  fetchData() {
    this.apiService
      .get('calendar', {
        month: this.month + 1,
        year: this.year,
        bankAccounts: this.bankAccounts
          .filter((x) => x.selected)
          .map((x) => x.id),
      })
      .subscribe({
        next: (data: any) => {
          this.data = data.payments;
          this.interpayments = data.interpayments;
        },
        error: (error) => {
          this.snackBar.open(
            'Failed to load calendar data. Please try again later.',
            'Close',
            {
              duration: 3000,
            }
          );
        },
      });
  }

  dayIsToday(day: number | null): boolean {
    if (day === null) {
      return false;
    }

    const thisDay = new Date(this.year, this.month, day);
    const today = new Date();
    return (
      thisDay.getDate() === today.getDate() &&
      thisDay.getMonth() === today.getMonth() &&
      thisDay.getFullYear() === today.getFullYear()
    );
  }

  dataForDay(day: number): number {
    const index = this.data.findIndex((x) => new Date(x.date).getDate() == day);
    return index == -1 ? 0 : this.data[index].amount;
  }

  onDayClick(day: number | null) {
    if (day === null) {
      this.onCalendarBoxClicked.emit(null);
      return;
    }
    this.onCalendarBoxClicked.emit(day);
  }

  interpaymentExistsForDay(day: number | null): boolean {
    if (day == null) {
      return false;
    }

    const index = this.interpayments.findIndex(
      (x) => new Date(x.date).getDate() == day
    );
    return index >= 0;
  }
}
