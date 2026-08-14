import { Component, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CanDirective } from '../../../directives/can.directive';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from 'src/app/services/api.service';
import { SalesInvoiceConfirmComponent } from './sales-invoice-confirm/sales-invoice-confirm.component';
import { SalesInvoicePaymentCreateComponent } from '../../../components/payment-create/sales-invoice-payment-create/sales-invoice-payment-create.component';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { HeaderTitleComponent } from '../../../components/header-title/header-title.component';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { SalesInvoiceViewComponent } from '../sales-invoice-view/sales-invoice-view.component';
import { IncomeTaxCreateComponent } from './income-tax-create/income-tax-create.component';
import { TranslatePipe } from '@ngx-translate/core';
import { RefreshButtonComponent } from '../../../components/refresh-button/refresh-button.component';

@Component({
  selector: 'app-sales-invoice-list',
  imports: [
    CanDirective,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatChipsModule,
    MatMenuModule,
    HeaderTitleComponent,
    TranslatePipe,
    RefreshButtonComponent,
  ],
  templateUrl: './sales-invoice-list.component.html',
  styleUrl: './sales-invoice-list.component.scss',
  standalone: true,
})
export class SalesInvoiceListComponent {
  private readonly translate = inject(TranslateService);
  constructor(
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private router: Router,
  ) {}

  salesInvoices: any[] = [];
  count: number = 0;
  page: number = 1;
  pageSize: number = 10;
  isLoading: boolean = false;
  sortBy: string = 'date';
  sortByDirection: string = 'desc';

  searchFormControl: FormControl = new FormControl('');

  // filter chip (multi-select) — konsisten English
  filterChips: { key: string; label: string; variant: string }[] = [
    { key: 'paid', label: 'status.paid', variant: 'paid' },
    { key: 'unpaid', label: 'status.unpaid', variant: 'unpaid' },
    { key: 'complete', label: 'status.complete', variant: 'complete' },
    { key: 'no_tax_invoice', label: 'status.noTaxInvoice', variant: 'notax' },
    { key: 'no_withholding', label: 'status.noWithholding', variant: 'nowh' },
  ];
  activeFilters: string[] = [];

  isFilterActive(key: string): boolean {
    return this.activeFilters.includes(key);
  }

  toggleFilter(key: string): void {
    const i = this.activeFilters.indexOf(key);
    if (i >= 0) {
      this.activeFilters.splice(i, 1);
    } else {
      this.activeFilters.push(key);
    }
    this.fetchData(1);
  }

  /** i18n key untuk status approval. */
  statusKey(invoice: any): string {
    if (invoice.isDelete) return 'status.deleted';
    return invoice.isApprove ? 'status.approved' : 'status.pending';
  }

  /** i18n key untuk status pajak. */
  taxStatusKey(taxingStatus: string): string {
    switch (taxingStatus) {
      case 'tax_invoice_not_published':
        return 'taxStatus.noTaxInvoice';
      case 'waiting_for_payment':
        return 'taxStatus.waitingPayment';
      case 'income_tax_not_published':
        return 'taxStatus.noWithholding';
      case 'fully_published':
      default:
        return 'taxStatus.done';
    }
  }

  displayedColumns: string[] = [
    'date',
    'invoiceName',
    'invoiceDescription',
    'projectName',
    'customer',
    'amount',
    'status',
    'taxingStatus',
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

    const params: any = {
      page: this.page,
      pageSize: this.pageSize,
      keyword: this.searchFormControl.value,
      sortBy: this.sortBy,
      sortByDirection: this.sortByDirection,
    };
    if (this.activeFilters.length) {
      params.filters = this.activeFilters;
    }

    this.apiService
      .get('sales-invoices', params)
      .subscribe({
        next: (data: any) => {
          this.salesInvoices = data.data;
          this.count = data.total_count;
        },
        error: (error) => {
          console.error('Error fetching sales invoices:', error);
          this.snackBar.open(
            this.translate.instant('notify.loadFailed'),
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

  createNewSalesInvoice() {
    this.router.navigate(['/Sales-invoice/Create']);
  }

  viewSalesInvoice(id: number) {
    this.dialog.open(SalesInvoiceViewComponent, {
      data: {
        id: id,
      },
    });
  }

  openIncomeTax(invoice: any): void {
    this.dialog
      .open(IncomeTaxCreateComponent, {
        data: {
          id: invoice.id,
          name: invoice.name,
          incomeTaxInvoiceName: invoice.incomeTaxInvoiceName,
          dpp: invoice.dpp,
          pphPercentage: invoice.pphPercentage,
          pphCode: invoice.pphCode,
          pphTaxObject: invoice.pphTaxObject,
        },
        width: '460px',
        maxWidth: '92vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          this.fetchData();
        }
      });
  }
}
