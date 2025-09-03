import { Component } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-calendar',
  standalone: false,
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss',
})
export class CalendarComponent {
  constructor(private apiService: ApiService) {}

  sideDialogActive: boolean = false;
  selectedDay: number | null = null;
  month: number = new Date().getMonth(); // Months are 0-indexed in JS
  year: number = new Date().getFullYear();
  bankAccounts: any[] = [];
  isLoadingData: boolean = false;

  onCalendarBoxClicked(event: number | null) {
    this.selectedDay = event;
    this.sideDialogActive = true;
  }

  onMonthChanged(event: any) {
    this.month = event.month;
    this.year = event.year;
  }

  closeSideDialog() {
    this.sideDialogActive = false;
  }

  onBankAccountChanges(event: any) {
    this.bankAccounts = event;
  }
}
