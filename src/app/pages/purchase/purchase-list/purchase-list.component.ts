import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from 'src/app/services/api.service';
import { PurchaseReportSelectComponent } from './purchase-report-select/purchase-report-select.component';
import { PurchasePaymentCreateComponent } from '../../../components/payment-create/purchase-payment-create/purchase-payment-create.component';
import { FormControl, FormGroup } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { PurchaseReportProjectComponent } from './purchase-report-project/purchase-report-project.component';
import { PurchaseViewComponent } from '../purchase-view/purchase-view.component';

@Component({
  selector: 'app-purchase-list',
  templateUrl: './purchase-list.component.html',
  styleUrls: ['./purchase-list.component.scss'],
  standalone: false,
})
export class PurchaseListComponent {
  constructor(private apiService: ApiService, private dialog: MatDialog) {}

  filterFormGroup: FormGroup = new FormGroup({
    isDue: new FormControl(false, { nonNullable: true }),
    isNotDue: new FormControl(false, { nonNullable: true }),
    isPaid: new FormControl(false, { nonNullable: true }),
    isUnpaid: new FormControl(false, { nonNullable: true }),
    isReady: new FormControl(false, { nonNullable: true }),
    isDraft: new FormControl(false, { nonNullable: true }),
  });

  sortBy: string = 'date';
  sortByDirection: string = 'desc';

  searchControl: FormControl = new FormControl('');

  page: number = 1;
  purchases: any[] = [];
  count: number = 0;
  isLoading: boolean = false;
  pageSize: number = 10;
  displayedColumns: string[] = [
    'date',
    'invoiceName',
    'supplier',
    'projectName',
    'purchaseOrderName',
    'total',
    'status',
    'paidStatus',
    'action',
  ];

  ngOnInit(): void {
    this.fetchData();

    this.searchControl.valueChanges.pipe(debounceTime(500)).subscribe({
      next: (data) => {
        this.fetchData(1);
      },
      error: (error) => {
        console.error('Error fetching search data:', error);
      },
    });
  }

  openPurchaseReportSelector() {
    this.dialog.open(PurchaseReportSelectComponent, {});
  }

  openPaymentDetail(id: number) {
    this.dialog.open(PurchasePaymentCreateComponent, {
      data: {
        purchaseID: id,
        expenseID: null,
        reimbursementID: null,
      },
    });
  }

  changePage(event: any) {
    if (event.pageSize !== this.pageSize) {
      this.page = 1;
      this.pageSize = event.pageSize;
      this.fetchData(this.page, this.pageSize);
    } else {
      this.page = event.pageIndex + 1;
      this.fetchData(this.page, this.pageSize);
    }
  }

  changeSelection(field: string, event: any) {
    this.filterFormGroup.get(field)?.setValue(event.selected);
    this.fetchData(1);
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

  fetchData(targetPage: number = 1, pageSize: number = this.pageSize) {
    this.isLoading = true;
    let filter: any = {};
    const searchValue = this.searchControl.value;

    const filterValue = this.filterFormGroup.value;
    // if all the filter value is true or all the filter value is false, then filter = {}, filter = 0
    if (
      Object.values(filterValue).every((value) => value === true) ||
      Object.values(filterValue).every((value) => value === false)
    ) {
      filter = {};
    } else {
      // if the filter value is true, then add to filter
      for (const [key, value] of Object.entries(filterValue)) {
        filter[key] = value;
      }
    }

    this.page = targetPage;
    this.apiService
      .get('purchases', {
        page: this.page,
        pageSize: pageSize,
        // if filter is empty, then filter = 0
        filter: Object.keys(filter).length === 0 ? 0 : 1,
        ...filter,
        sortBy: this.sortBy,
        sortByDirection: this.sortByDirection,
        keyword: searchValue,
      })
      .subscribe({
        next: (res: any) => {
          this.purchases = res.data;
          this.count = res.count;
        },
        error: (err) => {
          console.error(err);
        },
      })
      .add(() => {
        this.isLoading = false;
      });
  }

  openProjectSelector() {
    this.dialog.open(PurchaseReportProjectComponent, {});
  }

  viewPurchase(id: number) {
    this.dialog.open(PurchaseViewComponent, {
      data: {
        id: id,
      },
    });
  }
}
