import { Component, Inject, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { ApiService } from '../../../services/api.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-loan-payment-create',
  imports: [
    CommonModule,
    MatIconModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatDatepickerModule,
    MatButtonModule,
    NgxMaskDirective,
    TranslatePipe,
  ],
  providers: [provideNgxMask()],
  templateUrl: './loan-payment-create.component.html',
  styleUrl: './loan-payment-create.component.scss',
})
export class LoanPaymentCreateComponent {
  private readonly translate = inject(TranslateService);
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private apiService: ApiService,
    private dialog: MatDialogRef<LoanPaymentCreateComponent>,
    private snackBar: MatSnackBar,
  ) {}

  isLoading: boolean = false;
  isSubmitting: boolean = false;
  bankAccounts: any[] = [];
  payments: any[] = [];
  totalAmount: number = 0;

  formGroup: FormGroup = new FormGroup({
    dueDate: new FormControl(''),
    date: new FormControl('', Validators.required),
    bankAccountID: new FormControl('', Validators.required),
    amount: new FormControl(0, [Validators.required, Validators.min(1)]),
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
      .get('loans/payments/' + this.data.loanID, {})
      .subscribe({
        next: (data: any) => {
          const totalAmount =
            data.loan.debt -
            data.payments
              .filter((x: any) => x.is_delete == false)
              .reduce((a: any, b: any) => {
                return a + b.amount;
              }, 0);
          this.totalAmount = totalAmount;
          // set validators maximum amount
          this.formGroup
            .get('amount')
            ?.setValidators([
              Validators.required,
              Validators.min(1),
              Validators.max(totalAmount),
            ]);

          this.formGroup.patchValue({
            date: new Date(data.purchase.dueDate),
            amount: totalAmount,
          });

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

    this.apiService
      .post('outgoing-payments', {
        purchaseID: null,
        expenseID: null,
        reimbursementID: null,
        loanID: this.data.loanID,
        date: formattedDate,
        amount: this.formGroup.value.amount,
        bankAccountID: this.formGroup.value.bankAccountID,
      })
      .subscribe({
        next: (_) => {
          // create pdf document
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
