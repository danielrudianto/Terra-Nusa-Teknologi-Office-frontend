import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MonthSelectorComponent } from 'src/app/components/month-selector/month-selector.component';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-calendar-month-selector',
  imports: [MatIconModule],
  templateUrl: './calendar-month-selector.component.html',
  styleUrl: './calendar-month-selector.component.scss',
  standalone: true,
})
export class CalendarMonthSelectorComponent {
  constructor(
    private dialog: MatDialog,
    private translate: TranslateService,
  ) {}

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
    const monthKeys = [
      'common.january',
      'common.february',
      'common.march',
      'common.april',
      'common.may',
      'common.june',
      'common.july',
      'common.august',
      'common.september',
      'common.october',
      'common.november',
      'common.december',
    ];
    return this.translate.instant(monthKeys[this.month]);
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
