import { Component, Inject, ViewChild } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { CalendarDayViewComponent } from '../calendar-day-view/calendar-day-view.component';
import {
  MatList,
  MatSelectionList,
  MatSelectionListChange,
} from '@angular/material/list';
import { DecimalPipe } from '@angular/common';
import { Clipboard } from '@angular/cdk/clipboard';
import { CalendarPaymentConfirmComponent } from '../calendar-payment-confirm/calendar-payment-confirm.component';
import { CalendarPaymentRejectComponent } from '../calendar-payment-reject/calendar-payment-reject.component';

interface BankAccountSummary {
  id: number;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  paymentCount: number;
  incomingCount: number;
  outgoingCount: number;
  totalAmount: number;
  hasActivities: boolean;
}

@Component({
  selector: 'app-calendar-day-selector',
  standalone: false,
  templateUrl: './calendar-day-selector.component.html',
  styleUrl: './calendar-day-selector.component.scss',
})
export class CalendarDaySelectorComponent {
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
    private dialog: MatDialog,
    private clipboard: Clipboard,
    private decimalPipe: DecimalPipe
  ) {}

  @ViewChild('paymentSelection') paymentSelection: MatSelectionList | undefined;

  isLoading: boolean = false;
  bankAccountSummaries: BankAccountSummary[] = [];
  selectedAccount: BankAccountSummary | null = null;
  selectedPayments: number[] = [];
  rawData: any;
  selectedAmount: number = 0;

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
          this.rawData = data;
          this.processSummaries(data);
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

  get payments() {
    if (this.selectAccount == null) return [];
    return this.rawData.data.filter(
      (payment: any) => payment.bankAccountID === this.selectedAccount?.id
    );
  }

  get interpayments() {
    if (this.selectAccount == null) return [];
    return this.rawData.interpayments.filter(
      (ip: any) => ip.bankAccountIDOrigin === this.selectedAccount?.id
    );
  }

  getAccountName(data: any) {
    if (data.purchaseID != null) {
      return data.purchase.accountName;
    }

    if (data.expenseID != null) {
      return data.expense.accountName;
    }

    if (data.reimbursementID != null) {
      return data.reimbursement.accountName;
    }

    if (data.salarySlipID != null) {
      return data.salarySlip.name;
    }

    if (data.loanID != null) {
      return data.loan.creditorName;
    }
  }

  getProjectName(data: any) {
    if (data.purchaseID != null) {
      return data.purchase.projectName;
    }

    if (data.expenseID != null) {
      return data.expense.invoiceName;
    }

    if (data.reimbursementID != null) {
      return data.reimbursement.projectName;
    }

    if (data.salarySlipID != null) {
      return 'PUSAT';
    }

    if (data.loanID != null) {
      return data.loan.description;
    }
  }

  getDocumentName(data: any) {
    if (data.purchaseID != null) {
      return data.purchase.purchaseOrderName;
    }

    if (data.expenseID != null) {
      return data.expense.description;
    }

    if (data.reimbursementID != null) {
      return data.reimbursement.name;
    }

    if (data.salarySlipID != null) {
      return `Salary for ${data.salarySlip.name} ${data.salarySlip.month} ${data.salarySlip.year}`;
    }
  }

  private processSummaries(data: any) {
    this.bankAccountSummaries = data.bankAccounts.map((bankAccount: any) => {
      const payments = data.data.filter(
        (payment: any) => payment.bankAccountID === bankAccount.id
      );

      const incomingInterpayments = data.interpayments.filter(
        (ip: any) => ip.bankAccountIDDestination === bankAccount.id
      );

      const outgoingInterpayments = data.interpayments.filter(
        (ip: any) => ip.bankAccountIDOrigin === bankAccount.id
      );

      const totalAmount = payments.reduce(
        (sum: number, payment: any) => sum + payment.amount,
        0
      );

      const hasActivities =
        payments.length > 0 ||
        incomingInterpayments.length > 0 ||
        outgoingInterpayments.length > 0;

      return {
        id: bankAccount.id,
        bankName: bankAccount.bankName,
        bankAccountName: bankAccount.bankAccountName,
        bankAccountNumber: bankAccount.bankAccountNumber,
        paymentCount: payments.length,
        incomingCount: incomingInterpayments.length,
        outgoingCount: outgoingInterpayments.length,
        totalAmount,
        hasActivities,
      };
    });

    // Auto-select first account with activities, or first account
    const accountWithActivities = this.bankAccountSummaries.find(
      (acc) => acc.hasActivities
    );
    if (accountWithActivities) {
      this.selectAccount(accountWithActivities);
    } else if (this.bankAccountSummaries.length > 0) {
      // this.selectAccount(this.bankAccountSummaries[0]);
    }
  }

  selectAccount(account: BankAccountSummary) {
    if (account.hasActivities === false) return;
    this.selectedAccount = account;
    this.selectedAmount = 0;
    this.selectedPayments = [];
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  getAbbreviatedBankName(bankName: string): string {
    // Extract first letters or short name
    if (bankName.includes('Bank Central Asia')) return 'BBCA';
    if (bankName.includes('Bank Rakyat Indonesia')) return 'BBRI';
    if (bankName.includes('Mandiri')) return 'BMRI';
    if (bankName.includes('Bank Tabungan Negara')) return 'BBTN';
    return bankName
      .split(' ')
      .map((word) => word[0])
      .join('')
      .substring(0, 3);
  }

  viewAccountDetails(account: BankAccountSummary) {
    const bankAccountData = this.rawData.bankAccounts.find(
      (ba: any) => ba.id === account.id
    );
    const payments = this.rawData.data.filter(
      (payment: any) => payment.bankAccountID === account.id
    );
    const incomingInterpayments = this.rawData.interpayments.filter(
      (ip: any) => ip.bankAccountIDDestination === account.id
    );
    const outgoingInterpayments = this.rawData.interpayments.filter(
      (ip: any) => ip.bankAccountIDOrigin === account.id
    );

    this.dialog.open(CalendarDayViewComponent, {
      data: {
        bankAccount: bankAccountData,
        payments: payments,
        incomingInterpayments: incomingInterpayments,
        outgoingInterpayments: outgoingInterpayments,
      },
      width: '600px',
    });
  }

  getTotalDailyAmount(): number {
    return this.bankAccountSummaries.reduce(
      (sum, account) => sum + account.totalAmount,
      0
    );
  }

  get totalAmount(): number {
    if (this.selectedAccount == null) return 0;
    return this.selectedAccount.totalAmount;
  }

  get canConfirm() {
    // Check if all selected isApprove = False and isDelete = False
    console.log(this.selectedPayments);
    return this.payments
      .filter((x: any) => this.selectedPayments.includes(x.id))
      .every(
        (payment: any) =>
          payment.isApprove === false && payment.isDelete === false
      );
  }

  selectAllPayments() {
    if (this.selectedAccount == null) return;

    this.paymentSelection?.selectAll();
    this.selectedAmount = this.totalAmount;
    this.selectedPayments = this.payments
      .filter((x: any) => x.bankAccountID == this.selectedAccount!.id)
      .map((payment: any) => payment.id);
  }

  getAccountsWithActivities(): BankAccountSummary[] {
    return this.bankAccountSummaries.filter((acc) => acc.hasActivities);
  }

  onValueSelected(event: MatSelectionListChange) {
    console.log(event.source.selectedOptions);
    this.selectedPayments = event.source.selectedOptions.selected.map((x) => {
      return x.value;
    });

    // I want to have the total amount from rawData.data where the id is included in the MatSelectionList value
    this.selectedAmount = this.rawData.data
      .filter((x: any) => {
        return this.selectedPayments.includes(x.id);
      })
      .reduce((a: any, b: any) => {
        return a + b.amount;
      }, 0);
  }

  getPaymentText() {
    if (this.selectedAccount == null) return;

    const formatCurrency = (amount: number): string => {
      return new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    };

    const paymentLines = this.payments
      .map((x: any, index: number) => {
        return `  • ${this.getAccountName(x)} Rp. ${formatCurrency(
          x.amount
        )} ${this.getDocumentName(x)}`;
      })
      .join('\n');

    const interpaymentLines = this.interpayments
      .map((x: any) => {
        return `  • Interpayment to ••••${x.destinationBankAccountNumber.slice(
          -4
        )} Rp. ${formatCurrency(x.amount)}`;
      })
      .join('\n');

    const textToCopy = `*Pembayaran dari rekening ${this.selectedAccount.bankAccountNumber}*\n${paymentLines}\n${interpaymentLines}`;
    this.clipboard.copy(textToCopy);

    // Optional: Show success message
    this.snackBar.open('Payment text copied to clipboard!', 'Close', {
      duration: 2000,
    });
  }

  confirm() {
    if (this.selectedAccount == null) return;
    if (this.selectedPayments.length == 0) return;

    this.dialog
      .open(CalendarPaymentConfirmComponent, {
        data: {
          bankAccount: this.selectedAccount,
          payments: this.selectedPayments,
        },
      })
      .afterClosed()
      .subscribe((result) => {
        if (result == true) {
          this.apiService
            .post(
              'outgoing-payments/approve/bulk',
              this.selectedPayments.map((payment: any) => {
                return payment;
              })
            )
            .subscribe({
              next: (_) => {
                this.snackBar.open(
                  'Payment has been approved successfully.',
                  'Close',
                  {
                    duration: 3000,
                  }
                );
              },
              error: (error) => {
                this.snackBar.open(error.error.detail, 'Close', {
                  duration: 3000,
                });
              },
            });
        }
      });
  }

  reject() {
    if (this.selectedAccount == null) return;
    if (this.selectedPayments.length == 0) return;

    this.dialog
      .open(CalendarPaymentRejectComponent, {
        data: {
          bankAccount: this.selectedAccount,
          payments: this.selectedPayments,
        },
      })
      .afterClosed()
      .subscribe((result) => {
        if (result == true) {
          this.apiService
            .post(
              'outgoing-payments/reject/bulk',
              this.selectedPayments.map((payment: any) => {
                return payment;
              })
            )
            .subscribe({
              next: (_) => {
                this.snackBar.open(
                  'Payment has been approved successfully.',
                  'Close',
                  {
                    duration: 3000,
                  }
                );
              },
              error: (error) => {
                this.snackBar.open(error.error.detail, 'Close', {
                  duration: 3000,
                });
              },
            });
        }
      });
  }
}
