import { DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from 'src/app/services/api.service';
import * as xlsx from 'xlsx';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-pph-salary-recap',
  standalone: false,
  templateUrl: './pph-salary-recap.component.html',
  styleUrl: './pph-salary-recap.component.scss',
})
export class PphSalaryRecapComponent {
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
      .get('taxes/pph-salary', this.formGroup.value)
      .subscribe({
        next: (data: any) => {
          const worksheet: xlsx.WorkSheet = xlsx.utils.aoa_to_sheet([]);
          xlsx.utils.sheet_add_aoa(
            worksheet,
            [
              [
                'Name',
                'NIK',
                'Position',
                'Department',
                'Tax class',
                'Basic salary',
                'Meal allowance',
                'Transportation allowance',
                'Overtime allowance',
                'Other allowances (Included in PPh Calculation)',
                'Other allowances (Excluded in PPh Calculation)',
                'Deduction (Included in PPh Calculation)',
                'Deduction (Excluded in PPh Calculation)',
                'Income (Used for PPh Calculation)',
                'Tax amount',
                'Total',
              ],
            ],
            { origin: 0 }
          );

          data.data.forEach((x: any) => {
            xlsx.utils.sheet_add_aoa(
              worksheet,
              [
                [
                  x.name,
                  x.nik,
                  x.position,
                  x.department,
                  x.taxCategory,
                  x.basicSalary,
                  x.mealAllowanceQuantity * x.mealAllowanceRate,
                  x.transportationAllowanceQuantity *
                    x.transportationAllowanceRate,
                  x.overtimeQuantity * x.overtimeRate,
                  x.allowances
                    .filter((x: any) => {
                      return x.isIncluded;
                    })
                    .reduce((a: any, b: any) => {
                      return a + b.amount;
                    }, 0),
                  x.allowances
                    .filter((x: any) => {
                      return !x.isIncluded;
                    })
                    .reduce((a: any, b: any) => {
                      return a + b.amount;
                    }, 0),
                  x.deductions
                    .filter((x: any) => x.isIncluded)
                    .reduce((a: any, b: any) => {
                      return a + b.amount;
                    }, 0),
                  x.deductions
                    .filter((x: any) => !x.isIncluded)
                    .reduce((a: any, b: any) => {
                      return a + b.amount;
                    }, 0),
                  x.basicSalary +
                    x.mealAllowanceQuantity * x.mealAllowanceRate +
                    x.transportationAllowanceQuantity *
                      x.transportationAllowanceRate +
                    x.overtimeQuantity * x.overtimeRate +
                    x.allowances
                      .filter((x: any) => x.isIncluded)
                      .reduce((a: any, b: any) => {
                        return a + b.amount;
                      }, 0) -
                    x.deductions
                      .filter((x: any) => x.isIncluded)
                      .reduce((a: any, b: any) => {
                        return a + b.amount;
                      }, 0),

                  x.taxAmount,
                  x.basicSalary +
                    x.mealAllowanceQuantity * x.mealAllowanceRate +
                    x.transportationAllowanceQuantity *
                      x.transportationAllowanceRate +
                    x.overtimeQuantity * x.overtimeRate +
                    x.allowances.reduce((a: any, b: any) => {
                      return a + b.amount;
                    }, 0) -
                    x.deductions.reduce((a: any, b: any) => {
                      return a + b.amount;
                    }, 0) -
                    x.taxAmount,
                ],
              ],
              { origin: -1 }
            );
          });

          const wscols = [
            { wpx: 150 }, // width in pixels
            { wpx: 150 }, // width in pixels
            { wpx: 80 }, // width in pixels
            { wpx: 80 }, // width in pixels
            { wpx: 80 }, // width in pixels
            { wpx: 150 }, // width in pixels
            { wpx: 150 }, // width in pixels
            { wpx: 150 }, // width in pixels
            { wpx: 150 }, // width in pixels
            { wpx: 150 }, // width in pixels
            { wpx: 150 }, // width in pixels
            { wpx: 150 }, // width in pixels
            { wpx: 200 }, // width in pixels
          ];

          worksheet['!cols'] = wscols;

          const workbook: xlsx.WorkBook = xlsx.utils.book_new();
          xlsx.utils.book_append_sheet(workbook, worksheet, 'Salary');

          data.data.forEach((x: any) => {
            const allowancesData =
              x.allowances.length == 0
                ? [['Tidak ada pendapatan lainnya']]
                : [
                    ...(x.allowances as any[]).map((u, index) => [
                      u.name,
                      '1',
                      'LS',
                      u.amount,
                      u.amount,
                    ]),
                  ];

            const deductionsData =
              x.deductions.length == 0
                ? [['Tidak ada pengurangan']]
                : [
                    ...(x.deductions as any[]).map((u, index) => [
                      u.name,
                      '1',
                      'LS',
                      u.amount,
                      u.amount,
                    ]),
                  ];

            const sheetData = [
              ['Name', x.name],
              ['NIK', x.nik],
              ['Position', x.position],
              ['Department', x.department],
              ['Tax Category', x.taxCategory],
              ['Pendapatan'],
              ['Gaji Pokok', '1', 'LS', x.basicSalary, x.basicSalary],
              [
                'Tunjangan uang makan',
                x.mealAllowanceQuantity,
                'hari',
                x.mealAllowanceRate,
                x.mealAllowanceRate * x.mealAllowanceQuantity,
              ],
              [
                'Tunjangan transportasi',
                x.transportationAllowanceQuantity,
                'hari',
                x.transportationAllowanceRate,
                x.transportationAllowanceRate *
                  x.transportationAllowanceQuantity,
              ],

              [
                'Lembur',
                x.overtimeQuantity,
                'jam',
                x.overtimeRate,
                x.overtimeRate * x.overtimeQuantity,
              ],
              ['Pendapatan lainnya'],
              ...allowancesData,
              [
                'Jumlah pendapatan',
                '',
                '',
                '',
                x.basicSalary +
                  x.mealAllowanceQuantity * x.mealAllowanceRate +
                  x.transportationAllowanceQuantity *
                    x.transportationAllowanceRate +
                  x.overtimeQuantity * x.overtimeRate +
                  x.allowances.reduce((a: any, b: any) => {
                    return a + b.amount;
                  }, 0),
              ],
              ['Pengurangan'],
              ...deductionsData,
              ['Potongan PPH21', '', '', '', x.taxAmount],
            ];

            const allowanceMerge =
              x.allowances.length === 0
                ? [
                    {
                      s: {
                        r: 11,
                        c: 0,
                      },
                      e: {
                        r: 11,
                        c: 4,
                      },
                    },
                  ]
                : (x.allowances as any[]).map((_, index) => ({
                    s: {
                      r: 11 + index,
                      c: 0,
                    },
                    e: {
                      r: 11 + index,
                      c: 3,
                    },
                  }));

            const deductionMerge =
              x.deductions.length === 0
                ? [
                    {
                      s: {
                        r:
                          13 +
                          (x.allowances.length === 0 ? 1 : x.allowances.length),
                        c: 0,
                      },
                      e: {
                        r:
                          13 +
                          (x.allowances.length === 0 ? 1 : x.allowances.length),
                        c: 4,
                      },
                    },
                  ]
                : (x.deductions as any[]).map((_, index) => ({
                    s: {
                      r:
                        13 +
                        (x.allowances.length === 0 ? 1 : x.allowances.length) +
                        index,
                      c: 0,
                    },
                    e: {
                      r:
                        13 +
                        (x.allowances.length === 0 ? 1 : x.allowances.length) +
                        index,
                      c: 3,
                    },
                  }));

            const merge = [
              { s: { r: 0, c: 1 }, e: { r: 0, c: 4 } },
              { s: { r: 1, c: 1 }, e: { r: 1, c: 4 } },
              { s: { r: 2, c: 1 }, e: { r: 2, c: 4 } },
              { s: { r: 3, c: 1 }, e: { r: 3, c: 4 } },
              { s: { r: 4, c: 1 }, e: { r: 4, c: 4 } },
              { s: { r: 5, c: 0 }, e: { r: 5, c: 4 } },
              { s: { r: 10, c: 0 }, e: { r: 10, c: 4 } },
              ...allowanceMerge,
              {
                s: {
                  r: 11 + (x.allowances.length === 0 ? 1 : x.allowances.length),
                  c: 0,
                },
                e: {
                  r: 11 + (x.allowances.length === 0 ? 1 : x.allowances.length),
                  c: 3,
                },
              },
              {
                s: {
                  r: 12 + (x.allowances.length === 0 ? 1 : x.allowances.length),
                  c: 0,
                },
                e: {
                  r: 12 + (x.allowances.length === 0 ? 1 : x.allowances.length),
                  c: 4,
                },
              },
              ...deductionMerge,
            ];

            const wscols = [
              { wpx: 270 }, // width in pixels
              { wpx: 50 }, // width in pixels
              { wpx: 50 }, // width in pixels
              { wpx: 100 }, // width in pixels
              { wpx: 100 }, // width in pixels
            ];

            const worksheet = xlsx.utils.aoa_to_sheet(sheetData);
            const sheetName = `${x.nik}`;

            worksheet['!cols'] = wscols;
            worksheet['!merges'] = merge;

            xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);
          });

          const excelBuffer: any = xlsx.write(workbook, {
            bookType: 'xlsx',
            type: 'array',
          });
          this.saveAsExcelFile(
            excelBuffer,
            `PPh Salary Recap ${Number(this.formGroup.value.month)} ${
              this.formGroup.value.year
            }`
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
