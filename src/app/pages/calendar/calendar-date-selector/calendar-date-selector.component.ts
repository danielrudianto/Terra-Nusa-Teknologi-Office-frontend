import { Component } from '@angular/core';

@Component({
  selector: 'app-calendar-date-selector',
  templateUrl: './calendar-date-selector.component.html',
  styleUrl: './calendar-date-selector.component.scss',
  standalone: false,
})
export class CalendarDateSelectorComponent {
  selectedDate: Date = new Date();
}
