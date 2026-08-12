import { CommonModule } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { Component, Inject, inject } from '@angular/core';
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
import { MatSnackBar } from '@angular/material/snack-bar';
import { PaymentSlipHelper } from 'src/app/helpers/payment-slip.helper';
import { ApiService } from 'src/app/services/api.service';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-expense-payment-create',
  providers: [provideNgxMask()],
  templateUrl: './expense-payment-create.component.html',
  styleUrl: './expense-payment-create.component.scss',
  standalone: true,
  imports: [
    NgxMaskDirective,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatSelectModule,
    TranslatePipe,
  ],
})
export class ExpensePaymentCreateComponent {
  private readonly translate = inject(TranslateService);
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private apiService: ApiService,
    private dialog: MatDialogRef<ExpensePaymentCreateComponent>,
    private snackBar: MatSnackBar,
  ) {}

  isLoading: boolean = false;
  isSubmitting: boolean = false;
  bankAccounts: any[] = [];
  payments: any[] = [];
  totalAmount: number = 0;

  metaFormGroup: FormGroup = new FormGroup({
    date: new FormControl('', Validators.required),
    dueDate: new FormControl(''),
    createdAt: new FormControl('', Validators.required),
    opponentName: new FormControl('', Validators.required),
    opponentDescription: new FormControl('', Validators.required),
    invoiceName: new FormControl('', Validators.required),
    taxInvoiceName: new FormControl(''),
    paymentHistory: new FormControl(0, Validators.required),
    bankAccountName: new FormControl(''),
    bankAccountNumber: new FormControl(''),
    bankName: new FormControl(''),
  });

  valueFormGroup: FormGroup = new FormGroup({
    dpp: new FormControl(0, [Validators.required, Validators.min(0.01)]),
    pph: new FormControl(0, Validators.required),
    pphCode: new FormControl(''),
    pphTaxObject: new FormControl(''),
    pphPercentage: new FormControl(0, Validators.required),
    pbbkb: new FormControl('', Validators.required),
    total: new FormControl('', Validators.required),
  });

  formGroup: FormGroup = new FormGroup({
    dueDate: new FormControl(''),
    date: new FormControl('', Validators.required),
    bankAccountID: new FormControl('', Validators.required),
    amount: new FormControl(0, [Validators.required, Validators.min(0.01)]),
  });

  ngOnInit(): void {
    this.fetchBankData();
    this.fetchData();
  }

  fetchBankData() {
    this.apiService.get('banks/all', {}).subscribe({
      next: (data: any) => {
        this.bankAccounts = data;
      },
      error: (error) => {
        this.snackBar.open(
      this.translate.instant('notify.loadFailed'), 'Close', {
          duration: 3000,
        });
        this.dialog.close();
      },
    });
  }

  fetchData() {
    this.apiService
      .get('expenses/' + this.data.expenseID + '/payments', {})
      .subscribe({
        next: (data: any) => {
          this.metaFormGroup.patchValue({
            // transform to DD MMMM yyyy format
            createdAt: `${new Date(data.expense.createdAt).toLocaleDateString(
              'id-ID',
              {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              },
            )}`,
            date: new Date(data.expense.date).toLocaleDateString('id-ID', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            }),
            dueDate: new Date(data.expense.dueDate).toLocaleDateString(
              'id-ID',
              {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              },
            ),
            opponentName: data.expense.expense_opponent_name,
            opponentDescription: data.expense.expense_opponent_description,
            invoiceName: data.expense.invoiceName,
            taxInvoiceName:
              data.expense.taxInvoiceName == null ||
              data.expense.taxInvoiceName == ''
                ? 'N/A'
                : data.expense.taxInvoiceName,
            paymentHistory: data.payments.length,
            bankAccountName: data.expense.bankAccountName,
            bankAccountNumber: data.expense.bankAccountNumber,
            bankName: data.expense.bankName,
          });

          this.valueFormGroup.patchValue({
            dpp: data.expense.dpp,
            pbbkb: data.expense.pbbkb,
            pph: (data.expense.pphPercentage * data.expense.dpp) / 100,
            pphCode: data.expense.pphCode,
            pphTaxObject: data.expense.pphTaxObject,
            total: (
              data.expense.dpp +
              data.expense.pbbkb -
              (data.expense.pphPercentage * data.expense.dpp) / 100
            ).toFixed(2),
          });

          // set form array payments
          this.payments = data.payments.map((payment: any) => {
            const bankIndex = this.bankAccounts.findIndex(
              (x) => x.id == payment.bankAccountID,
            );
            return {
              id: payment.id,
              date: payment.date,
              amount: payment.amount,
              bankAccountID: payment.bankAccountID,
              bankAccountName:
                this.bankAccounts[bankIndex]?.bankAccountName || '',
              bankAccountNumber:
                this.bankAccounts[bankIndex]?.bankAccountNumber || '',
              bankName: this.bankAccounts[bankIndex]?.bankName || '',
              isApprove: payment.isApprove,
              isDelete: payment.isDelete,
            };
          });

          // set the maximum amount of dpp + ppn + pbbkb + otherValue - sum(data.payments.amount)
          const totalAmount =
            data.expense.dpp -
            (data.expense.pphPercentage * data.expense.dpp) / 100 +
            data.expense.pbbkb -
            data.payments
              .filter((x: any) => x.isDelete == false)
              .reduce((sum: number, payment: any) => {
                return sum + payment.amount;
              }, 0);

          // set validators maximum amount
          this.formGroup
            .get('amount')
            ?.setValidators([
              Validators.required,
              Validators.min(1),
              Validators.max(totalAmount),
            ]);

          this.totalAmount = totalAmount;
        },
        error: (error) => {
          console.error('Error fetching purchase data:', error);
          this.snackBar.open(
      this.translate.instant('notify.loadFailed'), 'Close', {
            duration: 3000,
          });
          this.dialog.close();
        },
      })
      .add(() => {
        this.isLoading = false;
      });
  }

  fullAmount() {
    // set the amount to the total amount
    this.formGroup.get('amount')?.setValue(this.totalAmount);
  }

  onSubmit() {
    this.isSubmitting = true;

    const date = new Date(this.formGroup.value.date);
    const formattedDate = `${date.getFullYear()}-${String(
      date.getMonth() + 1,
    ).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    this.isSubmitting = false;
    this.apiService
      .post('outgoing-payments', {
        purchaseID: null,
        expenseID: this.data.expenseID,
        reimbursementID: null,
        date: formattedDate,
        amount: this.formGroup.value.amount,
        bankAccountID: this.formGroup.value.bankAccountID,
      })
      .subscribe({
        next: (data) => {
          // create pdf document
          // PaymentSlipHelper.generatePurchasePaymentSlipPDF({
          //   invoiceName: this.metaFormGroup.value.invoiceName,
          //   taxInvoiceName: this.metaFormGroup.value.taxInvoiceName,
          //   purchaseOrderName: this.metaFormGroup.value.purchaseOrderName,
          //   projectName: this.metaFormGroup.value.projectName,
          //   supplierName: this.metaFormGroup.value.supplierName,
          //   supplierAddress: this.metaFormGroup.value.supplierAddress,
          //   date: this.metaFormGroup.value.date,
          //   paymentDate: formattedDate,
          //   dueDate: this.metaFormGroup.value.dueDate,
          //   createdAt: this.metaFormGroup.value.createdAt,
          //   dpp: this.valueFormGroup.value.dpp,
          //   ppn: 0,
          //   pphCode: this.valueFormGroup.value.pphCode,
          //   pphTaxObject: this.valueFormGroup.value.pphTaxObject,
          //   pphPercentage: this.valueFormGroup.value.pphPercentage,
          //   pbbkb: this.valueFormGroup.value.pbbkb,
          //   otherValue: 0,
          //   otherValueNote: '',
          //   amount: this.formGroup.value.amount,
          //   payments: this.payments.map((x) => {
          //     return {
          //       id: x.id,
          //       date: x.date,
          //       amount: x.amount,
          //       bankAccountID: x.bankAccountID,
          //       bankAccountName: x.bankAccountName,
          //       bankAccountNumber: x.bankAccountNumber,
          //       bankName: x.bankName,
          //       isDelete: x.isDelete,
          //       isApprove: x.isApprove,
          //     };
          //   }),
          //   bankAccountName: this.metaFormGroup.value.bankAccountName,
          //   bankAccountNumber: this.metaFormGroup.value.bankAccountNumber,
          //   bankName: this.metaFormGroup.value.bankName,
          //   bankAccountNameOrigin: this.bankAccounts.find(
          //     (x) => x.id === this.formGroup.value.bankAccountID
          //   )?.bankAccountName,
          //   bankAccountNumberOrigin: this.bankAccounts.find(
          //     (x) => x.id === this.formGroup.value.bankAccountID
          //   )?.bankAccountNumber,
          //   bankNameOrigin: this.bankAccounts.find(
          //     (x) => x.id === this.formGroup.value.bankAccountID
          //   )?.bankName,
          //   total: this.valueFormGroup.value.total,
          // });
          this.snackBar.open(
      this.translate.instant('notify.createSuccess'), 'Close', {
            duration: 3000,
          });
          this.dialog.close();
        },
        error: (error) => {
          this.snackBar.open(
      this.translate.instant('notify.createFailed'), 'Close', {
            duration: 3000,
          });
        },
      })
      .add(() => {
        this.isSubmitting = false;
      });
  }

  onClose() {
    if (this.isSubmitting) {
      return;
    }
    this.dialog.close();
  }
}
