import { Component, Inject } from '@angular/core';
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
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../../services/api.service';
import { PaymentSlipHelper } from '../../../helpers/payment-slip.helper';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSelectModule } from '@angular/material/select';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-purchase-payment-create',
  providers: [provideNgxMask()],
  templateUrl: './purchase-payment-create.component.html',
  styleUrls: ['./purchase-payment-create.component.scss'],
  standalone: true,
  imports: [
    TranslatePipe,
    NgxMaskDirective,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatSelectModule,
  ],
})
export class PurchasePaymentCreateComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private apiService: ApiService,
    private dialog: MatDialogRef<PurchasePaymentCreateComponent>,
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
    supplierName: new FormControl('', Validators.required),
    supplierAddress: new FormControl(''),
    invoiceName: new FormControl('', Validators.required),
    taxInvoiceName: new FormControl(''),
    purchaseOrderName: new FormControl('', Validators.required),
    projectName: new FormControl('', Validators.required),
    paymentHistory: new FormControl(0, Validators.required),
    bankAccountName: new FormControl(''),
    bankAccountNumber: new FormControl(''),
    bankName: new FormControl(''),
  });

  valueFormGroup: FormGroup = new FormGroup({
    dpp: new FormControl(0, [Validators.required, Validators.min(1)]),
    ppn: new FormControl('', Validators.required),
    pph: new FormControl(0, Validators.required),
    pphCode: new FormControl(''),
    pphTaxObject: new FormControl(''),
    pphPercentage: new FormControl(0, Validators.required),
    pbbkb: new FormControl('', Validators.required),
    otherValue: new FormControl('', Validators.required),
    otherValueNote: new FormControl(''),
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
          this.metaFormGroup.patchValue({
            // transform to DD MMMM yyyy format
            createdAt: `${new Date(data.purchase.createdAt).toLocaleDateString(
              'id-ID',
              {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              },
            )}`,
            date: new Date(data.purchase.date).toLocaleDateString('id-ID', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            }),
            dueDate: new Date(data.purchase.dueDate).toLocaleDateString(
              'id-ID',
              {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              },
            ),
            purchaseOrderName: data.purchase.purchaseOrderName,
            projectName: data.purchase.projectName,
            supplierName: data.purchase.supplier_name
              ? `${data.purchase.supplier_name}, ${data.purchase.supplier_prefix ?? ''}`
                  .trim()
                  .replace(/,\s*$/, '')
              : data.purchase.supplier?.name
                ? `${data.purchase.supplier.name}, ${data.purchase.supplier.prefix ?? ''}`
                    .trim()
                    .replace(/,\s*$/, '')
                : '',
            supplierAddress: data.purchase.supplier_address
              ? `${data.purchase.supplier_address}, ${data.purchase.supplier_city ?? ''}, ${data.purchase.supplier_province ?? ''}`
              : data.purchase.supplier?.address
                ? `${data.purchase.supplier.address}, ${data.purchase.supplier.city ?? ''}, ${data.purchase.supplier.province ?? ''}`
                : '',
            invoiceName: data.purchase.invoiceName,
            taxInvoiceName:
              data.purchase.taxInvoiceName == null ||
              data.purchase.taxInvoiceName == ''
                ? 'N/A'
                : data.purchase.taxInvoiceName,
            paymentHistory: data.payments,
            bankAccountName: data.purchase.bankAccountName,
            bankAccountNumber: data.purchase.bankAccountNumber,
            bankName: data.purchase.bankName,
          });

          this.valueFormGroup.patchValue({
            dpp: data.purchase.dpp,
            ppn: (data.purchase.ppn * data.purchase.dpp) / 100,
            pbbkb: data.purchase.pbbkb,
            pph: (data.purchase.pphPercentage * data.purchase.dpp) / 100,
            pphCode: data.purchase.pphCode,
            pphTaxObject: data.purchase.pphTaxObject,
            otherValue: data.purchase.otherValue,
            otherValueNote:
              data.purchase.otherValueNote == null
                ? ''
                : data.purchase.otherValueNote.toUpperCase(),
            total: (
              data.purchase.dpp +
              (data.purchase.ppn * data.purchase.dpp) / 100 +
              data.purchase.pbbkb +
              data.purchase.otherValue -
              (data.purchase.pphPercentage * data.purchase.dpp) / 100
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
            data.purchase.dpp +
            (data.purchase.ppn * data.purchase.dpp) / 100 -
            (data.purchase.pphPercentage * data.purchase.dpp) / 100 +
            data.purchase.pbbkb +
            data.purchase.otherValue -
            data.payments
              .filter((x: any) => x.isDelete == false)
              .reduce((sum: number, payment: any) => {
                return sum + payment.amount;
              }, 0);

          const maximumAmount = Math.round(totalAmount * 100) / 100;

          // set validators maximum amount
          this.formGroup
            .get('amount')
            ?.setValidators([
              Validators.required,
              Validators.min(1),
              Validators.max(maximumAmount),
            ]);

          this.formGroup.patchValue({
            date: new Date(data.purchase.dueDate),
            amount: maximumAmount,
          });

          this.totalAmount = maximumAmount;
        },
        error: (error) => {
          console.error('Error fetching purchase data:', error);
          this.snackBar.open('Error fetching purchase data', 'Close', {
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
        purchaseID: this.data.purchaseID,
        expenseID: null,
        reimbursementID: null,
        date: formattedDate,
        amount: this.formGroup.value.amount,
        bankAccountID: this.formGroup.value.bankAccountID,
      })
      .subscribe({
        next: (_) => {
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
          //   ppn: this.valueFormGroup.value.ppn,
          //   pphCode: this.valueFormGroup.value.pphCode,
          //   pphTaxObject: this.valueFormGroup.value.pphTaxObject,
          //   pphPercentage: this.valueFormGroup.value.pphPercentage,
          //   pbbkb: this.valueFormGroup.value.pbbkb,
          //   otherValue: this.valueFormGroup.value.otherValue,
          //   otherValueNote: this.valueFormGroup.value.otherValueNote,
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
}
