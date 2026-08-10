import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from 'src/app/services/api.service';
import { PurchaseReportSelectComponent } from './purchase-report-select/purchase-report-select.component';
import { PurchasePaymentCreateComponent } from '../../../components/payment-create/purchase-payment-create/purchase-payment-create.component';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { PurchaseReportProjectComponent } from './purchase-report-project/purchase-report-project.component';
import { PurchaseViewComponent } from '../purchase-view/purchase-view.component';
import { DeleteConfirmationComponent } from 'src/app/components/delete-confirmation/delete-confirmation.component';
import { PurchaseUpdateComponent } from '../purchase-update/purchase-update.component';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { HeaderTitleComponent } from '../../../components/header-title/header-title.component';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { TranslatePipe } from '@ngx-translate/core';
import { SettingsService } from '../../../services/setting.service';

@Component({
  selector: 'app-purchase-list',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatChipsModule,
    MatMenuModule,
    MatPaginatorModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    HeaderTitleComponent,
    MatSnackBarModule,
    TranslatePipe,
  ],
  templateUrl: './purchase-list.component.html',
  styleUrls: ['./purchase-list.component.scss'],
  standalone: true,
})
export class PurchaseListComponent {
  constructor(
    public settings: SettingsService,
    private apiService: ApiService,
    private dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
  ) {}

  private destroy$ = new Subject<void>();

  filterFormGroup: FormGroup = new FormGroup({
    isDue: new FormControl(false, { nonNullable: true }),
    isNotDue: new FormControl(false, { nonNullable: true }),
    isPaid: new FormControl(false, { nonNullable: true }),
    isUnpaid: new FormControl(false, { nonNullable: true }),
    isReady: new FormControl(false, { nonNullable: true }),
    isDraft: new FormControl(false, { nonNullable: true }),
  });

  chipSelections: { [key: string]: boolean } = {
    isDue: false,
    isNotDue: false,
    isPaid: false,
    isUnpaid: false,
    isReady: false,
    isDraft: false,
  };

  sortBy: string = 'date';
  sortByDirection: string = 'desc';

  searchControl: FormControl = new FormControl('');

  page: number = 0;
  purchases: any[] = [];
  count: number = 0;
  isLoading: boolean = false;
  /** Nilai awal dari pengaturan pengguna; tetap bisa diubah per halaman. */
  pageSize: number = this.settings.pageSize;
  displayedColumns: string[] = [
    'date',
    'invoiceName',
    'supplier',
    'projectName',
    'purchaseOrderName',
    'total',
    'status',
    'paidStatus',
    'isInternal',
    'action',
  ];

