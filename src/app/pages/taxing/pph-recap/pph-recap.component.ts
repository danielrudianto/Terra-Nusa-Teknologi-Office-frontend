import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from 'src/app/services/api.service';
import * as xlsx from 'xlsx';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-pph-recap',
  standalone: true,
  templateUrl: './pph-recap.component.html',
  styleUrl: './pph-recap.component.scss',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCheckboxModule,
    MatSelectModule,
    MatDialogModule,
    MatSlideToggleModule,
    MatInputModule,
    MatButtonModule,
  ],
})
export class PphRecapComponent {
  // period passed from the tax hub (select month/year once, reused everywhere)
  private periodData: any = inject(MAT_DIALOG_DATA, { optional: true });

  months: { n: number; label: string }[] = [
    { n: 1, label: 'Jan' },
    { n: 2, label: 'Feb' },
    { n: 3, label: 'Mar' },
    { n: 4, label: 'Apr' },
    { n: 5, label: 'Mei' },
    { n: 6, label: 'Jun' },
    { n: 7, label: 'Jul' },
    { n: 8, label: 'Agu' },
    { n: 9, label: 'Sep' },
    { n: 10, label: 'Okt' },
    { n: 11, label: 'Nov' },
    { n: 12, label: 'Des' },
  ];

  ngOnInit(): void {
    if (this.periodData?.month && this.periodData?.year) {
      this.formGroup.patchValue({
        month: this.periodData.month,
        year: this.periodData.year,
      });
    }
  }

  constructor(
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private datePipe: DatePipe,
  ) {}

  isLoading: boolean = false;

  formGroup: FormGroup = new FormGroup({
    month: new FormControl('', Validators.required),
    year: new FormControl('', Validators.required),
  });

  onSubmit() {
    this.isLoading = true;
    this.apiService
      .get('taxes/pph', this.formGroup.value)
      .subscribe({
        next: (data: any) => {
          const worksheet: xlsx.WorkSheet = xlsx.utils.aoa_to_sheet([]);
          xlsx.utils.sheet_add_aoa(
            worksheet,
            [
              [
                'Date',
                'Payment date',
                'Prefix',
                'Name',
                'NPWP',
                'Project name',
                'Purchase order name',
                'Invoice name',
                'Receipt name',
                'Tax invoice name',
                'DPP',
                'PPN',
                'PPh',
                'PPh value',
                'PPh Code',
                'PPh Tax Object',
                'Current payment',
                'Previous payment',
              ],
            ],
            { origin: 0 },
          );

          data.purchase.forEach((x: any) => {
            xlsx.utils.sheet_add_aoa(
              worksheet,
              [
                [
                  this.datePipe.transform(new Date(x.date), 'dd MMMM yyyy'),
                  this.datePipe.transform(
                    new Date(x.payment_date),
                    'dd MMMM yyyy',
                  ),
                  x.supplier_prefix,
                  x.supplier_name,
                  x.supplier_npwp,
                  x.projectName,
                  x.purchaseOrderName,
                  x.invoiceName,
                  x.receiptName,
                  x.taxInvoiceName,
                  x.dpp,
                  (x.ppn * x.dpp) / 100,
                  x.pphPercentage,
                  (x.pphPercentage * x.dpp) / 100,
                  x.pphCode,
                  x.pphTaxObject,
                  x.amount,
                  x.previous_amount,
                ],
              ],
              { origin: -1 },
            );
          });

          const wscols = [
            { wpx: 110 }, // width in pixels
            { wpx: 50 }, // width in pixels
            { wpx: 220 }, // width in pixels
            { wpx: 140 }, // width in pixels
            { wpx: 180 }, // width in pixels
            { wpx: 180 }, // width in pixels
            { wpx: 180 }, // width in pixels
            { wpx: 100 }, // width in pixels
            { wpx: 100 }, // width in pixels
            { wpx: 100 }, // width in pixels
            { wpx: 100 }, // width in pixels
            { wpx: 80 }, // width in pixels
            { wpx: 200 }, // width in pixels
            { wpx: 180 }, // width in pixels
            { wpx: 180 }, // width in pixels
          ];

          worksheet['!cols'] = wscols;

          const expenseWorksheet: xlsx.WorkSheet = xlsx.utils.aoa_to_sheet([]);
          xlsx.utils.sheet_add_aoa(
            expenseWorksheet,
            [
              [
                'Date',
                'Payment date',
                'Name',
                'NPWP',
                'Invoice name',
                'Receipt name',
                'DPP',
                'PPh',
                'PPh value',
                'PPh Code',
                'PPh Tax Object',
                'Current payment',
                'Previous payment',
              ],
            ],
            { origin: 0 },
          );

          data.expense.forEach((x: any) => {
            xlsx.utils.sheet_add_aoa(
              expenseWorksheet,
              [
                [
                  this.datePipe.transform(new Date(x.date), 'dd MMMM yyyy'),
                  this.datePipe.transform(
                    new Date(x.payment_date),
                    'dd MMMM yyyy',
                  ),
                  x.opponent_name,
                  x.opponent_npwp,
                  x.invoiceName,
                  x.receiptName,
                  x.dpp,
                  x.pphPercentage,
                  (x.pphPercentage * x.dpp) / 100,
                  x.pphCode,
                  x.pphTaxObject,
                  x.amount,
                  x.previous_amount,
                ],
              ],
              { origin: -1 },
            );
          });

          const expenseWscols = [
            { wpx: 110 }, // width in pixels
            { wpx: 220 }, // width in pixels
            { wpx: 140 }, // width in pixels
            { wpx: 180 }, // width in pixels
            { wpx: 180 }, // width in pixels
            { wpx: 100 }, // width in pixels
            { wpx: 100 }, // width in pixels
            { wpx: 100 }, // width in pixels
            { wpx: 80 }, // width in pixels
            { wpx: 200 }, // width in pixels
            { wpx: 180 }, // width in pixels
            { wpx: 180 }, // width in pixels
          ];

          expenseWorksheet['!cols'] = expenseWscols;

          const workbook: xlsx.WorkBook = xlsx.utils.book_new();
          xlsx.utils.book_append_sheet(workbook, worksheet, 'Purchase');
          xlsx.utils.book_append_sheet(workbook, expenseWorksheet, 'Expense');

          const excelBuffer: any = xlsx.write(workbook, {
            bookType: 'xlsx',
            type: 'array',
          });
          this.saveAsExcelFile(
            excelBuffer,
            `PPh Recap ${Number(this.formGroup.value.month)} ${
              this.formGroup.value.year
            }`,
          );
        },
        error: (error) => {
          this.snackBar.open(error.error.detail, 'Close', {
            duration: 3000,
          });
        },
      })
      .add(() => {
        this.isLoading = false;
      });
  }

  private saveAsExcelFile(buffer: any, fileName: string): void {
    const data: Blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
    });
    saveAs(data, `${fileName}}.xlsx`);
  }
}
