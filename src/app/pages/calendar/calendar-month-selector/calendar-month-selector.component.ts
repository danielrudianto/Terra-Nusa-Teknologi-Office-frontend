import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MonthSelectorComponent } from 'src/app/components/month-selector/month-selector.component';

@Component({
  selector: 'app-calendar-month-selector',
  standalone: false,
  templateUrl: './calendar-month-selector.component.html',
  styleUrl: './calendar-month-selector.component.scss',
})
export class CalendarMonthSelectorComponent {
  constructor(private dialog: MatDialog) {}

  @Input('month') month!: number;
  @Input('year') year!: number;
  @Input('onMonthChanged') onMonthChanged!: (event: {
    month: number;
    year: number;
  }) => void;
  @Output('onMonthYearSelected') onMonthYearSelected: EventEmitter<{
    month: number;
    year: number;
  }> = new EventEmitter<{ month: number; year: number }>();

  get monthName(): string {
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return monthNames[this.month];
  }

  onButtonClicked() {
    this.dialog
      .open(MonthSelectorComponent, {
        data: {
          month: this.month,
          year: this.year,
        },
      })
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          this.onMonthYearSelected.emit({
            month: result.month,
            year: result.year,
          });
        }
      });
  }
}
