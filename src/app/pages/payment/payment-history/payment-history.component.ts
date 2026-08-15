import { Component, Inject, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../../services/api.service';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { AsyncPipe, CommonModule, DatePipe } from '@angular/common';
import { Observable, map } from 'rxjs';
import { StepperOrientation } from '@angular/cdk/stepper';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatStepperModule } from '@angular/material/stepper';
import { TranslatePipe } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { DialogGeserDirective } from '../../../directives/dialog-geser.directive';

@Component({
  selector: 'app-payment-history',
  standalone: true,
  templateUrl: './payment-history.component.html',
  styleUrl: './payment-history.component.scss',
  imports: [
    MatIconModule,
    TranslatePipe,
    MatDialogModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatStepperModule,
    AsyncPipe,
    CommonModule,
    DialogGeserDirective,
  ],
})
export class PaymentHistoryComponent {
  stepperOrientation: Observable<StepperOrientation>;

  constructor(
    @Inject(MAT_DIALOG_DATA) private data: { id: number },
    private dialog: MatDialogRef<PaymentHistoryComponent>,
    private snackBar: MatSnackBar,
    private apiService: ApiService,
    private datePipe: DatePipe,
    private formBuilder: FormBuilder,
  ) {
    const breakpointObserver = inject(BreakpointObserver);

    this.stepperOrientation = breakpointObserver
      .observe('(min-width: 1200px)')
      .pipe(map(({ matches }) => (matches ? 'horizontal' : 'vertical')));
  }

  isLoading: boolean = false;
  isPurchase: boolean = false;
  isReimbursement: boolean = false;
  isExpense: boolean = false;

  metaFormGroup: FormGroup = new FormGroup({
    date: new FormControl(''),
    amount: new FormControl(''),
    bankName: new FormControl(''),
    bankAccountNumber: new FormControl(''),
    bankAccountName: new FormControl(''),
  });

  purchaseFormGroup: FormGroup = new FormGroup({
    date: new FormControl(''),
    name: new FormControl(''),
    receiptName: new FormControl(''),
    taxInvoiceName: new FormControl(''),
    purchaseOrderName: new FormControl(''),
    projectName: new FormControl(''),
    purchaseType: new FormControl(''),
    supplierName: new FormControl(''),
    supplierAddress: new FormControl(''),
  });

  reimbursementFormGroup: FormGroup = new FormGroup({
    date: new FormControl(''),
    name: new FormControl(''),
    projectName: new FormControl(''),
    purchaseType: new FormControl(''),
  });

  expenseFormGroup: FormGroup = new FormGroup({
    date: new FormControl(''),
    name: new FormControl(''),
    opponentName: new FormControl(''),
    opponentDescription: new FormControl(''),
    receiptName: new FormControl(''),
    taxInvoiceName: new FormControl(''),
    purchaseType: new FormControl(''),
  });

  valueFormGroup: FormGroup = new FormGroup({
    dpp: new FormControl(''),
    ppn: new FormControl(''),
    ppnValue: new FormControl(''),
    pbbkb: new FormControl(''),
    pphTaxObjectName: new FormControl(''),
    pphPercentage: new FormControl(''),
    pphValue: new FormControl(''),
    otherValue: new FormControl(''),
    otherValueNote: new FormControl(''),
    total: new FormControl(''),
    totalPayment: new FormControl(''),
  });

  reimbursementValueFormGroup: FormGroup = new FormGroup({
    items: new FormArray([]),
    amount: new FormControl(''),
  });

  paymentFormGroup: FormGroup = new FormGroup({
    bankName: new FormControl(''),
    bankAccountNumber: new FormControl(''),
    bankAccountName: new FormControl(''),
    paymentMethod: new FormControl(''),
  });

  ngOnInit(): void {
    this.fetchData();
  }

