import { Component } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-sales-invoice-list',
  standalone: false,
  templateUrl: './sales-invoice-list.component.html',
  styleUrl: './sales-invoice-list.component.scss',
})
export class SalesInvoiceListComponent {
  constructor(private apiService: ApiService, private snackBar: MatSnackBar) {}

  salesInvoices: any[] = [];
  count: number = 0;
  page: number = 1;
  pageSize: number = 10;
  isLoading: boolean = false;

  displayedColumns: string[] = [
    'date',
    'invoiceName',
    'invoiceDescription',
    'projectName',
    'customer',
    'amount',
    'status',
  ];

  ngOnInit(): void {
    this.fetchData();
  }

  fetchData(targetPage: number = this.page): void {
    this.isLoading = true;
    this.page = targetPage;

    this.apiService
      .get('sales-invoices', {
        page: this.page,
        pageSize: this.pageSize,
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
}