  ngOnInit(): void {
    this.loadStateFromQueryParams();
    this.setupQueryParamListeners();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadStateFromQueryParams(): void {
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        // Load pagination
        if (params['page']) this.page = +params['page'];
        if (params['pageSize']) this.pageSize = +params['pageSize'];

        // Load sort
        if (params['sortBy']) this.sortBy = params['sortBy'];
        if (params['sortByDirection'])
          this.sortByDirection = params['sortByDirection'];

        // Load search
        if (params['search'])
          this.searchControl.setValue(params['search'], { emitEvent: false });

        // Load filters
        const filterKeys = [
          'isDue',
          'isNotDue',
          'isPaid',
          'isUnpaid',
          'isReady',
          'isDraft',
        ];
        filterKeys.forEach((key) => {
          if (params[key] !== undefined) {
            const value = params[key] === 'true';
            this.filterFormGroup
              .get(key)
              ?.setValue(value, { emitEvent: false });
            this.chipSelections[key] = value;
          } else {
            this.chipSelections[key] = false;
          }
        });

        // Fetch data with loaded state
        this.fetchData(this.page, this.pageSize);
      });
  }

  isChipSelected(field: string): boolean {
    return this.chipSelections[field];
  }

  private setupQueryParamListeners(): void {
    this.filterFormGroup.valueChanges
      .pipe(takeUntil(this.destroy$), debounceTime(300))
      .subscribe(() => {
        this.updateQueryParams();
      });

    this.searchControl.valueChanges
      .pipe(takeUntil(this.destroy$), debounceTime(500))
      .subscribe((_) => {
        this.page = 0;
        this.updateQueryParams();
        this.fetchData();
      });
  }

  private updateQueryParams(): void {
    const queryParams: any = {
      page: this.page,
      pageSize: this.pageSize,
      sortBy: this.sortBy,
      sortByDirection: this.sortByDirection,
      search: this.searchControl.value || null,
    };

    // Add filter values
    const filterValue = this.filterFormGroup.value;
    Object.keys(filterValue).forEach((key) => {
      queryParams[key] = filterValue[key] ? 'true' : 'false';
    });

    // Remove null/undefined values
    Object.keys(queryParams).forEach((key) => {
      if (queryParams[key] === null || queryParams[key] === undefined) {
        delete queryParams[key];
      }
    });

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: '',
      replaceUrl: true, // Prevent adding to browser history on every change
    });
  }

  openPurchaseReportSelector() {
    this.dialog.open(PurchaseReportSelectComponent, {});
  }

  openUpdateInternal(id: number) {
    this.dialog.open(PurchaseUpdateComponent, {
      data: {
        id: id,
      },
    });
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
      this.page = 0;
      this.pageSize = event.pageSize;
    } else {
      this.page = event.pageIndex;
    }

    this.updateQueryParams();
    this.fetchData(this.page, this.pageSize);
  }

  changeSelection(field: string, event: any) {
    this.filterFormGroup.get(field)?.setValue(event.selected);
    this.updateQueryParams();
    this.fetchData(0);
  }

  changeSortBy(sortBy: string) {
    if (this.sortBy === sortBy) {
      this.sortByDirection = this.sortByDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = sortBy;
      this.sortByDirection = 'asc';
    }

    this.page = 0;

    this.updateQueryParams();
    this.fetchData(0);
  }

  fetchData(targetPage: number = 0, pageSize: number = this.pageSize) {
    this.isLoading = true;
    let filter: any = {};
    const searchValue = this.searchControl.value;

    const filterValue = this.filterFormGroup.value;

    if (
      Object.values(filterValue).every((value) => value === true) ||
      Object.values(filterValue).every((value) => value === false)
    ) {
      filter = {};
    } else {
      for (const [key, value] of Object.entries(filterValue)) {
        filter[key] = value;
      }
    }

    this.page = targetPage;
    this.apiService
      .get('purchases', {
        page: this.page,
        pageSize: pageSize,
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
    this.dialog
      .open(PurchaseReportProjectComponent, {})
      .afterClosed()
      .subscribe((data) => {
        if (data) {
          this.router.navigate(['Project', data.projectName], {
            relativeTo: this.route,
          });
        }
      });
  }

  viewPurchase(id: number) {
    this.dialog
      .open(PurchaseViewComponent, {
        data: {
          id: id,
        },
      })
      .afterClosed()
      .subscribe((value) => {
        if (value === 'delete') {
          this.dialog
            .open(DeleteConfirmationComponent, {
              data: {
                title: 'Delete Purchase',
                prompt: 'Are you sure you want to delete this purchase?',
              },
            })
            .afterClosed()
            .subscribe((result) => {
              if (result === true) {
                this.apiService.delete(`purchases/${id}`).subscribe({
                  next: () => {
                    this.snackBar.open(
                      'Successfully deleted purchase data',
                      'Close',
                      {
                        duration: 3000,
                      },
                    );
                    this.fetchData(this.page); // Refresh data after deletion
                  },
                  error: (err) => {
                    console.error('Error deleting purchase:', err);
                    this.snackBar.open(err.error.detail, 'Close', {
                      duration: 3000,
                    });
                  },
                });
              }
            });
        }
      });
  }

  createNewPurchase() {
    this.router.navigate(['/Purchase/Create']);
  }
}
