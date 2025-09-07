import { Component } from '@angular/core';
import { FormControl } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { ApiService } from '../../../services/api.service';
import { MatDialog } from '@angular/material/dialog';
import { SalarySlipViewComponent } from './salary-slip-view/salary-slip-view.component';
import { SalaryPaymentCreateComponent } from 'src/app/components/payment-create/salary-payment-create/salary-payment-create.component';

@Component({
  selector: 'app-salary-slip-list',
  standalone: false,
  templateUrl: './salary-slip-list.component.html',
  styleUrl: './salary-slip-list.component.scss',
})
export class SalarySlipListComponent {
  constructor(private apiService: ApiService, private dialog: MatDialog) {}

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

  ngOnInit(): void {
    this.fetchSalarySlips();
  }

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
}
