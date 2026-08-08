import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CalendarDaySelectorComponent } from './calendar-day-selector/calendar-day-selector.component';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatDialog } from '@angular/material/dialog';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CalendarMonthSelectorComponent } from './calendar-month-selector/calendar-month-selector.component';
import { CalendarAccountSelectorComponent } from './calendar-account-selector/calendar-account-selector.component';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { CalendarTableComponent } from './calendar-table/calendar-table.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-calendar',
  imports: [
    TranslatePipe,
    FormsModule,
    ReactiveFormsModule,
    CalendarMonthSelectorComponent,
    CalendarAccountSelectorComponent,
    MatSlideToggleModule,
    MatButtonToggleModule,
    CalendarTableComponent,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss',
  standalone: true,
})
export class CalendarComponent {
  constructor(private dialog: MatDialog) {}

  month: number = new Date().getMonth(); // Months are 0-indexed in JS
  year: number = new Date().getFullYear();
  bankAccounts: any[] = [];
  isLoadingData: boolean = false;

  // mode tampilan calendar: 'expense' | 'income' | 'balance'
  viewMode: FormControl = new FormControl('expense');

  onCalendarBoxClicked(event: number | null) {
    if (event == null) return;

    this.dialog.open(CalendarDaySelectorComponent, {
      data: {
        date: event,
        month: this.month,
        year: this.year,
        bankAccountID: this.bankAccounts.map((x) => {
          return x;
        }),
      },
      width: '80vw',
      height: '80vh',
      maxWidth: '80vw',
      maxHeight: '80vh',
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
