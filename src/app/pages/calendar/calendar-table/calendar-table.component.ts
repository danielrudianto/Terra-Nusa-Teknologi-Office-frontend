import { CommonModule, DecimalPipe } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  SimpleChange,
  SimpleChanges,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ICalendarValue } from 'src/app/model/calendar.model';
import { ShortCurrencyPipe } from 'src/app/pipes/short-currency.pipe';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-calendar-table',
  providers: [DecimalPipe],
  imports: [CommonModule, MatIconModule, ShortCurrencyPipe],
  templateUrl: './calendar-table.component.html',
  styleUrl: './calendar-table.component.scss',
  standalone: true,
})
export class CalendarTableComponent {
  constructor(private apiService: ApiService, private snackBar: MatSnackBar) {}

  @Input('month') month!: number;
  @Input('year') year!: number;
  @Input('bankAccounts') bankAccounts: any[] = [];
  @Input('values') values: ICalendarValue[] = [];
  @Input('selectedDay') selectedDay: number | null = null;
  @Input('isBalance') isBalance!: boolean;
  @Output('onCalendarBoxClicked') onCalendarBoxClicked: EventEmitter<
    number | null
  > = new EventEmitter<number | null>();

  weeks: (number | null)[][] = [];
  data: any[] = [];
  incomeData: any[] = [];
  interpayments: any[] = [];
  balance: number = 0;

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
    for (let i = 0; i < firstDayOfWeek; i++) {
      week.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(this.year, this.month, day);
      const currentDayOfWeek = (currentDate.getDay() + 6) % 7;

      if (currentDayOfWeek <= 6) {
        week.push(day);
      }

      if (week.length > 0) {
        if (currentDayOfWeek === 6 || day === daysInMonth) {
          while (week.length <= 6) {
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
          this.incomeData = data.incomes;
          this.interpayments = data.interpayments;
          this.balance = data.balances;
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
    const currentDate = new Date(this.year, this.month, day);
    if (this.isBalance) {
      const previousExpenses = this.data
        .filter((x) => new Date(x.date).getTime() < currentDate.getTime())
        .reduce((acc, x) => acc + x.amount, 0);
      const previousIncomes = this.incomeData
        .filter((x) => new Date(x.date).getTime() < currentDate.getTime())
        .reduce((acc, x) => acc + x.amount, 0);

      const currentBalance = this.balance + previousExpenses - previousIncomes;

      return currentBalance;
    } else {
      return index == -1 ? 0 : this.data[index].amount;
    }
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
