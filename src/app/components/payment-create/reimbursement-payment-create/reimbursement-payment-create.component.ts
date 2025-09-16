import { Component, Inject } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PaymentSlipHelper } from 'src/app/helpers/payment-slip.helper';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-reimbursement-payment-create',
  standalone: false,
  templateUrl: './reimbursement-payment-create.component.html',
  styleUrl: './reimbursement-payment-create.component.scss',
})
export class ReimbursementPaymentCreateComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private apiService: ApiService,
    private dialog: MatDialogRef<ReimbursementPaymentCreateComponent>,
    private snackBar: MatSnackBar,
    private formBuilder: FormBuilder
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
    reimbursementName: new FormControl('', Validators.required),
    projectName: new FormControl('', Validators.required),
    bankAccountName: new FormControl(''),
    bankAccountNumber: new FormControl(''),
    bankName: new FormControl(''),
  });

  valueFormGroup: FormGroup = new FormGroup({
    reimbursementItems: new FormArray([]),
    total: new FormControl('', Validators.required),
  });

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
        this.snackBar.open('Error fetching bank accounts', 'Close', {
          duration: 3000,
        });
        this.dialog.close();
      },
    });
  }

  fetchData() {
    this.isLoading = true;
    this.apiService.get('reimbursements/' + this.data.id, {}).subscribe({
      next: (data: any) => {
        this.metaFormGroup.patchValue({
          date: `${new Date(data.reimbursement.date).toLocaleDateString(
            'id-ID',
            {
              year: 'numeric',
              month: 'long',
              day: '2-digit',
            }
          )}`,
          dueDate: `${new Date(data.reimbursement.dueDate).toLocaleDateString(
            'id-ID',
            {
              year: 'numeric',
              month: 'long',
              day: '2-digit',
            }
          )}`,
          createdAt: `${new Date(
            data.reimbursement.createdAt
          ).toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: '2-digit',
          })}`,
          reimbursementName: data.reimbursement.name,
          projectName: data.reimbursement.projectName,
          bankAccountName: data.reimbursement.bankAccountName,
          bankAccountNumber: data.reimbursement.bankAccountNumber,
          bankName: data.reimbursement.bankName,
        });

        data.reimbursement_items.forEach((item: any) => {
          this.t.push(
            this.formBuilder.group({
              id: [item.id],
              date: [
                `${new Date(item.date).toLocaleDateString('id-ID', {
                  year: 'numeric',
                  month: 'long',
                  day: '2-digit',
                })}`,
              ],
              description: [item.description, Validators.required],
              amount: [item.amount, [Validators.required, Validators.min(1)]],
            })
          );
        });

        const amount = data.reimbursement_items.reduce(
          (a: any, b: any) => a + b.amount,
          0
        );

        this.valueFormGroup.patchValue({
          total: amount,
        });

        this.formGroup.patchValue({
          amount: amount,
        });
      },
      error: (error) => {
        this.snackBar.open('Error fetching reimbursement data', 'Close', {
          duration: 3000,
        });
        this.isLoading = false;
      },
    });
  }

  onSubmit() {
    this.isSubmitting = true;

    const date = new Date(this.formGroup.value.date);
    const formattedDate = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    this.isSubmitting = false;
    this.apiService
      .post('outoing-payments', {
        purchaseID: null,
        expenseID: null,
        reimbursementID: this.data.id,
        date: formattedDate,
        amount: this.formGroup.value.amount,
        bankAccountID: this.formGroup.value.bankAccountID,
      })
      .subscribe({
        next: (data) => {
          // create pdf document
          PaymentSlipHelper.generateReimbursementPaymentSlipPDF({
            reimbursementName: this.metaFormGroup.value.reimbursementName,
            projectName: this.metaFormGroup.value.projectName,
            date: this.metaFormGroup.value.date,
            paymentDate: formattedDate,
            dueDate: this.metaFormGroup.value.dueDate,
            createdAt: this.metaFormGroup.value.createdAt,
            amount: this.formGroup.value.amount,
            bankAccountName: this.metaFormGroup.value.bankAccountName,
            bankAccountNumber: this.metaFormGroup.value.bankAccountNumber,
            bankName: this.metaFormGroup.value.bankName,
            bankAccountNameOrigin: this.bankAccounts.find(
              (x) => x.id === this.formGroup.value.bankAccountID
            )?.bankAccountName,
            bankAccountNumberOrigin: this.bankAccounts.find(
              (x) => x.id === this.formGroup.value.bankAccountID
            )?.bankAccountNumber,
            bankNameOrigin: this.bankAccounts.find(
              (x) => x.id === this.formGroup.value.bankAccountID
            )?.bankName,
          });
          this.snackBar.open('Payment created successfully', 'Close', {
            duration: 3000,
          });
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

  get f() {
    return this.valueFormGroup.controls;
  }

  get t() {
    return this.valueFormGroup.get('reimbursementItems') as FormArray;
  }
}
