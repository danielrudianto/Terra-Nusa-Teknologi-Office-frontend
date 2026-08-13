import { Component, Inject, inject } from '@angular/core';
import { ServerMessageService } from 'src/app/services/server-message.service';
import { TranslateService } from '@ngx-translate/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { ApiService } from '../../../../services/api.service';
import { CommonModule } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-expense-create-administration',
  providers: [provideNgxMask()],
  imports: [
    MatIconModule,
    TranslatePipe,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatInputModule,
    MatDialogModule,
    MatSelectModule,
    NgxMaskDirective,
    MatButtonModule,
  ],
  templateUrl: './expense-create-administration.component.html',
  styleUrl: './expense-create-administration.component.scss',
})
export class ExpenseCreateAdministrationComponent {
  private readonly serverMessage = inject(ServerMessageService);
  private readonly translate = inject(TranslateService);
  bankAccounts: any[] = [];
  isSubmitting: boolean = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any[],
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialogRef<ExpenseCreateAdministrationComponent>,
  ) {
    this.bankAccounts = data;
  }

  formGroup: FormGroup = new FormGroup({
    expenseOpponentID: new FormControl(2, Validators.required),
    date: new FormControl('', Validators.required),
    dpp: new FormControl(0, [Validators.required, Validators.min(1)]),
    pphPercentage: new FormControl(0, Validators.required),
    pphTaxObject: new FormControl(null),
    bankAccountID: new FormControl('', Validators.required),
    bankAccountName: new FormControl(
      'PT. Alpha Konstruksi Nusantara',
      Validators.required,
    ),
    bankAccountNumber: new FormControl('00000000', Validators.required),
    bankName: new FormControl(
      'PT. Bank Rakyat Indonesia, Tbk.',
      Validators.required,
    ),
    purchaseType: new FormControl('5.1.9', Validators.required),
    paymentMethod: new FormControl('bank', Validators.required),
  });

  private getMonthName(month: number) {
    const monthNames = [
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember',
    ];
    return monthNames[month - 1];
  }

  private formatFormData() {
    if (this.formGroup.invalid) return;

    const bankIndex = this.bankAccounts.findIndex(
      (x) => x.id == this.formGroup.value.bankAccountID,
    );

    if (bankIndex != -1) {
      const bankAccountNumber = this.bankAccounts[bankIndex].bankAccountNumber;
      // take the last 4 digits of the bank account number
      const last4Digits = bankAccountNumber.slice(-4);

      const date = new Date(this.formGroup.value.date);
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const description = `ADM${last4Digits}/${day
        .toString()
        .padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;

      const dateFormatted = `${date.getFullYear()}-${String(
        date.getMonth() + 1,
      ).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

      return {
        invoiceName: description,
        receiptName: '',
        opponentID: this.formGroup.value.expenseOpponentID,
        date: dateFormatted,
        dueDate: dateFormatted,
        purchaseType: this.formGroup.value.purchaseType,
        description: `Biaya administrasi tanggal ${day} ${this.getMonthName(
          month,
        )} ${year}`,
        dpp: this.formGroup.value.dpp,
        pbbkb: 0,
        pphCode: null,
        pphPercentage: 0,
        pphTaxObject: null,
        bankName: this.formGroup.value.bankName,
        bankAccountName: this.formGroup.value.bankAccountName,
        bankAccountNumber: this.formGroup.value.bankAccountNumber,
        paymentMethod: this.formGroup.value.paymentMethod,
      };
    } else {
      return;
    }
  }

  onSubmit() {
    this.isSubmitting = true;
    const formattedData = this.formatFormData();
    if (formattedData == undefined) return;
    this.apiService
      .post('expenses', formattedData)
      .subscribe({
        next: (result: any) => {
          const expenseID = result.expense_id;
          const paymentData = {
            purchaseID: null,
            expenseID: expenseID,
            reimbursementID: null,
            salarySlipID: null,
            date: formattedData.date,
            amount: formattedData.dpp,
            bankAccountID: this.formGroup.value.bankAccountID,
            status: 'ready',
          };
          this.apiService
            .post('outgoing-payments', paymentData)
            .subscribe({
              next: (_) => {
                this.snackBar.open(
      this.translate.instant('notify.createSuccess'), 'Close', {
                  duration: 3000,
                });
                this.dialog.close();
              },
              error: (error) => {
                this.snackBar.open(
          this.serverMessage.terjemahkan(error), 'Close', {
                  duration: 3000,
                });
              },
            })
            .add(() => {
              this.isSubmitting = false;
            });
        },
      })
      .add(() => {
        this.isSubmitting = false;
      });
  }
}
