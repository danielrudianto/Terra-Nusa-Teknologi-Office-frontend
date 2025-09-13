import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import * as xlsx from 'xlsx';
import { saveAs } from 'file-saver';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-ppn-recap',
  standalone: false,
  templateUrl: './ppn-recap.component.html',
  styleUrl: './ppn-recap.component.scss',
})
export class PpnRecapComponent {
  constructor(
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private datePipe: DatePipe
  ) {}

  isLoading: boolean = false;

  formGroup: FormGroup = new FormGroup({
    month: new FormControl('', Validators.required),
    year: new FormControl('', Validators.required),
  });

  onSubmit() {
    this.isLoading = true;
    this.apiService
      .get('taxes/ppn', this.formGroup.value)
      .subscribe({
        next: (data: any) => {
          const worksheet: xlsx.WorkSheet = xlsx.utils.aoa_to_sheet([]);
          xlsx.utils.sheet_add_aoa(
            worksheet,
            [
              [
                'Date',
                'Prefix',
                'Name',
                'NPWP',
                'Invoice name',
                'Receipt name',
                'Tax invoice name',
                'DPP',
                'PPN',
              ],
            ],
            { origin: 0 }
          );

          data.forEach((x: any) => {
            xlsx.utils.sheet_add_aoa(
              worksheet,
              [
                [
                  this.datePipe.transform(new Date(x.date), 'dd MMMM YYYY'),
                  x.supplier_prefix,
                  x.supplier_name,
                  x.supplier_npwp,
                  x.invoiceName,
                  x.receiptName,
                  x.taxInvoiceName,
                  x.dpp,
                  (x.ppn * x.dpp) / 100,
                ],
              ],
              { origin: -1 }
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
          ];

          worksheet['!cols'] = wscols;

          const workbook: xlsx.WorkBook = xlsx.utils.book_new();
          xlsx.utils.book_append_sheet(workbook, worksheet, 'PPN');

          const excelBuffer: any = xlsx.write(workbook, {
            bookType: 'xlsx',
            type: 'array',
          });
          this.saveAsExcelFile(
            excelBuffer,
            `PPN Recap ${Number(this.formGroup.value.month) + 1} ${
              this.formGroup.value.year
            }.xlsx`
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
