import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatStepper } from '@angular/material/stepper';
import { PphSelectorComponent } from 'src/app/components/pph-selector/pph-selector.component';
import { SupplierSelectorComponent } from 'src/app/components/supplier-selector/supplier-selector.component';
import { ApiService } from 'src/app/services/api.service';
import { IPPh } from 'src/app/utils/pph';

@Component({
  selector: 'app-purchase-create',
  templateUrl: './purchase-create.component.html',
  styleUrls: ['./purchase-create.component.scss'],
})
export class PurchaseCreateComponent {
  constructor(
    private apiService: ApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  @ViewChild('stepper') stepper: MatStepper | undefined;

  isFinal: boolean = false;
  isSubmitting: boolean = false;

  get isNumberValid() {
    return (
      this.valueFormGroup.controls['dpp'].valid &&
      this.valueFormGroup.controls['ppn'].valid &&
      this.valueFormGroup.controls['pbbkb'].valid
    );
  }

  metaFormGroup: FormGroup = new FormGroup({
    invoiceName: new FormControl('', Validators.required),
    receiptName: new FormControl(''),
    taxInvoiceName: new FormControl('', Validators.maxLength(16)),
    supplierID: new FormControl('', Validators.required),
    supplierName: new FormControl(''),
    supplierAddress: new FormControl(''),
    date: new FormControl(new Date(), Validators.required),
    dueDate: new FormControl(new Date(), Validators.required),
    purchaseOrderName: new FormControl('', [
      Validators.required,
      Validators.pattern(
        /^\d{3}-(PO|SPK)-[A-Z0-9]{1,5}-(A|B|C|D|E|F|G|5\.1\.1|5\.1\.2|5\.1\.6)$/
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
    otherValue: new FormControl(0, [Validators.required, Validators.min(0)]),
    otherValueNote: new FormControl(''),
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
    this.valueFormGroup.valueChanges.subscribe(() => {
      console.log(this.valueFormGroup.controls);
    });
  }

  ngAfterViewInit() {
    this.valueFormGroup.controls['ppn'].valueChanges.subscribe((value) => {
      if (value) {
        this.valueFormGroup.controls['ppnValue'].setValue(
          (this.valueFormGroup.controls['dpp'].value * value) / 100
        );
      } else {
        this.valueFormGroup.controls['ppnValue'].setValue(0);
      }

      this.isFinal = false;
    });

    this.valueFormGroup.controls['dpp'].valueChanges.subscribe((value) => {
      if (value) {
        this.valueFormGroup.controls['ppnValue'].setValue(
          (this.valueFormGroup.controls['ppn'].value * value) / 100
        );
      } else {
        this.valueFormGroup.controls['ppnValue'].setValue(0);
      }

      this.isFinal = false;
    });

    this.valueFormGroup.controls['pbbkb'].valueChanges.subscribe((value) => {
      this.isFinal = false;
    });

    this.valueFormGroup.controls['otherValue'].valueChanges.subscribe(
      (value) => {
        this.isFinal = false;
      }
    );

    this.metaFormGroup.controls['purchaseOrderName'].valueChanges.subscribe(
      (value) => {
        const purchaseOrderName =
          this.metaFormGroup.controls['purchaseOrderName'].value;
        const regex =
          /^\d{3}-(PO|SPK)-[A-Z]{1,5}-(A|B|C|D|E|F|G|5\.1\.1|5\.1\.2|5\.1\.6)$/;
        const isValid = regex.test(purchaseOrderName);
        if (isValid) {
          // set the project name based on the purchase order name
          const projectName = purchaseOrderName.split('-')[2];
          const expenseType = purchaseOrderName.split('-')[3];
          this.metaFormGroup.controls['projectName'].setValue(projectName);
          this.metaFormGroup.controls['purchaseType'].setValue(expenseType);
        } else {
          // set the project name to empty string if the purchase order name is not valid
          this.metaFormGroup.controls['projectName'].setValue('');
        }
      }
    );
  }

  openSupplierSelector() {
    this.dialog
      .open(SupplierSelectorComponent, {})
      .afterClosed()
      .subscribe((data) => {
        if (data) {
          this.metaFormGroup.patchValue({
            supplierID: data.id,
            supplierName: data.name,
            supplierAddress: data.address,
          });
        }
      });
  }

  openPPHSelector() {
    this.dialog
      .open(PphSelectorComponent, {})
      .afterClosed()
      .subscribe((data) => {
        if (data) {
          const pph = data as IPPh;
          this.valueFormGroup.patchValue({
            pphCode: pph.code,
            pphTaxObject: pph.taxObjectName,
            pphPercentage: pph.tariff,
          });
        } else {
          this.valueFormGroup.patchValue({
            pphCode: '',
            pphTaxObject: '',
            pphPercentage: 0,
          });
        }
      });

    this.isFinal = false;
  }

  calculateTotal() {
    const dpp = this.valueFormGroup.controls['dpp'].value;
    const ppn = this.valueFormGroup.controls['ppn'].value;
    const pbbkb = this.valueFormGroup.controls['pbbkb'].value;
    const total = dpp + (dpp * ppn) / 100 + pbbkb;
    const pph = this.valueFormGroup.controls['pphPercentage'].value;
    const pphValue = (total * pph) / 100;
    const otherValue = this.valueFormGroup.controls['otherValue'].value;

    this.valueFormGroup.patchValue({
      total: total + otherValue,
    });

    this.paymentFormGroup.patchValue({
      paymentTotal: total + otherValue - pphValue,
    });

    this.isFinal = true;
  }

  onSubmit() {
    this.isSubmitting = true;
    this.apiService
      .post('purchases', {
        invoiceName: this.metaFormGroup.controls['invoiceName'].value,
        receiptName: this.metaFormGroup.controls['receiptName'].value,
        taxInvoiceName: this.metaFormGroup.controls['taxInvoiceName'].value,
        supplierID: this.metaFormGroup.controls['supplierID'].value,
        date: this.metaFormGroup.controls['date'].value,
        dueDate: this.metaFormGroup.controls['dueDate'].value,
        purchaseOrderName:
          this.metaFormGroup.controls['purchaseOrderName'].value,
        projectName: this.metaFormGroup.controls['projectName'].value,
        purchaseType: this.metaFormGroup.controls['purchaseType'].value,
        dpp: this.valueFormGroup.controls['dpp'].value,
        ppn: this.valueFormGroup.controls['ppnValue'].value,
        pbbkb: this.valueFormGroup.controls['pbbkb'].value,
        pphCode: this.valueFormGroup.controls['pphCode'].value,
        pphTaxObject: this.valueFormGroup.controls['pphTaxObject'].value,
        pphPercentage: this.valueFormGroup.controls['pphPercentage'].value,
        otherValue: this.valueFormGroup.controls['otherValue'].value,
        otherValueNote: this.valueFormGroup.controls['otherValueNote'].value,
        isInvoiceAttached:
          this.attachmentFormGroup.controls['isInvoiceAttached'].value,
        isReceiptAttached:
          this.attachmentFormGroup.controls['isReceiptAttached'].value,
        isTaxInvoiceAttached:
          this.attachmentFormGroup.controls['isTaxInvoiceAttached'].value,
        isCopAttached: this.attachmentFormGroup.controls['isCopAttached'].value,
        isCopyPurchaseOrderAttached:
          this.attachmentFormGroup.controls['isCopyPurchaseOrderAttached']
            .value,
        bankName: this.paymentFormGroup.controls['bankName'].value,
        bankAccountName:
          this.paymentFormGroup.controls['bankAccountName'].value,
        bankAccountNumber:
          this.paymentFormGroup.controls['bankAccountNumber'].value,
        paymentMethod: this.paymentFormGroup.controls['paymentMethod'].value,
      })
      .subscribe({
        next: (data) => {
          this.stepper?.reset();
          this.snackBar.open('Purchase created successfully', 'Close', {
            duration: 3000,
          });

          this.metaFormGroup.reset();
          this.valueFormGroup.reset();
          this.attachmentFormGroup.reset();
          this.paymentFormGroup.reset();
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

  get isValid() {
    return (
      this.metaFormGroup.valid &&
      this.valueFormGroup.valid &&
      this.attachmentFormGroup.valid &&
      this.paymentFormGroup.valid
    );
  }
}
