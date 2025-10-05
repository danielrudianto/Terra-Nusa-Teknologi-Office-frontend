import { CommonModule, DatePipe } from '@angular/common';
import { Component, Inject } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatStepperModule } from '@angular/material/stepper';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-purchase-view',
  imports: [
    MatStepperModule,
    MatInputModule,
    MatDialogModule,
    MatButtonModule,
    CommonModule,
    NgxMaskDirective,
    ReactiveFormsModule,
    MatSelectModule,
    MatListModule,
  ],
  providers: [provideNgxMask()],
  templateUrl: './purchase-view.component.html',
  styleUrl: './purchase-view.component.scss',
})
export class PurchaseViewComponent {
  constructor(
    private apiService: ApiService,
    private dialog: MatDialogRef<PurchaseViewComponent>,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: { id: number },
    private formBuilder: FormBuilder,
    private datePipe: DatePipe
  ) {}

  isLoading: boolean = true;

  metaFormGroup: FormGroup = new FormGroup({
    supplierName: new FormControl('', Validators.required),
    supplierAddress: new FormControl('', Validators.required),
    invoiceName: new FormControl('', Validators.required),
    receiptName: new FormControl(''),
    taxInvoiceName: new FormControl(''),
    purchaseOrderName: new FormControl('', [
      Validators.required,
      Validators.pattern(
        /^\d{3,4}-(PO|SPK|PKS)-[A-Z0-9]{4,5}-(A|B|C|D|E|F|G|5\.1\.1|5\.1\.2|5\.1\.6|5\.1\.7|6\.3\.1|6\.3\.2|5\.1\.12|6\.4\.1)$/
      ),
    ]),
    purchaseType: new FormControl('', Validators.required),
    projectName: new FormControl('', Validators.required),
    lastStatus: new FormControl(''),
    date: new FormControl('', Validators.required),
    dueDate: new FormControl('', Validators.required),
    isInternal: new FormControl('', Validators.required),
  });

  valueFormGroup: FormGroup = new FormGroup({
    dpp: new FormControl(''),
    ppn: new FormControl(''),
    ppnValue: new FormControl(''),
    pphCode: new FormControl(''),
    pphTaxObject: new FormControl(''),
    pphPercentage: new FormControl(''),
    pph: new FormControl(''),
    pbbkb: new FormControl(''),
    otherValue: new FormControl(''),
    otherValueNote: new FormControl(''),
    total: new FormControl(''),
    paymentTotal: new FormControl(''),
    payments: new FormArray([]),
  });

  paymentFormGroup: FormGroup = new FormGroup({
    paymentMethod: new FormControl(''),
    bankName: new FormControl(''),
    bankAccountNumber: new FormControl(''),
    bankAccountName: new FormControl(''),
  });

  ngOnInit(): void {
    this.fetchData();
  }

  get f() {
    return this.valueFormGroup.controls;
  }

  get t(): FormArray {
    return this.f['payments'] as FormArray;
  }

  fetchData() {
    this.apiService.get('purchases/' + this.data.id, {}).subscribe({
      next: (data: any) => {
        this.metaFormGroup.patchValue({
          date: this.datePipe.transform(data.date, 'dd MMMM YYYY'),
          dueDate: this.datePipe.transform(data.dueDate, 'dd MMMM YYYY'),
          invoiceName: data.invoiceName,
          receiptName: data.receiptName,
          taxInvoiceName: data.taxInvoiceName,
          projectName: data.projectName,
          supplierName: `${data.supplier_name}, ${data.supplier_prefix}`,
          supplierAddress: `${data.supplier_address}, ${data.supplier_city}, ${data.supplier_province}`,
          lastStatus: data.lastStatus,
          purchaseOrderName: data.purchaseOrderName,
          isInternal: data.isInternal ? 'Yes' : 'No',
        });

        this.valueFormGroup.patchValue({
          dpp: data.dpp,
          ppn: data.ppn,
          ppnValue: ((data.ppn * data.dpp) / 100).toFixed(2),
          pphCode: data.pphCode,
          pphTaxObject: data.pphTaxObject,
          pphPercentage: data.pphPercentage,
          pph: ((data.pphPercentage * data.dpp) / 100).toFixed(2),
          pbbkb: data.pbbkb,
          otherValue: data.otherValue,
          otherValueNote: data.otherValueNote,
          total: (
            data.dpp +
            (data.ppn * data.dpp) / 100 +
            data.pbbkb +
            data.otherValue
          ).toFixed(2),
          paymentTotal: (
            data.dpp +
            (data.ppn * data.dpp) / 100 -
            (data.pphPercentage * data.dpp) / 100 +
            data.pbbkb +
            data.otherValue
          ).toFixed(2),
          lastStatus: data.lastStatus,
        });

        data.payments.forEach((x: any) => {
          this.t.push(
            this.formBuilder.group({
              id: [x.id],
              amount: [x.amount],
              date: [x.date],
            })
          );
        });

        this.paymentFormGroup.patchValue({
          paymentMethod: data.paymentMethod,
          bankName: data.bankName,
          bankAccountNumber: data.bankAccountNumber,
          bankAccountName: data.bankAccountName,
        });
      },
      error: (error) => {
        console.error('Error fetching purchase data:', error);
        this.snackBar.open('Error fetching purchase data', 'Close', {
          duration: 3000,
        });
      },
    });
  }

  formatDate(date: string): string {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return new Date(date).toLocaleDateString('id-ID', options);
  }

  deletePurchaseData() {
    this.dialog.close('delete');
  }
}
