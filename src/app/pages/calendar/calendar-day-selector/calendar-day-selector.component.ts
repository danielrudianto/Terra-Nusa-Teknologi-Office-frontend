import { Component, Inject } from '@angular/core';
import { MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';

@Component({
  selector: 'app-calendar-day-selector',
  standalone: false,
  templateUrl: './calendar-day-selector.component.html',
  styleUrl: './calendar-day-selector.component.scss',
})
export class CalendarDaySelectorComponent {
  constructor(
    @Inject(MAT_BOTTOM_SHEET_DATA)
    public data: {
      day: number;
      month: number;
      year: number;
      bankAccountID: any[];
    }
  ) {}
}
