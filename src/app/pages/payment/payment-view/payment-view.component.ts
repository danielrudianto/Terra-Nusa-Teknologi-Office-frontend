import { Component, Inject, inject } from '@angular/core';
import { ServerMessageService } from 'src/app/services/server-message.service';
import { AuditTrailComponent } from 'src/app/components/audit-trail/audit-trail.component';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { AccountService } from '../../../services/account.service';
import { DeleteConfirmationComponent } from '../../../components/delete-confirmation/delete-confirmation.component';
import { ApiService } from '../../../services/api.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { provideNgxMask } from 'ngx-mask';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { DialogGeserDirective } from '../../../directives/dialog-geser.directive';

@Component({
  selector: 'app-payment-view',
  providers: [provideNgxMask()],
  imports: [
    AuditTrailComponent,
    MatDialogModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    TranslatePipe,
    DialogGeserDirective,
  ],
  templateUrl: './payment-view.component.html',
  styleUrl: './payment-view.component.scss',
})
export class PaymentViewComponent {
  private readonly serverMessage = inject(ServerMessageService);
  private readonly account = inject(AccountService);
  private readonly dialog = inject(MatDialog);
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private datePipe: DatePipe,
    private translate: TranslateService,
    private dialogRef: MatDialogRef<PaymentViewComponent>,
  ) {}

  /** Menghapus pembayaran HANYA untuk pemilik usaha (level 5). */
  get bolehHapus(): boolean {
    return Number(this.account.user?.['authenticationLevel']) >= 5;
  }

  menghapus = false;

  /**
   * Hapus pembayaran ini — lunak, di sisi server.
   *
   * Dikonfirmasi lebih dahulu; barisnya tidak benar-benar dibuang, hanya
   * ditandai terhapus dan dikeluarkan dari penjumlahan status lunas. Dialog
   * ditutup dengan `true` supaya daftarnya memuat ulang.
   */
  hapus(): void {
    this.dialog
      .open(DeleteConfirmationComponent, {
        data: {
          title: this.translate.instant('paymentView.hapusJudul'),
          prompt: this.translate.instant('paymentView.hapusKonfirmasi'),
        },
      })
      .afterClosed()
      .subscribe((ya) => {
        if (ya !== true) return;
        this.menghapus = true;
        this.apiService.delete(`outgoing-payments/${this.data.id}`).subscribe({
          next: () => {
            this.snackBar.open(
              this.translate.instant('paymentView.hapusBerhasil'),
              'Close',
              { duration: 3000 },
            );
            this.dialogRef.close(true);
          },
          error: (error) => {
            this.menghapus = false;
            this.snackBar.open(
              this.serverMessage.terjemahkan(error),
              'Close',
              { duration: 3000 },
            );
          },
        });
      });
  }

  formGroup: FormGroup = new FormGroup({
    date: new FormControl('', Validators.required),
    amount: new FormControl(0, Validators.required),
    bank_account_name: new FormControl('', Validators.required),
    bank_account_number: new FormControl('', Validators.required),
    bank_name: new FormControl('', Validators.required),
    type: new FormControl(''),
  });

  ngOnInit(): void {
    this.fetchData();
  }

  fetchData() {
    this.apiService.get(`outgoing-payments/${this.data.id}`, {}).subscribe({
      next: (data: any) => {
        this.formGroup.patchValue({
          date: this.datePipe.transform(data.payment.date, 'dd MMMM yyyy'),
          amount: data.payment.amount,
          bank_account_name: data.bankAccount.bankAccountName,
          bank_account_number: data.bankAccount.bankAccountNumber,
          bank_name: data.bankAccount.bankName,
          type:
            data.expense != null
              ? this.translate.instant('paymentView.typeExpense')
              : data.reimbursement != null
                ? this.translate.instant('paymentView.typeReimbursement')
                : data.purchase != null
                  ? this.translate.instant('paymentView.typePurchase')
                  : data.salarySlip != null
                    ? this.translate.instant('paymentView.typeSalary')
                    : this.translate.instant('paymentView.typeLoan'),
        });
      },
      error: (error) => {
        this.snackBar.open(
          this.serverMessage.terjemahkan(error), 'Close', {
          duration: 3000,
        });
      },
    });
  }
}
