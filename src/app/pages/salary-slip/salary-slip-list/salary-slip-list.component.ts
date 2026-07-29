import { Component } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { ApiService } from '../../../services/api.service';
import { MatDialog } from '@angular/material/dialog';
import { SalarySlipViewComponent } from './salary-slip-view/salary-slip-view.component';
import { SalaryPaymentCreateComponent } from 'src/app/components/payment-create/salary-payment-create/salary-payment-create.component';
import { debounceTime } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { HeaderTitleComponent } from '../../../components/header-title/header-title.component';
import * as _moment from 'moment';
// tslint:disable-next-line:no-duplicate-imports
import { default as _rollupMoment, Moment } from 'moment';
import {
  MatDatepicker,
  MatDatepickerModule,
} from '@angular/material/datepicker';
import { provideMomentDateAdapter } from '@angular/material-moment-adapter';
import { MatMenuModule } from '@angular/material/menu';
import { PillSuccessComponent } from '../../../components/pills/pill-success/pill-success.component';
import { PillWarningComponent } from '../../../components/pills/pill-warning/pill-warning.component';
import { PdfViewerComponent } from 'src/app/components/pdf-viewer/pdf-viewer.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SalarySlipHelper } from 'src/app/helpers/salary-slip.helper';

const moment = _rollupMoment || _moment;

// See the Moment.js docs for the meaning of these formats:
// https://momentjs.com/docs/#/displaying/format/
export const MY_FORMATS = {
  parse: {
    dateInput: 'MM/YYYY',
  },
  display: {
    dateInput: 'MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

@Component({
  selector: 'app-salary-slip-list',
  providers: [provideMomentDateAdapter(MY_FORMATS)],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatPaginatorModule,
    HeaderTitleComponent,
    MatDatepickerModule,
    MatMenuModule,
    PillSuccessComponent,
    PillWarningComponent,
  ],
  templateUrl: './salary-slip-list.component.html',
  styleUrl: './salary-slip-list.component.scss',
  standalone: true,
})
export class SalarySlipListComponent {
  constructor(
    private apiService: ApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
  ) {}
  month: number = new Date().getMonth();
  year: number = new Date().getFullYear();
  readonly date = new FormControl(
    moment(new Date(this.year, this.month - 1, 1)),
  );

  ngOnInit(): void {
    this.fetchSalarySlips();

    this.formControl.valueChanges.pipe(debounceTime(500)).subscribe(() => {
      this.fetchSalarySlips(1);
    });

    this.date.valueChanges.subscribe((date) => {
      if (date) {
        const month = date.month() + 1;
        const year = date.year();

        this.month = month;
        this.year = year;

        this.fetchSalarySlips(1);
      }
    });
  }

  setMonthAndYear(
    normalizedMonthAndYear: Moment,
    datepicker: MatDatepicker<Moment>,
  ) {
    const ctrlValue = this.date.value ?? moment();
    ctrlValue.month(normalizedMonthAndYear.month());
    ctrlValue.year(normalizedMonthAndYear.year());
    this.date.setValue(ctrlValue);
    datepicker.close();
  }

  dataSource: any[] = [];
  dataCount: number = 0;
  page: number = 1;
  pageSize: number = 10;
  displayedColumns = [
    'name',
    'month',
    'year',
    'basic',
    'transportation',
    'overtime',
    'meal',
    'allowances',
    'deductions',
    'pph',
    'status',
    'action',
  ];
  formControl: FormControl = new FormControl('');

  months: { value: number; label: string }[] = [
    { value: 0, label: 'January' },
    { value: 1, label: 'February' },
    { value: 2, label: 'March' },
    { value: 3, label: 'April' },
    { value: 4, label: 'May' },
    { value: 5, label: 'June' },
    { value: 6, label: 'July' },
    { value: 7, label: 'August' },
    { value: 8, label: 'September' },
    { value: 9, label: 'October' },
    { value: 10, label: 'November' },
    { value: 11, label: 'December' },
  ];

  changePage(page: PageEvent) {
    if ((this.pageSize = page.pageSize)) {
      this.fetchSalarySlips(page.pageIndex + 1);
    } else {
      this.pageSize = page.pageSize;
      this.fetchSalarySlips(1);
    }
  }

  fetchSalarySlips(targetPage: number = this.page) {
    this.page = targetPage;
    this.apiService
      .get('salary-slips', {
        page: this.page,
        pageSize: this.pageSize,
        keyword: this.formControl.value,
        month: this.month,
        year: this.year,
      })
      .subscribe((response: any) => {
        this.dataSource = response.data;
        this.dataCount = response.count;
      });
  }

  viewSalarySlip(id: number) {
    this.dialog
      .open(SalarySlipViewComponent, {
        data: {
          id: id,
        },
        width: '620px',
        maxWidth: '94vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((data) => {
        if (data === 'deleted') {
          const index = this.dataSource.findIndex((x) => x.id == id);
          if (index != -1) {
            this.dataSource[index].isDelete = true;
          }
        }
      });
  }

  createPayment(id: number) {
    this.dialog
      .open(SalaryPaymentCreateComponent, {
        data: {
          id: id,
        },
      })
      .afterClosed()
      .subscribe((data) => {});
  }

  printSalarySlip(id: number) {
    // Ambil detail lengkap lalu cetak lewat helper YANG SAMA dengan create & view,
    // supaya format PDF-nya seragam di semua tempat.
    this.apiService.get(`salary-slips/${id}`, {}).subscribe({
      next: (res: any) => {
        const d = res.data || {};
        const allowances = res.allowances || [];
        const deductions = res.deductions || [];
        const data = {
          name: d.name,
          nik: d.nik ?? d.userID ?? '',
          department: d.department,
          position: d.position,
          address: d.address,
          taxCategory: d.taxCategory,
          taxAmount: d.taxAmount ?? 0,
          basicSalary: d.basicSalary ?? 0,
          transportationAllowanceQuantity:
            d.transportationAllowanceQuantity ?? 0,
          transportationAllowanceRate: d.transportationAllowanceRate ?? 0,
          mealAllowanceQuantity: d.mealAllowanceQuantity ?? 0,
          mealAllowanceRate: d.mealAllowanceRate ?? 0,
          overtimeQuantity: d.overtimeQuantity ?? 0,
          overtimeRate: d.overtimeRate ?? 0,
          paymentMethod: d.paymentMethod ?? '',
          year: d.year,
          month: d.month,
          monthName: this.months[d.month - 1]?.label || '',
          otherAllowances: allowances.map((x: any) => ({
            name: x.name,
            description: x.description,
            amount: x.amount,
          })),
          deductions: deductions.map((x: any) => ({
            name: x.name,
            description: x.description,
            amount: x.amount,
          })),
          bankAccountName: d.bankAccountName,
          bankAccountNumber: d.bankAccountNumber,
          bankName: d.bankName,
        };
        SalarySlipHelper.createProxyPaymentPDF(data as any);
      },
      error: (error) => {
        this.snackBar.open(error.error.detail, 'Close', {
          duration: 3000,
        });
      },
    });
  }

  sendSalarySlip(id: number) {
    this.apiService
      .post(`salary-slips/send`, {
        id: id,
      })
      .subscribe({
        next: (data) => {
          this.snackBar.open('Salary slip sent successfully', 'Close', {
            duration: 3000,
          });
        },
        error: (error) => {
          this.snackBar.open(error.error.detail, 'Close', {
            duration: 3000,
          });
        },
      });
  }

  generateSalarySlip(data: any) {
    SalarySlipHelper.createProxyPaymentPDF(data);
  }
}
