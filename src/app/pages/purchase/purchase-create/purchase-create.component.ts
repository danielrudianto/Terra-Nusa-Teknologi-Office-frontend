import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatStepper } from '@angular/material/stepper';
import { PphSelectorComponent } from 'src/app/components/pph-selector/pph-selector.component';
import { SupplierSelectorComponent } from 'src/app/components/supplier-selector/supplier-selector.component';
import { ApiService } from 'src/app/services/api.service';
import { banks, IBank } from 'src/app/utils/bank';
import { IPPh } from 'src/app/utils/pph';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

pdfMake.vfs = pdfFonts.vfs;

import {
  Alignment,
  Margins,
  PageOrientation,
  PageSize,
} from 'pdfmake/interfaces';

@Component({
  selector: 'app-purchase-create',
  templateUrl: './purchase-create.component.html',
  styleUrls: ['./purchase-create.component.scss'],
  standalone: false,
})
export class PurchaseCreateComponent {
  constructor(
    private apiService: ApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  @ViewChild('stepper') stepper: MatStepper | undefined;
  @ViewChild('input') input!: ElementRef<HTMLInputElement>;

  filteredOptions: IBank[] = [];
  options: IBank[] = banks;
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
    taxInvoiceName: new FormControl('', Validators.maxLength(17)),
    supplierID: new FormControl('', Validators.required),
    supplierName: new FormControl(''),
    supplierAddress: new FormControl(''),
    date: new FormControl('', Validators.required),
    dueDate: new FormControl('', Validators.required),
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
      Validators.requiredTrue
    ),
  });

  paymentFormGroup: FormGroup = new FormGroup({
    bankName: new FormControl('', Validators.required),
    bankAccountName: new FormControl('', Validators.required),
    bankAccountNumber: new FormControl('', Validators.required),
    paymentMethod: new FormControl('', Validators.required),
    paymentTotal: new FormControl(0, [Validators.required, Validators.min(0)]),
    proxyPayment: new FormControl(false),
  });

  ngOnInit() {}

  ngAfterViewInit() {
    this.valueFormGroup.controls['ppn'].valueChanges.subscribe((value) => {
      if (value) {
        this.valueFormGroup.controls['ppnValue'].setValue(
          ((this.valueFormGroup.controls['dpp'].value * value) / 100).toFixed(2)
        );
      } else {
        this.valueFormGroup.controls['ppnValue'].setValue(0);
      }

      this.isFinal = false;
    });

    this.valueFormGroup.controls['dpp'].valueChanges.subscribe((value) => {
      if (value) {
        this.valueFormGroup.controls['ppnValue'].setValue(
          ((this.valueFormGroup.controls['ppn'].value * value) / 100).toFixed(2)
        );

        const pphPercentage =
          this.valueFormGroup.controls['pphPercentage'].value;
        const pphValue = (value * pphPercentage) / 100;
        this.valueFormGroup.controls['pphValue'].setValue(pphValue.toFixed(2));
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
      .open(SupplierSelectorComponent, {
        minWidth: '400px',
      })
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

          const pphPercentage =
            this.valueFormGroup.controls['pphPercentage'].value;
          const dpp = this.valueFormGroup.controls['dpp'].value;
          const pphValue = (dpp * pphPercentage) / 100;
          this.valueFormGroup.controls['pphValue'].setValue(
            pphValue.toFixed(2)
          );
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
    const dpp = Number(this.valueFormGroup.controls['dpp'].value);
    const ppn = Number(this.valueFormGroup.controls['ppn'].value);
    const pbbkb = Number(this.valueFormGroup.controls['pbbkb'].value);
    const total = dpp + (dpp * ppn) / 100 + pbbkb;
    const pph = Number(this.valueFormGroup.controls['pphPercentage'].value);
    const pphValue = (dpp * pph) / 100;
    const otherValue = Number(this.valueFormGroup.controls['otherValue'].value);

    this.valueFormGroup.patchValue({
      total: (total + otherValue).toFixed(2),
    });

    this.paymentFormGroup.patchValue({
      paymentTotal: (total + otherValue - pphValue).toFixed(2),
    });

    this.isFinal = true;
  }

  filter(): void {
    const filterValue = this.input.nativeElement.value.toLowerCase();
    this.filteredOptions = this.options.filter(
      (option) =>
        option.name.toLowerCase().includes(filterValue) ||
        option.alias.toLowerCase().includes(filterValue)
    );
  }

  onSubmit() {
    const date = new Date(this.metaFormGroup.controls['date'].value);
    const dueDate = new Date(this.metaFormGroup.controls['dueDate'].value);

    const dateFormatted = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    const dueDateFormatted = `${dueDate.getFullYear()}-${String(
      dueDate.getMonth() + 1
    ).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}`;
    this.isSubmitting = true;
    this.apiService
      .post('purchases', {
        invoiceName: this.metaFormGroup.controls['invoiceName'].value,
        receiptName: this.metaFormGroup.controls['receiptName'].value,
        taxInvoiceName: this.metaFormGroup.controls['taxInvoiceName'].value,
        supplierID: this.metaFormGroup.controls['supplierID'].value,
        // change from date object to YYYY-MM-DD
        date: dateFormatted,
        dueDate: dueDateFormatted,
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
        next: (_) => {
          this.stepper?.reset();
          this.snackBar.open('Purchase created successfully', 'Close', {
            duration: 3000,
          });

          if (this.paymentFormGroup.controls['proxyPayment'].value == true) {
            this.generateProxyPaymentPDF();
          }

          this.metaFormGroup.reset();
          this.valueFormGroup.reset();

          this.metaFormGroup.patchValue({
            invoiceName: '',
            receiptName: '',
            taxInvoiceName: '',
            supplierID: '',
            supplierName: '',
            supplierAddress: '',
            date: '',
            dueDate: '',
            purchaseOrderName: '',
            projectName: '',
            purchaseType: '',
          })

          this.valueFormGroup.patchValue({
            pbbkb: 0,
            otherValue: 0,
            pphPercentage: 0,
            pphTaxObject: '',
            pphCode: '',
          });

          this.attachmentFormGroup.reset();

          this.attachmentFormGroup.patchValue({
            isInvoiceAttached: false,
            isReceiptAttached: false,
            isTaxInvoiceAttached: false,
            isCopAttached: false,
            isCopyPurchaseOrderAttached: false,
          });

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

  generateProxyPaymentPDF() {
    const invoiceName = this.metaFormGroup.controls['invoiceName'].value;
    const receiptName = this.metaFormGroup.controls['receiptName'].value;
    const taxInvoiceName = this.metaFormGroup.controls['taxInvoiceName'].value;
    const supplierName = this.metaFormGroup.controls['supplierName'].value;
    const bankName = this.paymentFormGroup.controls['bankName'].value;
    const bankAccountName =
      this.paymentFormGroup.controls['bankAccountName'].value;
    const totalPayment = this.paymentFormGroup.controls['paymentTotal'].value;
    const date = new Date(this.metaFormGroup.controls['date'].value);

    var dd = {
      pageSize: 'A4' as PageSize,
      pageOrientatation: 'portrait' as PageOrientation,
      pageMargins: [40, 20, 40, 20] as Margins,
      fontSize: 12,
      content: [
        {
          text: 'Surat Pengalihan Pembayaran',
          style: 'header',
          alignment: 'center' as Alignment,
        },
        // add a divider
        {
          table: {
            widths: ['*'],
            body: [[' '], [' ']],
          },
          layout: {
            hLineWidth: function (i: number, node: any) {
              return i === 0 || i === node.table.body.length ? 0 : 2;
            },
            vLineWidth: function (i: number, node: any) {
              return 0;
            },
          },
        },
        // Create table
        {
          table: {
            widths: [200, '*'],
            body: [
              [
                {
                  text: 'Saya yang bertanda tangan di bawah ini:\n\n',
                  colSpan: 2,
                  alignment: 'left' as Alignment,
                },
                {},
              ],
              [{ text: 'Nama' }, { text: ': Michael Andi Rudianto' }],
              [{ text: 'Jabatan' }, { text: ': Direktur' }],
              [
                {
                  text: '\ntelah menyetujui pengalihan pembayaran atas pembelian dengan rincian sebagai berikut:\n\n',
                  colSpan: 2,
                  alignment: 'left' as Alignment,
                },
                {},
              ],
              [{ text: 'Vendor' }, { text: `: ${supplierName}` }],
              [
                { text: 'Tanggal faktur' },
                {
                  text: `: ${
                    // date in dd MMMM YYYY
                    date.toLocaleDateString('id-ID', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  }`,
                },
              ],
              [
                { text: 'Nomor faktur' },
                {
                  text: `: ${invoiceName}`,
                },
              ],
              [
                { text: 'Nomor faktur pajak' },
                {
                  text: `: ${
                    taxInvoiceName == '' || taxInvoiceName == null
                      ? '-'
                      : taxInvoiceName
                  }`,
                },
              ],
              [
                {
                  text: '\nPembayaran atas pembelian ini akan dibayarkan melalui rekening dengan rincian sebagai berikut:\n\n',
                  colSpan: 2,
                  alignment: 'left' as Alignment,
                },
                {},
              ],
              [{ text: 'Nama Bank' }, { text: `: ${bankName}` }],
              [{ text: 'Nama Rekening' }, { text: `: ${bankAccountName}` }],
              [
                { text: 'Total Pembayaran' },
                {
                  text: `: ${
                    totalPayment
                      .toString()
                      .replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',00'
                  }`,
                },
              ],
              [
                {
                  text: '\nDemikian informasi ini saya buat sebagai bukti pembayaran kepada PT. Alpha Konstruksi Nusantara.\n\n',
                  colSpan: 2,
                  alignment: 'left' as Alignment,
                },
                {},
              ],
            ],
          },
          layout: 'noBorders',
        },
        {
          text: '\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n',
        },
        {
          table: {
            widths: ['*', '*'],
            body: [
              [
                {
                  text: 'Disetujui,\n\n\n\n\n\n\n',
                },
                {
                  text: 'Diketahui,\n\n\n\n\n\n\n',
                },
              ],
              [
                {
                  stack: [
                    {
                      text: 'Michael Andi Rudianto',
                      alignment: 'center' as Alignment,
                    },
                    {
                      text: 'Direktur Utama',
                      alignment: 'center' as Alignment,
                    },
                  ],
                },
                {
                  stack: [
                    {
                      text: 'Bag. Keuangan',
                      alignment: 'center' as Alignment,
                    },
                    {
                      text: 'PT. Alpha Konstruksi Nusantara',
                      alignment: 'center' as Alignment,
                    },
                  ],
                },
              ],
            ],
          },
        },
      ],
      footer: {
        table: {
          width: ['auto', '*'],
          body: [
            [
              {
                image:
                  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAlgCWAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAHRAbYDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+iiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACis6717S7DVLTTLq9iivLv8A1MTHlvT2GTwM4yeBk1o0k09hKSeiCiiimMKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKZLLHBC800iRxRqWd3OFUDkkk9BQA+vPvHHxJtdFhn07SJUn1UMY3YLlLc9yc8M3OMcgEHPTB57xt8UpLlvsPhq4eO32/vbwJtZ8j7qbhlQM/e4OemMZPltebicbb3af3/5HkYvMLe5S+/8AyLF/f3Wp3017ezvPczNueRupP9B2AHAHFeleCfilJbN9h8S3DyW+391eFNzJgfdfaMsDj73Jz1znI8torgp1p05c0WeZSr1KU+eL/wCCfWMUsc8KTQyJJFIoZHQ5VgeQQR1FPr578G+P9Q8MTQ20zPc6TuO+343JnqyE9D325wcnoTke7aTrGn67Yi90y6S4tyxXcoIII6gg4IP1HQg969mhiI1VpufQYbFwrrTR9i9RRRXQdQUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFc74p8Z6X4Vtz9qk8y8eMvDap96TnAycYUZ7n0OMkYq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',
                width: 10,
                alignment: 'center',
                margin: [0, 0, 0, 0] as Margins,
              },
              {
                text: "This document is generated by TerraBot system. For green purpose, this document is not printed. Please don't print this document unless it's necessary.",
                fontSize: 8,
              },
            ],
          ],
        },
        layout: 'noBorders',
        margin: [15, 2, 2, 2] as Margins,
        alignment: 'center' as Alignment,
      },
      styles: {
        header: {
          fontSize: 16,
          bold: true,
          margin: [0, 0, 0, 5] as Margins,
        },
      },
    };

    pdfMake.createPdf(dd).open();
  }
}
