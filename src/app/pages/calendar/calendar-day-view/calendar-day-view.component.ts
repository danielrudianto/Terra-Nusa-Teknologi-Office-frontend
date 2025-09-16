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
      bankAccount: {
        bankAccountName: string;
        bankAccountNumber: string;
        bankName: string;
      };
      payments: any[];
      incomingInterpayments: any[];
      outgoingInterpayments: any[];
    },
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  isLoadingData: boolean = false;
  selected: number = 0;

  ngOnInit(): void {}

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

  onSelectionChange(event: MatSelectionListChange) {
    console.log(event.options);
  }

  openPaymentData(paymentID: number, event: any) {
    event.stopPropagation();
    this.dialog.open(PaymentHistoryComponent, {
      data: {
        id: paymentID,
      },
    });
  }
}