  fetchData() {
    this.isLoading = true;
    this.apiService
      .get(`payments/${this.data.id}`, {})
      .subscribe({
        next: (data: any) => {
          this.metaFormGroup.patchValue({
            date: this.datePipe.transform(data.payment.date, 'dd MMMM yyyy'),
            amount: data.payment.amount,
            bankName: data.bankAccount.bankName,
            bankAccountNumber: data.bankAccount.bankAccountNumber,
            bankAccountName: data.bankAccount.bankAccountName,
          });

          if (data.purchase != null) {
            this.isPurchase = true;
            this.purchaseFormGroup.patchValue({
              date: this.datePipe.transform(data.purchase.date, 'dd MMMM yyyy'),
              name: data.purchase.invoiceName,
              receiptName: data.purchase.receiptName,
              taxInvoiceName: data.purchase.taxInvoiceName,
              purchaseOrderName: data.purchase.purchaseOrderName,
              projectName: data.purchase.projectName,
              purchaseType: data.purchase.purchaseType,
              supplierName: `${data.purchase.supplier_name}, ${data.purchase.supplier_prefix}`,
              supplierAddress: `${data.purchase.supplier_address}, ${data.purchase.supplier_city}, ${data.purchase.supplier_province}`,
            });

            this.valueFormGroup.patchValue({
              dpp: data.purchase.dpp,
              ppn: data.purchase.ppn,
              ppnValue: (data.purchase.ppn * data.purchase.dpp) / 100,
              pbbkb: data.purchase.pbbkb,
              pphTaxObjectName: data.purchase.pphCode
                ? `[${data.purchase.pphCode}] ${data.purchase.pphTaxObject}`
                : 'N/A',
              pphPercentage: data.purchase.pphPercentage,
              pphValue: data.purchase.pphPercentage * (data.purchase.dpp / 100),
              otherValue: data.purchase.otherValue,
              otherValueNote: data.purchase.otherValueNote,
              total:
                data.purchase.dpp +
                (data.purchase.ppn * data.purchase.dpp) / 100 +
                data.purchase.pbbkb -
                data.purchase.otherValue,
              totalPayment:
                data.purchase.dpp +
                (data.purchase.ppn * data.purchase.dpp) / 100 +
                data.purchase.pbbkb +
                data.purchase.otherValue -
                data.purchase.pphPercentage * (data.purchase.dpp / 100),
            });

            this.paymentFormGroup.patchValue({
              bankName: data.purchase.bankName,
              bankAccountNumber: data.purchase.bankAccountNumber,
              bankAccountName: data.purchase.bankAccountName,
              paymentMethod: data.purchase.paymentMethod,
            });
          }

          if (data.reimbursement != null) {
            this.isReimbursement = true;
            this.reimbursementFormGroup.patchValue({
              date: this.datePipe.transform(
                data.reimbursement.date,
                'dd MMMM yyyy',
              ),
              name: data.reimbursement.name,
              projectName: data.reimbursement.projectName,
              purchaseType: data.reimbursement.purchaseType,
            });

            (data.reimbursement.items as any[]).forEach((item) => {
              (this.reimbursementValueFormGroup.get('items') as FormArray).push(
                this.formBuilder.group({
                  id: [item.id],
                  date: [this.datePipe.transform(item.date, 'dd MMMM yyyy')],
                  description: [item.description],
                  amount: [item.amount],
                }),
              );
            });

            this.paymentFormGroup.patchValue({
              bankName: data.reimbursement.bankName,
              bankAccountNumber: data.reimbursement.bankAccountNumber,
              bankAccountName: data.reimbursement.bankAccountName,
              paymentMethod: data.reimbursement.paymentMethod,
            });
          }

          if (data.expense != null) {
            this.isExpense = true;
            this.expenseFormGroup.patchValue({
              date: this.datePipe.transform(data.expense.date, 'dd MMMM yyyy'),
              name: data.expense.invoiceName,
              receiptName: data.expense.receiptName,
              taxInvoiceName: data.taxInvoiceName,
              opponentName: data.expense.expense_opponent_name,
              opponentDescription: data.expense.expense_opponent_description,
              purchaseType: data.expense.purchaseType,
            });

            this.valueFormGroup.patchValue({
              dpp: data.expense.dpp,
              ppn: data.expense.ppn,
              ppnValue: (data.expense.ppn * data.expense.dpp) / 100,
              pbbkb: data.expense.pbbkb,
              pphTaxObjectName: data.expense.pphCode
                ? `[${data.expense.pphCode}] ${data.expense.pphTaxObject}`
                : 'N/A',
              pphPercentage: data.expense.pphPercentage,
              pphValue: data.expense.pphPercentage * (data.expense.dpp / 100),
              total:
                data.expense.dpp +
                (data.expense.ppn * data.expense.dpp) / 100 +
                data.expense.pbbkb,
              totalPayment:
                data.expense.dpp +
                (data.expense.ppn * data.expense.dpp) / 100 +
                data.expense.pbbkb -
                data.expense.pphPercentage * (data.expense.dpp / 100),
            });

            this.paymentFormGroup.patchValue({
              bankName: data.expense.bankName,
              bankAccountNumber: data.expense.bankAccountNumber,
              bankAccountName: data.expense.bankAccountName,
              paymentMethod: data.expense.paymentMethod,
            });
          }
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

  get f() {
    return this.reimbursementValueFormGroup.controls;
  }

  get t() {
    return this.reimbursementValueFormGroup.get('items') as FormArray;
  }
}
