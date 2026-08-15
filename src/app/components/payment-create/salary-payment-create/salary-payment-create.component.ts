import { CommonModule } from '@angular/common';
import { ServerMessageService } from 'src/app/services/server-message.service';
import { TranslateService } from '@ngx-translate/core';
import { Component, Inject, inject } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from 'src/app/services/api.service';
import { MatInputModule } from '@angular/material/input';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { TranslatePipe } from '@ngx-translate/core';
import { DialogGeserDirective } from '../../../directives/dialog-geser.directive';

export const amountValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const form = control as FormGroup;

  const netSalary = form.get('netSalary')?.value || 0;
  const payments = form.get('payments')?.value || 0;
  const amount = form.get('amount')?.value || 0;

  const maxAllowed = netSalary - payments;

  if (amount < 0 || amount > maxAllowed) {
    return { amountOutOfRange: true };
  }

  return null;
};

@Component({
  selector: 'app-salary-payment-create',
  standalone: true,
  providers: [provideNgxMask()],
  templateUrl: './salary-payment-create.component.html',
  styleUrl: './salary-payment-create.component.scss',
  imports: [
    NgxMaskDirective,
    MatInputModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    CommonModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatSelectModule,
    TranslatePipe,
    DialogGeserDirective,
  ],
})
export class SalaryPaymentCreateComponent {
  private readonly serverMessage = inject(ServerMessageService);
  private readonly translate = inject(TranslateService);
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { id: number },
    private apiService: ApiService,
    private dialog: MatDialogRef<SalaryPaymentCreateComponent>,
    private snackBar: MatSnackBar,
  ) {}

  formGroup: FormGroup = new FormGroup(
    {
      month: new FormControl('', Validators.required),
      year: new FormControl('', Validators.required),
      date: new FormControl('', Validators.required),
      name: new FormControl('', Validators.required),
      taxCategory: new FormControl('', Validators.required),
      position: new FormControl('', Validators.required),
      department: new FormControl('', Validators.required),
      taxAmount: new FormControl(0, Validators.required),
      grossSalary: new FormControl(0, Validators.required),
      netSalary: new FormControl(0, Validators.required),
      bankAccount: new FormControl('', Validators.required),
      payments: new FormControl(0, [(Validators.required, Validators.min(0))]),
      amount: new FormControl(0, [Validators.min(1)]),
    },
    {
      validators: amountValidator,
    },
  );

  bankAccounts: any[] = [];
  isSubmitting: boolean = false;

  ngOnInit(): void {
    this.apiService.get(`salary-slips/${this.data.id}`, {}).subscribe({
      next: (data: any) => {
        const salarySlip = data.data;
        const payment = data.payments;
        this.formGroup.patchValue(salarySlip);
        const gross =
          salarySlip.basicSalary +
          salarySlip.transportationAllowanceRate *
            salarySlip.transportationAllowanceQuantity +
          salarySlip.mealAllowanceRate * salarySlip.mealAllowanceQuantity +
          salarySlip.overtimeRate * salarySlip.overtimeQuantity +
          data.allowances.reduce((a: any, b: any) => {
            return a + b.amount;
          }, 0) -
          data.deductions.reduce((a: any, b: any) => {
            return a + b.amount;
          }, 0);

        const net = gross - salarySlip.taxAmount;

        this.formGroup.patchValue({
          grossSalary: gross,
          netSalary: net,
          payments: payment.reduce((a: any, b: any) => {
            return a + b.amount;
          }, 0),
          amount:
            net -
            payment.reduce((a: any, b: any) => {
              return a + b.amount;
            }, 0),
        });
      },
      error: (error) => {
        this.snackBar.open(
          this.serverMessage.terjemahkan(error), 'Close', {
          duration: 3000,
        });

        this.dialog.close();
      },
    });

    this.fetchBankData();
  }

  fetchBankData() {
    this.apiService.get('banks/all', {}).subscribe({
      next: (data: any) => {
        this.bankAccounts = data;
      },
      error: (error) => {
        console.error('Error fetching bank accounts:', error);
        this.snackBar.open(
      this.translate.instant('notify.loadFailed'), 'Close', {
          duration: 3000,
        });
      },
    });
  }

  submitForm() {
    this.isSubmitting = true;

    const date = new Date(this.formGroup.get('date')?.value);
    const formattedDate = `${date.getFullYear()}-${String(
      date.getMonth() + 1,
    ).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    this.apiService
      .post('outgoing-payments', {
        purchaseID: null,
        expenseID: null,
        reimbursementID: null,
        salarySlipID: this.data.id,
        date: formattedDate,
        amount: this.formGroup.value.amount,
        bankAccountID: this.formGroup.value.bankAccount,
      })
      .subscribe({
        next: () => {
          this.snackBar.open(
      this.translate.instant('notify.createSuccess'), 'Close', {
            duration: 3000,
          });
          this.dialog.close('paid');
        },
        error: (error) => {
          this.snackBar.open(
          this.serverMessage.terjemahkan(error), 'Close', {
            duration: 3000,
          });
        },
      });
  }

  get payment(): number {
    return this.formGroup.get('payments')?.value;
  }

  get maximumPayment(): number {
    return this.formGroup.get('netSalary')?.value - this.payment;
  }
}
