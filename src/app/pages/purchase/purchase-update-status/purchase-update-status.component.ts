import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-purchase-update-status',
  templateUrl: './purchase-update-status.component.html',
  styleUrl: './purchase-update-status.component.scss',
  standalone: false,
})
export class PurchaseUpdateStatusComponent {
  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  isSubmitting: boolean = false;
  isLoading: boolean = false;

  metaFormGroup: FormGroup = new FormGroup({
    id: new FormControl('', Validators.required),
    invoiceName: new FormControl('', Validators.required),
    receiptName: new FormControl(''),
    taxInvoiceName: new FormControl('', Validators.maxLength(17)),
    supplierID: new FormControl('', Validators.required),
    supplierName: new FormControl(''),
    supplierAddress: new FormControl(''),
    date: new FormControl('', Validators.required),
    dueDate: new FormControl('', Validators.required),
    purchaseOrderName: new FormControl('', [
      Validators.required,
      Validators.pattern(
        /^\d{3,4}-(PO|SPK)-[A-Z0-9]{1,5}-(A|B|C|D|E|F|G|5\.1\.1|5\.1\.2|5\.1\.6|5\.1\.7|6\.3\.1|6\.3\.2|5\.1\.12|6\.4\.1|6\.4\.2|6\.5\.1)$/
      ),
    ]),
    projectName: new FormControl('', Validators.required),
    purchaseType: new FormControl('', Validators.required),
  });

  valueFormGroup: FormGroup = new FormGroup({
    dpp: new FormControl('', [Validators.required, Validators.min(1)]),
    ppn: new FormControl('', [
      Validators.required,
      Validators.min(0),
      Validators.max(11),
    ]),
    ppnValue: new FormControl(0),
    pbbkb: new FormControl(0, [Validators.required, Validators.min(0)]),
    pphCode: new FormControl(''),
    pphTaxObject: new FormControl(''),
    pphPercentage: new FormControl(0, [Validators.required, Validators.min(0)]),
    pphValue: new FormControl(0),
    otherValue: new FormControl(0, [Validators.required, Validators.min(0)]),
    otherValueNote: new FormControl({ value: '', disabled: true }),
    total: new FormControl(0, [Validators.required, Validators.min(0)]),
  });

  attachmentFormGroup: FormGroup = new FormGroup({
    isInvoiceAttached: new FormControl(false, Validators.requiredTrue),
    isReceiptAttached: new FormControl(false),
    isTaxInvoiceAttached: new FormControl(false),
    isCopAttached: new FormControl(false),
    isCopyPurchaseOrderAttached: new FormControl(
      false,
      Validators.requiredTrue
    ),
  });

  paymentFormGroup: FormGroup = new FormGroup({
    bankName: new FormControl('', Validators.required),
    bankAccountName: new FormControl('', Validators.required),
    bankAccountNumber: new FormControl('', Validators.required),
    paymentMethod: new FormControl('', Validators.required),
    paymentTotal: new FormControl(0, [Validators.required, Validators.min(0)]),
  });

  ngOnInit() {
    this.route.params.subscribe((params) => {
      const id = params['id'];
      this.fetchData(id);
    });
  }

  fetchData(id: string) {
    this.isLoading = true;
    this.apiService.get('purchases/' + id, {}).subscribe({
      next: (data: any) => {
        if (data.lastStatus == 'ready') {
          this.snackBar.open('Data is already complete', 'Close', {
            duration: 3000,
          });
          this.router.navigate(['/Purchase']);
        }
        this.metaFormGroup.patchValue({
          id: id,
          invoiceName: data.invoiceName,
          receiptName: data.receiptName,
          taxInvoiceName: data.taxInvoiceName,
          date: data.date,
          dueDate: data.dueDate,
          projectName: data.projectName,
          purchaseOrderName: data.purchaseOrderName,
          purchaseType: data.purchaseType,
          supplierID: data.supplierID,
          supplierName: `${data.supplier.name}, ${data.supplier.prefix}`,
          supplierAddress: `${data.supplier.address}, ${data.supplier.city}, ${data.supplier.province}`,
        });

        const total =
          data.dpp + (data.ppn * data.dpp) / 100 + data.pbbkb + data.otherValue;
        const paymentTotal =
          data.dpp +
          (data.ppn * data.dpp) / 100 +
          data.pbbkb +
          data.otherValue +
          (data.pphPercentage * data.dpp) / 100;

        this.valueFormGroup.patchValue({
          dpp: data.dpp,
          ppn: data.ppn,
          ppnValue: ((data.ppn * data.dpp) / 100).toFixed(2),
          pbbkb: data.pbbkb,
          pphCode: data.pphCode,
          pphTaxObject: data.pphTaxObjectName,
          pphPercentage: data.pphPercentage,
          pphValue: ((data.pphPercentage * data.dpp) / 100).toFixed(2),
          otherValue: data.otherValue,
          otherValueNote: data.otherValueNote,
          total: total,
        });

        this.attachmentFormGroup.patchValue({
          isInvoiceAttached: data.isInvoiceAttached,
          isReceiptAttached: data.isReceiptAttached,
          isTaxInvoiceAttached: data.isTaxInvoiceAttached,
          isCopAttached: data.isCopAttached,
          isCopyPurchaseOrderAttached: data.isCopyPurchaseOrderAttached,
        });

        this.paymentFormGroup.patchValue({
          bankName: data.bankName,
          bankAccountName: data.bankAccountName,
          bankAccountNumber: data.bankAccountNumber,
          paymentMethod: data.paymentMethod,
          paymentTotal: paymentTotal.toFixed(2),
        });
      },
      error: (error) => {
        console.error(error);
        this.snackBar.open('Error on fetching data', 'Close', {
          duration: 3000,
        });
        this.router.navigate(['/Purchase']);
      },
    });
  }

  get isValid() {
    return (
      this.metaFormGroup.valid &&
      this.valueFormGroup.valid &&
      this.attachmentFormGroup.valid &&
      this.paymentFormGroup.valid
    );
  }

  onSubmit() {
    this.isSubmitting = true;
    this.apiService
      .put('purchases/update-status', {
        id: this.metaFormGroup.value.id,
        isInvoiceAttached: this.attachmentFormGroup.value.isInvoiceAttached,
        isReceiptAttached: this.attachmentFormGroup.value.isReceiptAttached,
        isTaxInvoiceAttached:
          this.attachmentFormGroup.value.isTaxInvoiceAttached,
        isCopAttached: this.attachmentFormGroup.value.isCopAttached,
        isCopyPurchaseOrderAttached:
          this.attachmentFormGroup.value.isCopyPurchaseOrderAttached,
        invoiceName: this.metaFormGroup.value.invoiceName,
        receiptName: this.metaFormGroup.value.receiptName,
        taxInvoiceName: this.metaFormGroup.value.taxInvoiceName,
        dueDate: this.metaFormGroup.value.dueDate,
        date: this.metaFormGroup.value.date,
      })
      .subscribe({
        next: (data) => {
          this.snackBar.open('Data updated successfully', 'Close', {
            duration: 3000,
          });

          this.router.navigate(['/Purchase']);
        },
        error: (error) => {
          console.error(error);
          this.snackBar.open('Error on updating data', 'Close', {
            duration: 3000,
          });
        },
      })
      .add(() => {
        this.isSubmitting = false;
      });
  }
}
