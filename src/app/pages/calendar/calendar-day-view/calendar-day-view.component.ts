import {
  Component,
  EventEmitter,
  Input,
  Output,
  SimpleChange,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from 'src/app/services/api.service';
import { PaymentHistoryComponent } from '../../payment/payment-history/payment-history.component';
import { MatSelectionListChange } from '@angular/material/list';

@Component({
  selector: 'app-calendar-day-view',
  standalone: false,
  templateUrl: './calendar-day-view.component.html',
  styleUrl: './calendar-day-view.component.scss',
})
export class CalendarDayViewComponent {
  constructor(
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  @Input('date') date!: number | null;
  @Input('month') month!: number;
  @Input('year') year!: number;
  @Input('bankAccountID') bankAccountID: any[] = [];

  @Output('onClose') onClose: EventEmitter<void> = new EventEmitter();

  isLoadingData: boolean = false;
  dataSource: any[] = [];
  dataCount: number = 0;
  selected: number[] = [];

  ngOnChanges(changes: SimpleChange) {
    if (this.date == null) {
      return;
    }

    this.selected = [];
    this.fetchDailyData();
  }

  fetchDailyData() {
    this.isLoadingData = true;
    this.apiService
      .get('calendar/daily', {
        date: `${this.year}-${String(this.month + 1).padStart(2, '0')}-${String(
          this.date
        ).padStart(2, '0')}`,
        bankAccounts: this.bankAccountID
          .filter((x) => x.selected)
          .map((x) => x.id),
      })
      .subscribe({
        next: (data: any) => {
          this.dataSource = data;
        },
        error: (error) => {
          this.snackBar.open(error, 'Close', {
            duration: 1000,
          });
          this.closeDialog();
        },
      })
      .add(() => {
        this.isLoadingData = false;
      });
  }

  closeDialog() {
    this.onClose.emit();
  }

  getDescription(data: any) {
    if (data.expense != null) {
      return `<b>${data.expense.description}</b>`;
    }

    if (data.reimbursement != null) {
      return `<b>${data.reimbursement.accountName}</b> | ${data.reimbursement.projectName}`;
    }

    if (data.purchase != null) {
      return `<b>${data.purchase.accountName}</b> | ${data.purchase.projectName}`;
    }

    return 'N/A';
  }

  getIcon(data: any) {
    if (data.expense != null) {
      return 'shopping_bag';
    }

    if (data.reimbursement != null) {
      return 'assignment';
    }

    if (data.purchase != null) {
      return 'document_scanner';
    }

    return 'unknown_document';
  }

  getTooltip(data: any) {
    if (data.expense != null) {
      return 'Expense';
    }

    if (data.reimbursement != null) {
      return 'Reimbursement';
    }

    if (data.purchase != null) {
      return 'Purchase';
    }

    return 'Unknown';
  }

  openPaymentData(paymentID: number, event: any) {
    event.stopPropagation();
    this.dialog.open(PaymentHistoryComponent, {
      data: {
        id: paymentID,
      },
    });
  }

  get totalPayment(): number {
    return this.selected.reduce((a, b) => {
      return a + b;
    }, 0);
  }

  onSelectionChange(event: MatSelectionListChange) {
    this.selected =
      event.source._value?.map((x) => {
        return Number(x);
      }) ?? [];
  }
}
