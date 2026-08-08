import {
  Component,
  EventEmitter,
  Inject,
  Input,
  Output,
  SimpleChange,
} from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from 'src/app/services/api.service';
import { PaymentHistoryComponent } from '../../payment/payment-history/payment-history.component';
import { MatListModule, MatSelectionListChange } from '@angular/material/list';
import { CommonModule, DecimalPipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-calendar-day-view',
  standalone: true,
  templateUrl: './calendar-day-view.component.html',
  styleUrl: './calendar-day-view.component.scss',
  imports: [
    MatIconModule,
    MatDialogModule,
    MatListModule,
    MatTooltipModule,
    CommonModule,
    TranslatePipe,
  ],
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
    private dialog: MatDialog,
    private decimalPipe: DecimalPipe,
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

  getDocumentName(data: any) {
    if (data.expense != null) {
      return `${data.expense.description}`;
    }

    if (data.reimbursement != null) {
      return `${data.reimbursement.name}`;
    }

    if (data.purchase != null) {
      return `${data.purchase.invoiceName} ${data.purchase.purchaseOrderName}`;
    }

    return 'N/A';
  }

  getOpponentName(data: any) {
    if (data.expense != null) {
      return `<b>${data.expense.accountName}</b>`;
    }

    if (data.reimbursement != null) {
      return `${data.reimbursement.accountName}`;
    }

    if (data.purchase != null) {
      return `${data.purchase.accountName}`;
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

  getProjectName(data: any) {
    if (data.expense != null) {
      return 'PUSAT ';
    }

    if (data.reimbursement != null) {
      return `${data.reimbursement.projectName} `;
    }

    if (data.purchase != null) {
      return `${data.purchase.projectName} `;
    }

    return '';
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

  copyText() {
    const text = this.data.payments.map((x) => {
      return `${this.getProjectName(x)}${this.decimalPipe.transform(
        x.amount,
        '0.2-2',
      )} ${this.getDocumentName(x)} ${this.getOpponentName(x)}`;
    });

    navigator.clipboard.writeText(text.join('\n'));
  }
}
