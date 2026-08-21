import { CommonModule } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { Component, Inject, inject } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from 'src/app/services/api.service';
import { TranslatePipe } from '@ngx-translate/core';
import { ProjectSelectorComponent } from '../../../components/project-selector/project-selector.component';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { DialogGeserDirective } from '../../../directives/dialog-geser.directive';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { JENIS_NILAI_LAIN } from 'src/app/constants/jenis-nilai-lain';
import { POLA_NOMOR_PO } from '../../../constants/nomor-dokumen';

function bankAccountIDRequired(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const createPayment = group.get('createPayment')?.value;
    const bankAccountID = group.get('bankAccountID');
    if (createPayment && bankAccountID?.value == null) {
      bankAccountID?.setErrors({ required: true });
      return { bankAccountIDRequired: true };
    } else {
      // Only clear if this was the error set by this validator
      if (bankAccountID?.hasError('required')) {
        bankAccountID.setErrors(null);
      }
      return null;
    }
  };
}

@Component({
  selector: 'app-purchase-update',
  standalone: true,
  templateUrl: './purchase-update.component.html',
  styleUrl: './purchase-update.component.scss',
  imports: [
    ProjectSelectorComponent,
    TranslatePipe,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    ReactiveFormsModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatDividerModule,
    MatSelectModule,
    CommonModule,
    MatSlideToggleModule,
    DialogGeserDirective,
    NgxMaskDirective,
  ],
  // `provideNgxMask()` WAJIB ada di komponen yang memakai mask;
  // tanpa itu atribut `mask` hanya teks yang diabaikan Angular.
  providers: [provideNgxMask()],
})
export class PurchaseUpdateComponent {
  /** Jenis nilai lain; satu sumber untuk seluruh layar pembelian. */
  readonly jenisNilaiLain = JENIS_NILAI_LAIN;

