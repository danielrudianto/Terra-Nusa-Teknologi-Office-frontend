import { Component, Inject } from '@angular/core';
import { MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
import { ApiService } from '../../../services/api.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { CalendarDayViewComponent } from '../calendar-day-view/calendar-day-view.component';

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
      date: number;
      month: number;
      year: number;
      bankAccountID: any[];
    },
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  isLoading: boolean = false;
  dataSource: any[] = [];
  bankDataSource: any[] = [];
  interpaymentDataSource: any[] = [];

  ngOnInit(): void {
    this.fetchDailyData();
  }

  fetchDailyData() {
    this.isLoading = true;
    this.apiService
      .get('calendar/daily', {
        date: `${this.data.year}-${String(this.data.month + 1).padStart(
          2,
          '0'
        )}-${String(this.data.date).padStart(2, '0')}`,
        bankAccounts: this.data.bankAccountID
          .filter((x) => x.selected)
          .map((x) => {
            return x.id;
          }),
      })
      .subscribe({
        next: (data: any) => {
          this.dataSource = data.data;
          this.bankDataSource = data.bankAccounts;
          this.interpaymentDataSource = data.interpayments;
        },
        error: (error) => {
          this.snackBar.open(error, 'Close', {
            duration: 1000,
          });
        },
      })
      .add(() => {
        this.isLoading = false;
      });
  }

  viewData(id: number) {
    const index = this.bankDataSource.findIndex((x) => x.id == id);
    if (index == -1) return;
    this.dialog.open(CalendarDayViewComponent, {
      data: {
        bankAccount: this.bankDataSource[index],
        payments: this.dataSource.filter((x) => x.bankAccountID == id),
        incomingInterpayments: this.interpaymentDataSource.filter(
          (x) => x.bankAccountIDDestination == id
        ),
        outgoingInterpayments: this.interpaymentDataSource.filter(
          (x) => x.bankAccountIDOrigin == id
        ),
      },
    });
  }
}
