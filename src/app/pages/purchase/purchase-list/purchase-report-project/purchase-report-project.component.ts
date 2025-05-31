import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from 'src/app/services/api.service';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { Alignment, Margins } from 'pdfmake/interfaces';

pdfMake.vfs = pdfFonts.vfs;

@Component({
  selector: 'app-purchase-report-project',
  templateUrl: './purchase-report-project.component.html',
  styleUrl: './purchase-report-project.component.scss',
  standalone: false,
})
export class PurchaseReportProjectComponent {
  constructor(private apiService: ApiService, private snackBar: MatSnackBar) {}

  isLoading: boolean = false;

  formGroup: FormGroup = new FormGroup({
    projectName: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[A-Z0-9]{4,5}$/),
    ]),
    format: new FormControl('', [Validators.required]),
  });

  ngOnInit(): void {}

  onSubmit() {
    this.isLoading = true;
    this.apiService
      .get('purchases/report/project', this.formGroup.value)
      .subscribe({
        next: (data) => {
          if (this.formGroup.value.format === 'pdf') {
            this.generatePDF(data, this.formGroup.value.projectName);
          }
        },
        error: (error) => {
          console.error('Error generating report:', error);
          this.snackBar.open('Error generating report', 'Close', {
            duration: 3000,
          });
        },
      })
      .add(() => {
        this.isLoading = false;
      });
  }

  toUpperCase() {
    const value = this.formGroup.get('projectName')?.value;
    if (value && value.toUpperCase() !== value) {
      this.formGroup.patchValue({
        projectName: value.toUpperCase(),
      });
    }
  }

  generatePDF(data: any, projectName: string) {
    // First calculate the total for each purchaseType
    const recapData: any[] = [];
    data.purchases.forEach((purchase: any) => {
      const purchaseType = purchase.purchaseType;
      if (recapData[purchaseType]) {
        recapData[purchaseType].purchase +=
          purchase.dpp +
          (purchase.ppn * purchase.dpp) / 100 +
          purchase.pbbkb +
          purchase.otherValue;
      } else {
        recapData[purchaseType] = {
          purchaseType: purchaseType,
          purchase:
            purchase.dpp +
            (purchase.ppn * purchase.dpp) / 100 +
            purchase.pbbkb +
            purchase.otherValue,
          reimbursement: 0,
        };
      }
    });

    data.reimbursements.forEach((reimbursement: any) => {
      const purchaseType = reimbursement.purchaseType;
      if (recapData[purchaseType]) {
        recapData[purchaseType].reimbursement += reimbursement.amount;
      } else {
        recapData[purchaseType] = {
          purchaseType: purchaseType,
          reimbursement: reimbursement.amount,
          purchase: 0,
        };
      }
    });

    const dd = {
      content: [
        {
          text: `Purchase Report for Project: ${projectName}`,
          style: 'header',
        },
        {
          text: 'Generated on: ' + new Date().toLocaleDateString(),
          margin: [0, 0, 0, 20] as Margins,
        },
        {
          text: 'Sorted by purchase type',
          margin: [0, 0, 0, 10] as Margins,
        },
        {
          table: {
            widths: [100, '*', '*'],
            body: [
              ['Purchase Type', 'Purchase', 'Reimbursement'],
              ...Object.entries(recapData)
                .sort((a, b) => {
                  return a[0].localeCompare(b[0]);
                })
                .map(([purchaseType, data]) => [
                  {
                    text: purchaseType,
                    bold: true,
                    alignment: 'center' as Alignment,
                  },
                  data.purchase.toLocaleString('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                  }),
                  data.reimbursement.toLocaleString('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                  }),
                ]),
              [
                {
                  text: 'Total',
                  bold: true,
                  alignment: 'center' as Alignment,
                },
                {
                  text: data.purchases
                    .reduce((acc: number, purchase: any) => {
                      return (
                        acc +
                        purchase.dpp +
                        (purchase.ppn * purchase.dpp) / 100 +
                        purchase.pbbkb +
                        purchase.otherValue
                      );
                    }, 0)
                    .toLocaleString('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                    }),
                  bold: true,
                },
                {
                  text: data.reimbursements
                    .reduce((acc: number, purchase: any) => {
                      return acc + purchase.amount;
                    }, 0)
                    .toLocaleString('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                    }),
                  bold: true,
                },
              ],
            ],
          },
        },
        {
          text: 'Sorted by values by tax',
          margin: [0, 10, 0, 10] as Margins,
        },
        {
          table: {
            widths: [100, '*'],
            body: [
              [
                'DPP',
                {
                  text: (
                    data.purchases.reduce((acc: number, purchase: any) => {
                      return acc + purchase.dpp;
                    }, 0) +
                    data.reimbursements.reduce(
                      (acc: number, reimbursement: any) => {
                        return acc + reimbursement.amount;
                      },
                      0
                    )
                  ).toLocaleString('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                  }),
                },
              ],
              [
                'PPN',
                {
                  text: data.purchases
                    .reduce((acc: number, purchase: any) => {
                      return acc + (purchase.ppn * purchase.dpp) / 100;
                    }, 0)
                    .toLocaleString('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                    }),
                },
              ],
              [
                'PBBKB',
                {
                  text: data.purchases
                    .reduce((acc: number, purchase: any) => {
                      return acc + purchase.pbbkb;
                    }, 0)
                    .toLocaleString('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                    }),
                },
              ],
              [
                'Other Value',
                {
                  text: data.purchases
                    .reduce((acc: number, purchase: any) => {
                      return acc + purchase.otherValue;
                    }, 0)
                    .toLocaleString('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                    }),
                },
              ],
              [
                'Total',
                {
                  text: (
                    data.purchases.reduce((acc: number, purchase: any) => {
                      return (
                        acc +
                        purchase.dpp +
                        (purchase.ppn * purchase.dpp) / 100 +
                        purchase.pbbkb +
                        purchase.otherValue
                      );
                    }, 0) +
                    data.reimbursements.reduce(
                      (acc: number, reimbursement: any) => {
                        return acc + reimbursement.amount;
                      },
                      0
                    )
                  ).toLocaleString('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                  }),
                },
              ],
            ],
          },
        },
        // {
        //   text: 'This report contains all purchases related to the specified project.',
        //   margin: [0, 0, 0, 20] as Margins,
        // },
        // {
        //   table: {
        //     widths: ['*', '*', '*', 'auto'],
        //     headerRows: 1,
        //     body: [
        //       ['Date', 'Invoice Name', 'Supplier', 'Total'],
        //       ...data.purchases.map((purchase: any) => [
        //         purchase.date,
        //         purchase.invoiceName,
        //         purchase.supplier_name,
        //         purchase.dpp + (purchase.ppn * purchase.dpp) / 100,
        //       ]),
        //     ],
        //   },
        // },
      ],
      styles: {
        header: {
          fontSize: 18,
          bold: true,
          margin: [0, 0, 0, 10] as Margins,
        },
      },
    };

    pdfMake.createPdf(dd).open();
  }
}
