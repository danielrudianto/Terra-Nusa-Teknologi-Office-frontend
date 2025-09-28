import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from 'src/app/services/api.service';
import { SalesInvoiceConfirmComponent } from './sales-invoice-confirm/sales-invoice-confirm.component';
import { SalesInvoicePaymentCreateComponent } from '../../../components/payment-create/sales-invoice-payment-create/sales-invoice-payment-create.component';
import { FormControl } from '@angular/forms';
import { debounceTime } from 'rxjs';

@Component({
  selector: 'app-sales-invoice-list',
  standalone: false,
  templateUrl: './sales-invoice-list.component.html',
  styleUrl: './sales-invoice-list.component.scss',
})
export class SalesInvoiceListComponent {
  constructor(
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  salesInvoices: any[] = [];
  count: number = 0;
  page: number = 1;
  pageSize: number = 10;
  isLoading: boolean = false;
  sortBy: string = 'date';
  sortByDirection: string = 'desc';

  searchFormControl: FormControl = new FormControl('');

  displayedColumns: string[] = [
    'date',
    'invoiceName',
    'invoiceDescription',
    'projectName',
    'customer',
    'amount',
    'status',
    'action',
  ];

  ngOnInit(): void {
    this.fetchData();

    this.searchFormControl.valueChanges
      .pipe(debounceTime(500))
      .subscribe(() => {
        this.fetchData(1);
      });
  }

  fetchData(targetPage: number = this.page): void {
    this.isLoading = true;
    this.page = targetPage;

    this.apiService
      .get('sales-invoices', {
        page: this.page,
        pageSize: this.pageSize,
        keyword: this.searchFormControl.value,
        sortBy: this.sortBy,
        sortByDirection: this.sortByDirection,
      })
      .subscribe({
        next: (data: any) => {
          this.salesInvoices = data.data;
          this.count = data.count;
        },
        error: (error) => {
          console.error('Error fetching sales invoices:', error);
          this.snackBar.open('Error fetching sales invoices', 'Close', {
            duration: 3000,
          });
        },
      })
      .add(() => {
        this.isLoading = false;
      });
  }

  changePage(event: any) {
    if (event.pageSize == this.pageSize) {
      this.fetchData(event.pageIndex + 1);
    } else {
      this.pageSize = event.pageSize;
      this.fetchData(1);
    }
  }

  changeSortBy(sortBy: string) {
    if (this.sortBy === sortBy) {
      this.sortByDirection = this.sortByDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = sortBy;
      this.sortByDirection = 'asc';
    }

    this.fetchData(1);
  }

  openPaymentDetail(invoiceID: number) {
    this.dialog.open(SalesInvoicePaymentCreateComponent, {
      data: {
        id: invoiceID,
      },
    });
  }

  openSalesInvoiceConfirmation(id: number) {
    this.dialog
      .open(SalesInvoiceConfirmComponent, {
        data: {
          id: id,
        },
      })
      .afterClosed()
      .subscribe((value) => {
        if (value == 'reject') {
          const index = this.salesInvoices.findIndex((x) => x.id == id);
          if (index != -1) {
            this.salesInvoices[index].isDelete = true;
          }
        }

        if (value == 'approve') {
          const index = this.salesInvoices.findIndex((x) => x.id == id);
          if (index != -1) {
            this.salesInvoices[index].isApprove = true;
          }
        }
      });
  }
}
