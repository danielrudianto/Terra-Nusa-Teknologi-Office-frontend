import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from 'src/app/services/api.service';
import { Clipboard } from '@angular/cdk/clipboard';
import { StepperOrientation } from '@angular/cdk/stepper';
import { map, Observable } from 'rxjs';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatDialog } from '@angular/material/dialog';
import { DeleteConfirmationComponent } from 'src/app/components/delete-confirmation/delete-confirmation.component';

@Component({
  selector: 'app-payment-update',
  standalone: false,
  templateUrl: './payment-update.component.html',
  styleUrl: './payment-update.component.scss',
})
export class PaymentUpdateComponent {
  stepperOrientation: Observable<StepperOrientation>;

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
    private datePipe: DatePipe,
    private snackBar: MatSnackBar,
    private clipboard: Clipboard,
    private decimalPipe: DecimalPipe,
    private dialog: MatDialog,
    private formBuilder: FormBuilder,
    private router: Router
  ) {
    const breakpointObserver = inject(BreakpointObserver);

    this.stepperOrientation = breakpointObserver
      .observe('(min-width: 1200px)')
      .pipe(map(({ matches }) => (matches ? 'horizontal' : 'vertical')));
  }

  isLoading: boolean = false;
  paymentId: string = '';
  isPurchase: boolean = false;
  isReimbursement: boolean = false;
  isSubmitting: boolean = false;
  isApproved: boolean = false;

  metaFormGroup: FormGroup = new FormGroup({
    date: new FormControl(''),
    amount: new FormControl(''),
    bankName: new FormControl(''),
    bankAccountNumber: new FormControl(''),
    bankAccountName: new FormControl(''),
  });

  purchaseFormGroup: FormGroup = new FormGroup({
    date: new FormControl(''),
    invoiceName: new FormControl(''),
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
    this.route.params.subscribe((params) => {
      this.paymentId = params['id'];
      this.fetchPaymentData();
    });
  }

  fetchPaymentData(): void {
    this.isLoading = true;

    this.isPurchase = false;
    this.isReimbursement = false;

    this.apiService
      .get(`payments/${this.paymentId}`, {})
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
              invoiceName: data.purchase.invoiceName,
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
                ? `[${data.purchase.pphCode}] ${data.purchase.pphTaxObjectName}`
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

            this.isApproved = data.payment.isApprove || data.payment.isDelete;
          }

          if (data.reimbursement != null) {
            this.isReimbursement = true;
            this.reimbursementFormGroup.patchValue({
              date: this.datePipe.transform(
                data.reimbursement.date,
                'dd MMMM yyyy'
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
                })
              );
            });

            this.paymentFormGroup.patchValue({
              bankName: data.reimbursement.bankName,
              bankAccountNumber: data.reimbursement.bankAccountNumber,
              bankAccountName: data.reimbursement.bankAccountName,
              paymentMethod: data.reimbursement.paymentMethod,
            });
          }
        },
        error: (error) => {
          this.snackBar.open(
            'Failed to fetch payment data. Please try again later.',
            'Close',
            {
              duration: 3000,
            }
          );
          console.error('Error fetching payment data:', error);
        },
      })
      .add(() => {
        this.isLoading = false;
      });
  }

  copyBankDetails(): void {
    this.clipboard.copy(
      `${this.metaFormGroup.value.bankName}\n` +
        `${this.metaFormGroup.value.bankAccountName}\n` +
        `${this.metaFormGroup.value.bankAccountNumber}`
    );
    this.snackBar.open(
      'Bank account data has been copied successfully.',
      'Close',
      {
        duration: 3000,
      }
    );
  }

  copyBankTargetDetails(): void {
    this.clipboard.copy(
      `${this.paymentFormGroup.value.bankName}\n` +
        `${this.paymentFormGroup.value.bankAccountName}\n` +
        `${this.paymentFormGroup.value.bankAccountNumber}`
    );
    this.snackBar.open(
      'Bank target data has been copied successfully.',
      'Close',
      {
        duration: 3000,
      }
    );
  }

  copyValueDetails(): void {
    this.clipboard.copy(
      `DPP: ${this.decimalPipe.transform(
        this.valueFormGroup.value.dpp,
        '1.2-2'
      )}\n` +
        `PPN: ${this.decimalPipe.transform(
          this.valueFormGroup.value.ppn,
          '1.0-2'
        )}% - (${this.decimalPipe.transform(
          this.valueFormGroup.value.ppnValue,
          '1.2-2'
        )})\n` +
        `PBBKB: ${this.decimalPipe.transform(
          this.valueFormGroup.value.pbbkb,
          '1.2-2'
        )}\n` +
        `PPH: ${this.decimalPipe.transform(
          this.valueFormGroup.value.pphPercentage,
          '1.0-2'
        )}% - ${this.decimalPipe.transform(
          this.valueFormGroup.value.pphValue,
          '1.2-2'
        )}\n` +
        `Other Value: ${this.decimalPipe.transform(
          this.valueFormGroup.value.otherValue,
          '1.2-2'
        )} (${
          this.valueFormGroup.value.otherValueNote == null
            ? 'N/A'
            : this.valueFormGroup.value.otherValueNote
        })\n` +
        `Total: ${this.decimalPipe.transform(
          this.valueFormGroup.value.total,
          '1.2-2'
        )}\n` +
        `Total Payment: ${this.decimalPipe.transform(
          this.valueFormGroup.value.totalPayment,
          '1.2-2'
        )}`
    );
    this.snackBar.open(
      'Payment value details have been copied successfully.',
      'Close',
      {
        duration: 3000,
      }
    );
  }

  copyValue(): void {
    this.clipboard.copy(`${this.metaFormGroup.value.amount}`);
    this.snackBar.open('Payment value has been copied successfully.', 'Close', {
      duration: 3000,
    });
  }

  approvePayment() {
    this.dialog
      .open(DeleteConfirmationComponent, {
        data: {
          title: 'Approve payment',
          prompt: 'Are you sure you want to approve this payment?',
        },
      })
      .afterClosed()
      .subscribe((result) => {
        if (result === true) {
          this.isSubmitting = true;
          this.apiService
            .put('payments/approve/' + this.paymentId, {})
            .subscribe({
              next: (data) => {
                this.snackBar.open(
                  'Payment has been approved successfully.',
                  'Close',
                  {
                    duration: 3000,
                  }
                );
                this.router.navigate(['/Payment']);
              },
            })
            .add(() => {
              this.isSubmitting = false;
            });
        }
      });
  }

  rejectPayment() {
    this.dialog
      .open(DeleteConfirmationComponent, {
        data: {
          title: 'Reject payment',
          prompt: 'Are you sure you want to reject this payment?',
        },
      })
      .afterClosed()
      .subscribe((result) => {
        if (result === true) {
          this.isSubmitting = true;
          this.apiService
            .put('payments/reject/' + this.paymentId, {})
            .subscribe({
              next: (data) => {
                this.snackBar.open(
                  'Payment has been rejected successfully.',
                  'Close',
                  {
                    duration: 3000,
                  }
                );
                this.router.navigate(['/Payment']);
              },
            })
            .add(() => {
              this.isSubmitting = false;
            });
        }
      });
  }

  get f() {
    return this.reimbursementValueFormGroup.controls;
  }

  get t() {
    return this.reimbursementValueFormGroup.get('items') as FormArray;
  }
}
