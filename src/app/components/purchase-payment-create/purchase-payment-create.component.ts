import { Component, Inject } from '@angular/core';
import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-purchase-payment-create',
  templateUrl: './purchase-payment-create.component.html',
  styleUrls: ['./purchase-payment-create.component.scss'],
  standalone: false,
})
export class PurchasePaymentCreateComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private apiService: ApiService,
    private dialog: MatDialogRef<PurchasePaymentCreateComponent>,
    private snackBar: MatSnackBar
  ) {}

  isLoading: boolean = false;
  isSubmitting: boolean = false;
  bankAccounts: any[] = [];
  payments: any[] = [];

  formGroup: FormGroup = new FormGroup({
    dpp: new FormControl(0, [Validators.required, Validators.min(1)]),
    ppn: new FormControl('', Validators.required),
    pbbkb: new FormControl('', Validators.required),
    otherValue: new FormControl('', Validators.required),
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
        this.snackBar.open('Error fetching bank accounts', 'Close', {
          duration: 3000,
        });
        this.dialog.close();
      },
    });
  }

  fetchData() {
    this.apiService
      .get('purchases/payments/' + this.data.purchaseID, {})
      .subscribe({
        next: (data: any) => {
          this.formGroup.patchValue({
            dpp: data.purchase.dpp,
            ppn: (data.purchase.ppn * data.purchase.dpp) / 100,
            pbbkb: data.purchase.pbbkb,
            otherValue: data.purchase.otherValue,
          });

          // set form array payments
          this.payments = data.payments.map((payment: any) => {
            const bankIndex = this.bankAccounts.findIndex(
              (x) => x.id == payment.bankAccountID
            );
            return {
              id: payment.id,
              date: payment.date,
              amount: payment.amount,
              bankAccountID: payment.bankAccountID,
              bankAccountName: this.bankAccounts[bankIndex]?.bankAccountName || '',
              bankAccountNumber: this.bankAccounts[bankIndex]?.bankAccountNumber || '',
              bankName: this.bankAccounts[bankIndex]?.bankName || '',
            };
          });

          // set the maximum amount of dpp + ppn + pbbkb + otherValue - sum(data.payments.amount)
          const totalAmount =
            data.purchase.dpp +
            (data.purchase.ppn * data.purchase.dpp) / 100 +
            data.purchase.pbbkb +
            data.purchase.otherValue -
            data.payments.reduce((sum: number, payment: any) => {
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
        },
        error: (error) => {},
      })
      .add(() => {
        this.isLoading = false;
      });
  }

  onSubmit() {
    this.isSubmitting = true;

    const date = new Date(this.formGroup.value.date);
    const formattedDate = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    this.apiService
      .post('payments', {
        purchaseID: this.data.purchaseID,
        expenseID: null,
        reimbursementID: null,
        date: formattedDate,
        amount: this.formGroup.value.amount,
        bankAccountID: this.formGroup.value.bankAccountID,
      })
      .subscribe({
        next: (data) => {
          this.dialog.close();
        },
        error: (error) => {
          this.snackBar.open('Error creating payment', 'Close', {
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
