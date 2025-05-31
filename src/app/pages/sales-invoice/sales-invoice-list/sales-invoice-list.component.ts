import { Component } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-sales-invoice-list',
  standalone: false,
  templateUrl: './sales-invoice-list.component.html',
  styleUrl: './sales-invoice-list.component.scss',
})
export class SalesInvoiceListComponent {
  constructor(private apiService: ApiService) {}

  salesInvoices: any[] = [];
  count: number = 0;
  page: number = 1;
  pageSize: number = 10;

  displayedColumns: string[] = [
    'date',
    'invoiceName',
    'receiptName',
    'invoiceDescription',
    'customerName',
    'amount',
    'status',
  ];
}
