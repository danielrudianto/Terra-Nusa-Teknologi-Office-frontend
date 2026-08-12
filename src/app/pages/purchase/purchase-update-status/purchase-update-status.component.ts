import { CommonModule } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { Component, inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import moment from 'moment';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { HeaderTitleComponent } from 'src/app/components/header-title/header-title.component';
import { ApiService } from 'src/app/services/api.service';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-purchase-update-status',
  providers: [provideNgxMask()],
  imports: [
    TranslatePipe,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    HeaderTitleComponent,
    MatDatepickerModule,
    MatSelectModule,
    MatDividerModule,
    MatAutocompleteModule,
    MatSlideToggleModule,
    NgxMaskDirective,
  ],
  templateUrl: './purchase-update-status.component.html',
  styleUrl: './purchase-update-status.component.scss',
  standalone: true,
})
export class PurchaseUpdateStatusComponent {
  private readonly translate = inject(TranslateService);
  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {}

  isSubmitting: boolean = false;
  isLoading: boolean = false;

  metaFormGroup: FormGroup = new FormGroup({
    id: new FormControl('', Validators.required),
    invoiceName: new FormControl('', Validators.required),
    receiptName: new FormControl(''),
    taxInvoiceName: new FormControl('', [
      Validators.maxLength(17),
      Validators.pattern(/^[0-9]{0,17}$/),
    ]),
    supplierID: new FormControl('', Validators.required),
    supplierName: new FormControl(''),
    supplierAddress: new FormControl(''),
    date: new FormControl('', Validators.required),
    dueDate: new FormControl('', Validators.required),
    purchaseOrderName: new FormControl('', [
      Validators.required,
      Validators.pattern(
        /^\d{3,4}-(PO|SPK)-[A-Z0-9]{1,5}-(A|B|C|D|E|F|G|H1|H2|5\.1\.1|5\.1\.2|5\.1\.6|5\.1\.7|6\.3\.1|6\.3\.2|5\.1\.12|6\.4\.1|6\.4\.2|6\.5\.1)$/,
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
      Validators.requiredTrue,
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
      next: (response: any) => {
        const data = response.purchase;
        if (data.lastStatus == 'ready') {
          this.snackBar.open(
      this.translate.instant('notify.dataAlreadyComplete'), 'Close', {
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
          data.otherValue -
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
        this.snackBar.open(
      this.translate.instant('notify.loadFailed'), 'Close', {
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
        dueDate: moment(this.metaFormGroup.value.dueDate).format('YYYY-MM-DD'),
        date: moment(this.metaFormGroup.value.date).format('YYYY-MM-DD'),
      })
      .subscribe({
        next: (data) => {
          this.snackBar.open(
      this.translate.instant('notify.updateSuccess'), 'Close', {
            duration: 3000,
          });

          this.router.navigate(['/Purchase']);
        },
        error: (error) => {
          console.error(error);
          this.snackBar.open(
      this.translate.instant('notify.updateFailed'), 'Close', {
            duration: 3000,
          });
        },
      })
      .add(() => {
        this.isSubmitting = false;
      });
  }
}
