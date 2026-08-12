import { Component, Inject, ViewChild, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CanDirective } from '../../../directives/can.directive';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiService } from '../../../services/api.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
} from '@angular/material/dialog';
import { CalendarDayViewComponent } from '../calendar-day-view/calendar-day-view.component';
import { MatList, MatListModule } from '@angular/material/list';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Clipboard } from '@angular/cdk/clipboard';
import { CalendarPaymentConfirmComponent } from '../calendar-payment-confirm/calendar-payment-confirm.component';
import { CalendarPaymentRejectComponent } from '../calendar-payment-reject/calendar-payment-reject.component';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DateSelectorComponent } from '../../../components/date-selector/date-selector.component';
import { PurchaseViewComponent } from '../../purchase/purchase-view/purchase-view.component';
import { ReimbursementViewComponent } from '../../reimbursement/reimbursement-view/reimbursement-view.component';
import { ExpenseViewComponent } from '../../expense/expense-view/expense-view.component';
import { LoansViewComponent } from '../../loans/loans-view/loans-view.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SalarySlipViewComponent } from '../../salary-slip/salary-slip-view/salary-slip-view.component';

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
  openingBalance: number;
  closingBalance: number;
  estimatedAdminFee: number;
  interbankTransferCount: number;
  sameBankTransferCount: number;
  unknownDestinationCount: number;
  /** Nilai transfer masuk & keluar pada hari itu. */
  incomingAmount: number;
  outgoingAmount: number;
  /** Pembayaran yang belum disetujui pada hari itu. */
  pendingCount: number;
}

