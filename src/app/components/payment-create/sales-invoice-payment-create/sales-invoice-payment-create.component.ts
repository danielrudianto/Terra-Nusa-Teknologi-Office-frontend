import { Component, Inject } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import moment from 'moment';
import { CommonModule } from '@angular/common';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-sales-invoice-payment-create',
  standalone: true,
  providers: [provideNgxMask()],
  templateUrl: './sales-invoice-payment-create.component.html',
  styleUrl: './sales-invoice-payment-create.component.scss',
  imports: [
    NgxMaskDirective,
    MatInputModule,
    MatDialogModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    TranslatePipe,
  ],
})
export class SalesInvoicePaymentCreateComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { id: number },
    private apiService: ApiService,
    private dialog: MatDialog,
    private dialogRef: MatDialogRef<SalesInvoicePaymentCreateComponent>,
    private snackBar: MatSnackBar,
    private formBuilder: FormBuilder,
  ) {}

  isLoading: boolean = false;
  isSubmitting: boolean = false;
  bankAccounts: any[] = [];

  formGroup: FormGroup = new FormGroup({
    name: new FormControl('', Validators.required),
    clientName: new FormControl('', Validators.required),
    dpp: new FormControl(0, Validators.required),
    ppn: new FormControl(0, Validators.required),
    pph: new FormControl('', Validators.required),
    total: new FormControl('', Validators.required),
    payments: new FormArray([]),
  });

  paymentFormGroup: FormGroup = new FormGroup({
    date: new FormControl('', Validators.required),
    amount: new FormControl(0, [Validators.required, Validators.min(0)]),
    bankAccountID: new FormControl('', Validators.required),
  });

  get f() {
    return this.formGroup.controls;
  }

  get t(): FormArray {
    return this.f['payments'] as FormArray;
  }

  get totalPaid(): number {
    return this.t.controls.reduce(
      (a, c) => a + (Number(c.get('amount')?.value) || 0),
      0,
    );
  }

  get remaining(): number {
    return (Number(this.formGroup.get('total')?.value) || 0) - this.totalPaid;
  }

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
        this.dialogRef.close();
      },
    });
  }

  fetchData() {
    this.isLoading = true;
    this.apiService
      .get(`sales-invoices/${this.data.id}`, {})
      .subscribe({
        next: (data: any) => {
          this.formGroup.patchValue({
            name: data.name,
            clientName: `${data.client_name}, ${data.client_prefix}`,
            dpp: data.dpp,
            ppn: (data.dpp * data.ppn) / 100,
            pph: (data.dpp * data.pphPercentage) / 100,
            total:
              data.dpp +
              (data.dpp * data.ppn) / 100 -
              (data.dpp * data.pphPercentage) / 100,
          });

          data.payments.forEach((x: any) => {
            this.t.push(
              this.formBuilder.group({
                id: [x.id],
                amount: [x.amount],
                date: [x.date],
              }),
            );
          });
        },
        error: (error) => {
          this.snackBar.open(error.error.detail, 'Close', {
            duration: 3000,
          });
          this.dialogRef.close();
        },
      })
      .add(() => {
        this.isLoading = false;
      });
  }

  onSubmit() {
    this.isSubmitting = true;
    this.apiService
      .post('incoming-payments', {
        date: moment(this.paymentFormGroup.value.date).format('YYYY-MM-DD'),
        amount: this.paymentFormGroup.value.amount,
        bankAccountID: this.paymentFormGroup.value.bankAccountID,
        loanID: null,
        incomeID: null,
        salesInvoiceID: this.data.id,
      })
      .subscribe({
        next: () => {
          this.dialogRef.close('paid');
          this.snackBar.open('Successfully created incoming payment', 'Close', {
            duration: 3000,
          });
        },
        error: (error) => {
          this.snackBar.open(error.error.detail, 'Close', {
            duration: 3000,
          });
        },
      })
      .add(() => {
        this.isSubmitting = false;
      });
  }
}
