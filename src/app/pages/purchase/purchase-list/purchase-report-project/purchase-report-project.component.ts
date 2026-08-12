import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from 'src/app/services/api.service';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import {
  Alignment,
  Margins,
  PageBreak,
  PageOrientation,
} from 'pdfmake/interfaces';
import moment from 'moment';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { ProjectSelectorComponent } from '../../../../components/project-selector/project-selector.component';

pdfMake.vfs = pdfFonts.vfs;

@Component({
  selector: 'app-purchase-report-project',
  templateUrl: './purchase-report-project.component.html',
  styleUrl: './purchase-report-project.component.scss',
  standalone: true,
  imports: [
    ProjectSelectorComponent,
    TranslatePipe,
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatDialogModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
  ],
})
export class PurchaseReportProjectComponent {
  constructor(
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialogRef<PurchaseReportProjectComponent>,
  ) {}

  isLoading: boolean = false;

  formGroup: FormGroup = new FormGroup({
    projectName: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[A-Z0-9]{4,5}$/),
    ]),
  });

  ngOnInit(): void {}

  onSubmit() {
    this.dialog.close(this.formGroup.value);
  }



  generatePDF(data: any, projectName: string) {
    // First calculate the total for each purchaseType
    const recapData: any[] = [];

    const dates = [
      ...data.purchases.map((x: any) => new Date(x.date).getTime()),
      ...data.reimbursements.map((x: any) => new Date(x.date).getTime()),
    ];
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

    const minimumDate = Math.min(...dates); // Assumes dates are timestamps (numbers); if Date objects, use a reduce/min logic
    const maximumDate = Math.max(...dates);
    const startDate = new Date(minimumDate);
    const endDate = new Date(maximumDate);
    const year = startDate.getFullYear(); // Assumes same year; see notes for multi-year handling
    const startMoment = moment(startDate);
    const endMoment = moment(endDate);
    const startWeek = Number(startMoment.format('w'));
    const endWeek = Number(endMoment.format('w'));
    const weekCount = endWeek - startWeek + 1; // Inclusive count (e.g., weeks 1-3 → 3 weeks)
    const startDayOfWeek = moment()
      .year(year)
      .isoWeek(startWeek)
      .startOf('isoWeek'); // Monday of start week

    const weeklyData = [];
    const purchaseTypesArray = Object.entries(recapData)
      .sort((a, b) => {
        return a[0].localeCompare(b[0]);
      })
      .map(([purchaseType]) => {
        return purchaseType;
      });
    for (let i = 0; i < weekCount; i++) {
      // Calculate the Monday (start) of the current week
      const weekStartMoment = startDayOfWeek.clone().add(i, 'weeks');
      const weekStart = weekStartMoment.toDate(); // JavaScript Date for comparisons
      // Calculate the Sunday (end) of the current week
      const weekEndMoment = weekStartMoment.clone().endOf('isoWeek');
      const weekEnd = weekEndMoment.toDate();
      // Filter purchases for this week (inclusive bounds)
      const purchases = data.purchases.filter((x: any) => {
        const purchaseDate = new Date(x.date); // Assumes x.date is timestamp, string, or Date
        return purchaseDate >= weekStart && purchaseDate <= weekEnd;
      });

      const reimbursements = data.reimbursements.filter((x: any) => {
        const reimbursementDate = new Date(x.date); // Assumes x.date is timestamp, string, or Date
        return reimbursementDate >= weekStart && reimbursementDate <= weekEnd;
      });

      const weeklyRecapData: any[] = purchaseTypesArray.map((_, index) => {
        return 0;
      });

      purchaseTypesArray.forEach((x, index) => {
        const p = purchases.filter((y: any) => y.purchaseType == x);
        const pv = p.reduce((a: any, b: any) => {
          return a + b.dpp + (b.dpp * b.ppn) / 100 + b.pbbkb + b.otherValue;
        }, 0);

        const r = reimbursements.filter((y: any) => y.purchaseType == x);
        const rv = r.reduce((a: any, b: any) => {
          return a + b.amount;
        }, 0);

        weeklyRecapData[index] = pv + rv;
      });

      // Collect data for this week (e.g., { weekStart, weekEnd, purchases })
      weeklyData.push({
        weekIndex: startWeek + i, // e.g., 22, 23, etc.
        weekStart: weekStart, // or weekStartMoment.format('YYYY-MM-DD') for string
        weekEnd: weekEnd, // or weekEndMoment.format('YYYY-MM-DD') for string
        data: weeklyRecapData,
      });
    }

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
                      0,
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
                      0,
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
        {
          table: {
            width: [150, purchaseTypesArray.map((x: any) => '*')],
            body: [
              [
                'Week',
                ...purchaseTypesArray.map(([purchaseType, _]) => purchaseType),
              ],
              ...weeklyData.map((x) => {
                return [
                  {
                    text: (x.weekIndex + 1).toLocaleString('id-ID'),
                    bold: true,
                    alignment: 'center' as Alignment,
                  },
                  ...x.data.map((dt) => {
                    return [
                      {
                        text: dt.toLocaleString('id-ID', {
                          style: 'currency',
                          currency: 'IDR',
                        }),
                      },
                    ];
                  }),
                ];
              }),
            ],
          },
          pageBreak: 'before' as PageBreak,
          pageOrientation: 'landscape' as PageOrientation,
        },
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
