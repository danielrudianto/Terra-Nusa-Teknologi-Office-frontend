import {
  Component,
  EventEmitter,
  Inject,
  Input,
  Output,
  SimpleChange,
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
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
    @Inject(MAT_DIALOG_DATA)
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

  @Output('onClose') onClose: EventEmitter<void> = new EventEmitter();

  isLoadingData: boolean = false;
  dataSource: any[] = [];
  interpaymentDataSource: any[] = [];
  bankDataSource: any[] = [];
  dataCount: number = 0;
  selected: number[] = [];
  selectedBankAccountID: number | null = null;

  ngOnInit(): void {
    this.fetchDailyData();
  }

  fetchDailyData() {
    this.isLoadingData = true;
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

    if (data.bankAccountIDDestination != null) {
      return 'swap_horizontal';
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

  getDataSource(id: number) {
    const purchases = this.dataSource.filter((x) => x.bankAccountID == id);
    const interpayments = this.interpaymentDataSource.filter(
      (x) => x.bankAccountIDOrigin == id || x.bankAccountIDDestination == id
    );

    return [...purchases, ...interpayments];
  }
}