@Component({
  selector: 'app-calendar-day-selector',
  imports: [
    CanDirective,
    TranslatePipe,
    CommonModule,
    MatDialogModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatListModule,
    MatCheckboxModule,
    MatTooltipModule,
  ],
  templateUrl: './calendar-day-selector.component.html',
  styleUrl: './calendar-day-selector.component.scss',
  standalone: true,
})
export class CalendarDaySelectorComponent {
  private readonly translate = inject(TranslateService);
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
    private decimalPipe: DecimalPipe,
  ) {}

  @ViewChild('menuTrigger') menuTrigger: MatMenuTrigger | undefined;

  contextMenuPosition = { x: '0px', y: '0px' };

  isLoading: boolean = false;
  bankAccountSummaries: BankAccountSummary[] = [];
  selectedPayments: number[] = [];

  /*
   * `payments` dan `interpayments` dihitung saat sumbernya berubah, bukan
   * lewat getter.
   *
   * Sebagai getter, kedua `.filter()` berjalan ulang setiap kali templat
   * membacanya, dan templat membacanya beberapa kali per putaran change
   * detection — termasuk saat menggulir dan mengetik di halaman lain pada
   * shell yang sama.
   *
   * Sumbernya dua: rekening yang dipilih dan data mentah hari itu. Keduanya
   * dipasang lewat setter supaya turunannya mustahil tertinggal, tanpa kunci
   * cache yang bisa basi.
   */
  private _selectedAccount: BankAccountSummary | null = null;
  private _rawData: any;

  payments: any[] = [];

  /**
   * Transfer antar rekening pada hari itu — masuk maupun keluar.
   *
   * Sebelumnya hanya yang keluar (`Origin`) yang disaring, sehingga dana
   * masuk tidak pernah tampil padahal ikut menentukan saldo.
   */
  interpayments: any[] = [];

  get selectedAccount(): BankAccountSummary | null {
    return this._selectedAccount;
  }

  set selectedAccount(nilai: BankAccountSummary | null) {
    this._selectedAccount = nilai;
    this.hitungTurunan();
  }

  get rawData(): any {
    return this._rawData;
  }

  set rawData(nilai: any) {
    this._rawData = nilai;
    this.hitungTurunan();
  }

  private hitungTurunan(): void {
    const akun = this._selectedAccount;
    if (akun == null) {
      this.payments = [];
      this.interpayments = [];
      return;
    }
    this.payments = (this._rawData?.data ?? []).filter(
      (payment: any) => payment.bankAccountID === akun.id,
    );
    this.interpayments = (this._rawData?.interpayments ?? []).filter(
      (ip: any) =>
        ip.bankAccountIDOrigin === akun.id ||
        ip.bankAccountIDDestination === akun.id,
    );
  }
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
          '0',
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

  /** Dua rekening dianggap sebank bila nama banknya sama. */
  private isSameBank(origin?: string, destination?: string): boolean {
    if (!origin || !destination) return false;
    return origin.trim().toLowerCase() === destination.trim().toLowerCase();
  }

  /** Arah transfer terhadap rekening yang sedang dilihat. */
  isIncomingInterpayment(ip: any): boolean {
    return ip?.bankAccountIDDestination === this.selectedAccount?.id;
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
        (payment: any) => payment.bankAccountID === bankAccount.id,
      );

      const incomingInterpayments = data.interpayments.filter(
        (ip: any) => ip.bankAccountIDDestination === bankAccount.id,
      );

      const outgoingInterpayments = data.interpayments.filter(
        (ip: any) => ip.bankAccountIDOrigin === bankAccount.id,
      );

      // Saldo dari server sudah memperhitungkan pembayaran yang disetujui,
      // sehingga hanya yang BELUM disetujui yang boleh dikurangkan lagi —
      // kalau tidak, nilainya terhitung dua kali dan saldo tampak kurang.
      const pendingPayments = payments.filter((p: any) => !p.isApprove);

      const totalAmount = pendingPayments.reduce(
        (sum: number, payment: any) => sum + (Number(payment.amount) || 0),
        0,
      );

      // Transfer antar rekening ikut mengubah saldo: yang keluar mengurangi,
      // yang masuk menambah. Sebelumnya hanya jumlahnya yang dihitung untuk
      // penanda aktivitas, sehingga saldo akhir bisa tampak minus padahal
      // dana masuk dari rekening sendiri.
      // Nilainya hanya untuk ditampilkan, TIDAK dikurangkan/ditambahkan lagi
      // ke saldo: transfer antar rekening dicatat langsung sebagai mutasi
      // (tabelnya tidak punya status persetujuan), sehingga saldo dari server
      // sudah memuatnya.
      const incomingAmount = incomingInterpayments.reduce(
        (sum: number, ip: any) => sum + (Number(ip.amount) || 0),
        0,
      );

      const outgoingAmount = outgoingInterpayments.reduce(
        (sum: number, ip: any) => sum + (Number(ip.amount) || 0),
        0,
      );

      const hasActivities =
        payments.length > 0 ||
        incomingInterpayments.length > 0 ||
        outgoingInterpayments.length > 0;

      const openingBalance =
        bankAccount.openingBalance ?? bankAccount.balance ?? 0;
      // Biaya transfer hanya dikenakan pada pengiriman ke bank LAIN;
      // transfer ke rekening di bank yang sama tidak berbiaya. Tujuan yang
      // tidak diketahui dihitung berbiaya (perkiraan teraman), mengikuti
      // aturan yang dipakai server.
      const feePerTransfer = this.rawData?.interbankTransferFee ?? 2500;
      const chargedTransfers = pendingPayments.filter(
        (p: any) =>
          !this.isSameBank(bankAccount.bankName, p.destinationBankName),
      );
      const estimatedAdminFee = chargedTransfers.length * feePerTransfer;

      // Spanduk memakai angka yang sama dengan biaya di atas. Hitungan dari
      // server mencakup pembayaran yang sudah disetujui dan tidak selalu
      // mengenali bank tujuan, sehingga bisa berbeda dengan biaya yang
      // benar-benar akan timbul.
      const chargedCount = chargedTransfers.length;
      const freeCount = pendingPayments.length - chargedCount;

      return {
        id: bankAccount.id,
        bankName: bankAccount.bankName,
        bankAccountName: bankAccount.bankAccountName,
        bankAccountNumber: bankAccount.bankAccountNumber,
        paymentCount: payments.length,
        // Yang masih akan dijalankan — dipakai spanduk biaya transfer.
        pendingCount: pendingPayments.length,
        incomingCount: incomingInterpayments.length,
        outgoingCount: outgoingInterpayments.length,
        totalAmount,
        hasActivities,
        openingBalance,
        estimatedAdminFee,
        incomingAmount,
        outgoingAmount,
        // Saldo dari server sudah memuat seluruh mutasi yang benar-benar
        // terjadi (termasuk transfer antar rekening dan pembayaran yang sudah
        // disetujui). Yang tersisa dikurangkan di sini hanyalah pembayaran
        // yang belum disetujui beserta biaya transfernya.
        closingBalance: openingBalance - totalAmount - estimatedAdminFee,
        interbankTransferCount: chargedCount,
        sameBankTransferCount: freeCount,
        unknownDestinationCount: bankAccount.unknownDestinationCount ?? 0,
      };
    });

    // Auto-select first account with activities, or first account
    const accountWithActivities = this.bankAccountSummaries.find(
      (acc) => acc.hasActivities,
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
      (ba: any) => ba.id === account.id,
    );
    const payments = this.rawData.data.filter(
      (payment: any) => payment.bankAccountID === account.id,
    );
    const incomingInterpayments = this.rawData.interpayments.filter(
      (ip: any) => ip.bankAccountIDDestination === account.id,
    );
    const outgoingInterpayments = this.rawData.interpayments.filter(
      (ip: any) => ip.bankAccountIDOrigin === account.id,
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
      0,
    );
  }

  get totalAmount(): number {
    if (this.selectedAccount == null) return 0;
    return this.selectedAccount.totalAmount;
  }

  get openingBalance(): number {
    return this.selectedAccount?.openingBalance ?? 0;
  }

  get adminFee(): number {
    return this.selectedAccount?.estimatedAdminFee ?? 0;
  }

  get closingBalance(): number {
    return this.selectedAccount?.closingBalance ?? 0;
  }

  /** fee charged per transfer to a different bank (from backend) */
  get interbankFee(): number {
    return this.rawData?.interbankTransferFee ?? 2500;
  }

  /** true when the day's payments exceed the available balance */
  get isShortfall(): boolean {
    return this.closingBalance < 0;
  }

  get canConfirm() {
    return this.payments
      .filter((x: any) => this.selectedPayments.includes(x.id))
      .every(
        (payment: any) =>
          payment.isApprove === false && payment.isDelete === false,
      );
  }

  /** whether every visible payment is currently ticked */
  get allSelected(): boolean {
    return (
      this.payments.length > 0 &&
      this.payments.every((p: any) => this.selectedPayments.includes(p.id))
    );
  }

  selectAllPayments() {
    if (this.selectedAccount == null) return;

    if (this.allSelected) {
      // toggle off
      this.selectedPayments = [];
    } else {
      this.selectedPayments = this.payments.map((payment: any) => payment.id);
    }
    this.recomputeSelectedAmount();
  }

  getAccountsWithActivities(): BankAccountSummary[] {
    return this.bankAccountSummaries.filter((acc) => acc.hasActivities);
  }

  isSelected(id: number): boolean {
    return this.selectedPayments.includes(id);
  }

  /** recompute the selected total from the current id list */
  private recomputeSelectedAmount() {
    this.selectedAmount = this.rawData.data
      .filter((x: any) => this.selectedPayments.includes(x.id))
      .reduce((a: any, b: any) => a + b.amount, 0);
  }

  /** checkbox toggle — this is the ONLY thing that affects the calculation */
  togglePayment(id: number, checked: boolean) {
    if (checked) {
      if (!this.selectedPayments.includes(id)) {
        this.selectedPayments = [...this.selectedPayments, id];
      }
    } else {
      this.selectedPayments = this.selectedPayments.filter((x) => x !== id);
    }
    this.recomputeSelectedAmount();
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
          x.amount,
        )} ${this.getDocumentName(x)}`;
      })
      .join('\n');

    const interpaymentLines = this.interpayments
      .map((x: any) => {
        return `  • Interpayment to ••••${x.destinationBankAccountNumber.slice(
          -4,
        )} Rp. ${formatCurrency(x.amount)}`;
      })
      .join('\n');

    const textToCopy = `*Pembayaran dari rekening ${this.selectedAccount.bankAccountNumber}*\n${paymentLines}\n${interpaymentLines}`;
    this.clipboard.copy(textToCopy);

    // Optional: Show success message
    this.snackBar.open(
      this.translate.instant('notify.copied'), 'Close', {
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
              }),
            )
            .subscribe({
              next: (_) => {
                this.snackBar.open(
      this.translate.instant('notify.approveSuccess'),
                  'Close',
                  {
                    duration: 3000,
                  },
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
              }),
            )
            .subscribe({
              next: (_) => {
                this.snackBar.open(
      this.translate.instant('notify.approveSuccess'),
                  'Close',
                  {
                    duration: 3000,
                  },
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

  onRightClick(event: MouseEvent, item: any): void {
    event.preventDefault(); // Prevent default browser context menu

    this.menuTrigger?.openMenu();
  }

  moveDate(p: number) {
    const index = this.rawData.data.findIndex((x: any) => x.id == p);
    if (index != -1) {
      const date = new Date(this.rawData.data[index].date);
      this.dialog
        .open(DateSelectorComponent, {
          data: {
            id: p,
            date: date,
            minimumDate: date,
            // maximum date should be minimumDate + 30
            maximumDate: new Date(date.getTime() + 30 * 24 * 60 * 60 * 1000),
          },
        })
        .afterClosed()
        .subscribe((data) => {
          if (data == 'moved') {
            // remove
            this.rawData.data.splice(index, 1);
          }
        });
    }
  }

  viewDocument(id: number) {
    const index = this.rawData.data.findIndex((x: any) => x.id == id);
    if (index != -1) {
      const data = this.rawData.data[index];
      if (data.purchaseID != null) {
        this.dialog.open(PurchaseViewComponent, {
          data: {
            id: data.purchaseID,
          },
        });
      }

      if (data.reimbursementID != null) {
        this.dialog.open(ReimbursementViewComponent, {
          data: {
            id: data.reimbursementID,
          },
        });
      }

      if (data.expenseID != null) {
        this.dialog.open(ExpenseViewComponent, {
          data: {
            id: data.expenseID,
          },
        });
      }

      if (data.loanID != null) {
        this.dialog.open(LoansViewComponent, {
          data: {
            id: data.loanID,
          },
        });
      }

      if (data.salarySlipID != null) {
        this.dialog.open(SalarySlipViewComponent, {
          data: {
            id: data.salarySlipID,
          },
        });
      }
    }
  }
}