  private readonly translate = inject(TranslateService);
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { id: number },
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialogRef<PurchaseUpdateComponent>,
  ) {}

  isSubmitting: boolean = false;
  /** Muat awal: spinner dulu, supaya kolomnya tidak berkedip kosong. */
  memuat: boolean = true;
  purchaseType = null;
  metaFormGroup: FormGroup = new FormGroup({
    id: new FormControl(this.data.id),
    invoiceName: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    receiptName: new FormControl('', Validators.maxLength(100)),
    taxInvoiceName: new FormControl('', Validators.maxLength(17)),
    supplierID: new FormControl('', Validators.required),
    supplierName: new FormControl(''),
    supplierAddress: new FormControl(''),
    date: new FormControl('', Validators.required),
    dueDate: new FormControl('', Validators.required),
    purchaseOrderName: new FormControl('', [
      Validators.required,
      Validators.pattern(
        POLA_NOMOR_PO,
      ),
    ]),
    projectName: new FormControl('', [
      Validators.required,
      Validators.minLength(4),
      Validators.maxLength(5),
    ]),
    purchaseType: new FormControl('', [
      Validators.required,
      Validators.pattern(
        /^\A|B|C|D|E|F|G|H1|H2|5\.1\.1|5\.1\.2|5\.1\.6|5\.1\.7|6\.3\.1|6\.3\.2|5\.1\.12|6\.4\.1$/,
      ),
    ]),
    lastStatus: new FormControl('ready', Validators.required),
    lastStatusDescription: new FormControl(''),
    isInternal: new FormControl(false, Validators.required),
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
      Validators.requiredTrue,
    ),
  });

  paymentFormGroup: FormGroup = new FormGroup(
    {
      bankName: new FormControl('', Validators.required),
      bankAccountName: new FormControl('', Validators.required),
      bankAccountNumber: new FormControl('', [
        Validators.required,
        Validators.pattern(/^[0-9]+$/),
      ]),
      paymentMethod: new FormControl('', Validators.required),
      paymentTotal: new FormControl(0, [
        Validators.required,
        Validators.min(0),
      ]),
      proxyPayment: new FormControl(false),
      createPayment: new FormControl(false),
      bankAccountID: new FormControl(''),
    },
    {
      validators: bankAccountIDRequired(),
    },
  );

  ngOnInit(): void {
    this.fetchData(this.data.id);
  }

  fetchData(id: number) {
    this.apiService.get('purchases/' + id, {}).subscribe({
      next: (resp: any) => {
        /*
         * `GET purchases/{id}` MEMBUNGKUS jawabannya: `{ purchase, payments }`.
         *
         * Layar ini sejak dulu membaca `resp.invoiceName`, `resp.dpp`, dan
         * seterusnya — yang semuanya `undefined` karena isinya ada satu
         * tingkat di dalam `resp.purchase`. Itulah "semuanya undefined":
         * bukan datanya kosong, melainkan dibaca dari tingkat yang salah.
         * Dibuka di sini supaya seluruh `data.*` di bawah menunjuk ke isian
         * pembeliannya, bukan ke pembungkusnya.
         */
        const data: any = resp?.purchase ?? resp;
        if (data.isInternal == false) {
          this.snackBar.open(
      this.translate.instant('notify.notInternalData'), 'Close', {
            duration: 3000,
          });
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
          /*
           * Pemasok ada di OBJEK `supplier`, bukan di bidang `supplier_*`.
           *
           * `GET purchases/{id}` sudah lama menyusun ulang kolom pemasoknya
           * menjadi satu objek `data.supplier = {id, name, address, ...}` dan
           * MEMBUANG bidang `supplier_id`, `supplier_name`, dan seterusnya.
           * Layar ini masih membaca bidang lama yang sudah tidak ada, sehingga
           * yang muncul "undefined, undefined" — dan `supplierID` kosong
           * membuat penyimpanan gagal validasi diam-diam.
           */
          supplierID: data.supplier?.id,
          supplierName: [data.supplier?.name, data.supplier?.prefix]
            .filter((x: any) => x != null && x !== '')
            .join(', '),
          supplierAddress: [
            data.supplier?.address,
            data.supplier?.city,
            data.supplier?.province,
          ]
            .filter((x: any) => x != null && x !== '')
            .join(', '),
          /*
           * Keadaan dokumen IKUT DIMUAT.
           *
           * Sebelumnya tidak, dan bawaannya 'ready'. Pembelian yang tersimpan
           * 'draft' — belum lengkap berkasnya, belum boleh dibayar — DIAM-DIAM
           * menjadi 'ready' begitu ada yang menyuntingnya, sekalipun yang
           * diubah hanya satu huruf pada nomor faktur. Keterangan alasannya
           * ikut hilang, dan tidak ada satu pun galat yang menyertainya.
           */
          lastStatus: data.lastStatus ?? 'ready',
          lastStatusDescription: data.lastStatusDescription ?? '',
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
          pphTaxObject: data.pphTaxObject,
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

        this.purchaseType = data.purchaseType;
      },
      error: (error) => {
        console.error(error);
        this.snackBar.open(
      this.translate.instant('notify.loadFailed'), 'Close', {
          duration: 3000,
        });
        this.dialog.close();
      },
    }).add(() => (this.memuat = false));
  }

  onSubmit() {
    // Enter di dalam form ikut memanggil ini; jadi penjaganya di sini, bukan
    // hanya pada keadaan tombolnya. Tanpa ini, menekan Enter saat kolom masih
    // salah tetap mengirim.
    if (this.isSubmitting || this.memuat) return;
    if (this.metaFormGroup.invalid || this.attachmentFormGroup.invalid) {
      this.metaFormGroup.markAllAsTouched();
      this.attachmentFormGroup.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const date = new Date(this.metaFormGroup.controls['date'].value);
    const dueDate = new Date(this.metaFormGroup.controls['dueDate'].value);

    const dateFormatted = `${date.getFullYear()}-${String(
      date.getMonth() + 1,
    ).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const dueDateFormatted = `${dueDate.getFullYear()}-${String(
      dueDate.getMonth() + 1,
    ).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}`;

    this.apiService
      .put('purchases/update', {
        id: this.metaFormGroup.value.id,
        invoiceName: this.metaFormGroup.controls['invoiceName'].value,
        receiptName: this.metaFormGroup.controls['receiptName'].value,
        taxInvoiceName:
          this.metaFormGroup.controls['taxInvoiceName'].value == ''
            ? null
            : this.metaFormGroup.controls['taxInvoiceName'].value,
        purchaseOrderName:
          this.metaFormGroup.controls['purchaseOrderName'].value,
        projectName: this.metaFormGroup.controls['projectName'].value,
        purchaseType: this.metaFormGroup.controls['purchaseType'].value,
        supplierID: this.metaFormGroup.controls['supplierID'].value,
        supplierName: this.metaFormGroup.controls['supplierName'].value,
        supplierAddress: this.metaFormGroup.controls['supplierAddress'].value,
        isInvoiceAttached: this.attachmentFormGroup.value.isInvoiceAttached,
        isReceiptAttached: this.attachmentFormGroup.value.isReceiptAttached,
        isTaxInvoiceAttached:
          this.attachmentFormGroup.value.isTaxInvoiceAttached,
        isCopAttached: this.attachmentFormGroup.value.isCopAttached,
        isCopyPurchaseOrderAttached:
          this.attachmentFormGroup.value.isCopyPurchaseOrderAttached,
        dueDate: dueDateFormatted,
        date: dateFormatted,
        procurementType: this.purchaseType,
        dpp: this.valueFormGroup.controls['dpp'].value,
        ppn: this.valueFormGroup.controls['ppn'].value,
        pbbkb: this.valueFormGroup.controls['pbbkb'].value,
        pphCode:
          this.valueFormGroup.controls['pphCode'].value == ''
            ? null
            : this.valueFormGroup.controls['pphCode'].value,
        pphTaxObject:
          this.valueFormGroup.controls['pphCode'].value == ''
            ? null
            : this.valueFormGroup.controls['pphTaxObject'].value,
        pphPercentage:
          this.valueFormGroup.controls['pphCode'].value == ''
            ? 0
            : this.valueFormGroup.controls['pphPercentage'].value,
        otherValue: this.valueFormGroup.controls['otherValue'].value,
        otherValueNote:
          this.valueFormGroup.controls['otherValue'].value == 0
            ? null
            : this.valueFormGroup.controls['otherValueNote'].value,
        bankName: this.paymentFormGroup.controls['bankName'].value,
        bankAccountName:
          this.paymentFormGroup.controls['bankAccountName'].value,
        bankAccountNumber:
          this.paymentFormGroup.controls['bankAccountNumber'].value,
        paymentMethod: this.paymentFormGroup.controls['paymentMethod'].value,
        lastStatus: this.metaFormGroup.controls['lastStatus'].value,
        /*
         * Dibandingkan dengan 'ready' HURUF KECIL.
         *
         * Yang tersimpan selalu huruf kecil — begitu yang ditulis layar
         * pembuatan, layar konversi draf, dan servernya. Perbandingan
         * berhuruf besar di sini tidak pernah cocok, sehingga keterangan
         * "menunggu faktur pajak" tetap menempel pada dokumen yang sudah
         * lengkap, dan terbaca sebagai dokumen yang masih kurang.
         */
        lastStatusDescription:
          this.metaFormGroup.controls['lastStatus'].value === 'ready'
            ? null
            : this.metaFormGroup.controls['lastStatusDescription'].value,
      })
      .subscribe({
        next: (data) => {
          this.snackBar.open(
      this.translate.instant('notify.updateSuccess'), 'Close', {
            duration: 3000,
          });

          this.dialog.close();
        },
        error: (error) => {
          console.error(error);
          /*
           * Kode tetap dari server dipetakan ke kalimat.
           *
           * "Gagal memperbarui" tidak memberi tahu apa pun; yang menekannya
           * akan mencoba lagi dengan hasil sama. Penolakan karena
           * pembayaran sudah ada perlu disebut sebabnya, karena jalan
           * keluarnya berbeda: minta yang berwenang, bukan ulangi.
           */
          const detail = error?.error?.detail;
          const kode = typeof detail === 'string' ? detail : detail?.code;
          const pesan =
            kode === 'PURCHASE_HAS_PAYMENTS'
              ? this.translate.instant('purchase.editHasPayments')
              : (detail?.message ??
                (typeof detail === 'string' ? detail : null) ??
                this.translate.instant('notify.updateFailed'));
          this.snackBar.open(pesan, 'Close', { duration: 6000 });
        },
      })
      .add(() => {
        this.isSubmitting = false;
      });
  }
}
