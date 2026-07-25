import { Component, Inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from 'src/app/services/api.service';
import { saveAs } from 'file-saver';
import * as xlsx from 'xlsx';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-bank-mutation-download',
  providers: [DatePipe],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    MatButtonModule,
  ],
  templateUrl: './bank-mutation-download.component.html',
  styleUrl: './bank-mutation-download.component.scss',
})
export class BankMutationDownloadComponent {
  constructor(
    private datePipe: DatePipe,
    @Inject(MAT_DIALOG_DATA) public data: { id: number },
    private apiService: ApiService,
    private snackBar: MatSnackBar,
  ) {}

  isLoading: boolean = false;
  formGroup: FormGroup = new FormGroup({
    month: new FormControl(new Date().getMonth() + 1, Validators.required),
    year: new FormControl(new Date().getFullYear(), [
      Validators.required,
      Validators.min(2023),
      Validators.max(new Date().getFullYear()),
    ]),
  });

  download() {
    this.isLoading = true;

    this.apiService
      .post(`banks/mutation/download`, {
        bankAccountID: this.data.id,
        month: this.formGroup.value.month,
        year: this.formGroup.value.year,
      })
      .subscribe({
        next: (data: any) => {
          const worksheet: xlsx.WorkSheet = xlsx.utils.aoa_to_sheet([]);
          xlsx.utils.sheet_add_aoa(
            worksheet,
            [
              [
                'Date',
                'Opponent',
                'Document',
                'Reference',
                'Amount',
                'Balance',
              ],
            ],
            { origin: 0 },
          );
          const numberFormat = '#,##0.00';
          const wrapTextStyle = { alignment: { wrapText: true } };

          let rowIndex = 2; // Excel row (header di row 1)

          data.forEach((x: any, i: number) => {
            const row = [
              // Date (REAL Excel date)
              { v: new Date(x.date), t: 'd', z: 'dd mmmm yyyy' },

              // Opponent (wrap text)
              { v: x.opponent ?? '', t: 's', s: wrapTextStyle },

              // Document (wrap text)
              { v: x.document ?? '', t: 's', s: wrapTextStyle },

              // Reference (wrap text)
              { v: x.reference ?? '', t: 's', s: wrapTextStyle },

              // Amount (number + thousand separator)
              { v: x.amount, t: 'n', z: numberFormat },

              // Balance
              i === 0
                ? // saldo awal → angka biasa
                  { v: x.balance, t: 'n', z: numberFormat }
                : // saldo berikutnya → FORMULA
                  { f: `F${rowIndex - 1} + E${rowIndex}`, z: numberFormat },
            ];

            xlsx.utils.sheet_add_aoa(worksheet, [row], { origin: -1 });
            rowIndex++;
          });

          /* =========================
           * 5. COLUMN WIDTH
           * ========================= */
          worksheet['!cols'] = [
            { wpx: 120 }, // Date
            { wpx: 220 }, // Opponent
            { wpx: 200 }, // Document
            { wpx: 200 }, // Reference
            { wpx: 140 }, // Amount
            { wpx: 140 }, // Balance
          ];

          /* =========================
           * 6. ROW HEIGHT (biar wrap keliatan)
           * ========================= */
          worksheet['!rows'] = [
            {}, // header
            ...data.map(() => ({ hpx: 40 })),
          ];

          /* =========================
           * 7. CREATE WORKBOOK
           * ========================= */
          const workbook: xlsx.WorkBook = xlsx.utils.book_new();
          xlsx.utils.book_append_sheet(workbook, worksheet, 'Mutation');

          /* =========================
           * 8. EXPORT FILE
           * ========================= */
          const excelBuffer = xlsx.write(workbook, {
            bookType: 'xlsx',
            type: 'array',
          });

          this.saveAsExcelFile(
            excelBuffer,
            `Bank Mutation ${this.formGroup.value.month}-${this.formGroup.value.year}`,
          );
        },
        error: (error) => {
          this.snackBar.open(
            error.error?.detail ?? 'Download failed',
            'Close',
            {
              duration: 3000,
            },
          );
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
