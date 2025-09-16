import { Component } from '@angular/core';
import { CalendarDaySelectorComponent } from './calendar-day-selector/calendar-day-selector.component';
import { MatBottomSheet } from '@angular/material/bottom-sheet';

@Component({
  selector: 'app-calendar',
  standalone: false,
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss',
})
export class CalendarComponent {
  constructor(private sheet: MatBottomSheet) {}

  month: number = new Date().getMonth(); // Months are 0-indexed in JS
  year: number = new Date().getFullYear();
  bankAccounts: any[] = [];
  isLoadingData: boolean = false;

  onCalendarBoxClicked(event: number | null) {
    if (event == null) return;

    this.sheet.open(CalendarDaySelectorComponent, {
      data: {
        date: event,
        month: this.month,
        year: this.year,
        bankAccountID: this.bankAccounts.map((x) => {
          return x;
        }),
      },
    });
  }

  onMonthChanged(event: any) {
    this.month = event.month;
    this.year = event.year;
  }

  onBankAccountChanges(event: any) {
    this.bankAccounts = event;
  }
}
