import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { HeaderTitleComponent } from '../../../components/header-title/header-title.component';
import { ApiService } from '../../../services/api.service';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { LoansCreateComponent } from '../loans-create/loans-create.component';
import { LoanPaymentCreateComponent } from '../../../components/payment-create/loan-payment-create/loan-payment-create.component';
import { LoansViewComponent } from '../loans-view/loans-view.component';

@Component({
  selector: 'app-loans-list',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    HeaderTitleComponent,
    MatIconModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule,
    MatButtonModule,
  ],
  templateUrl: './loans-list.component.html',
  styleUrl: './loans-list.component.scss',
  standalone: true,
})
export class LoansListComponent {
  constructor(
    private apiService: ApiService,
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog,
  ) {}

  private destroy$ = new Subject<void>();

  filterFormGroup: FormGroup = new FormGroup({
    isPaid: new FormControl(false, { nonNullable: true }),
    isUnpaid: new FormControl(true, { nonNullable: true }),
  });

  chipSelections: { [key: string]: boolean } = {
    isPaid: false,
    isUnpaid: true,
  };

  sortBy: string = 'date';
  sortByDirection: string = 'desc';

  searchControl: FormControl = new FormControl('');

  dataSource: any[] = [];
  dataCount: number = 0;
  page: number = 0;
  pageSize: number = 10;

  isLoading: boolean = false;

  displayedColumns: string[] = [
    'date',
    'creditorName',
    'description',
    'debt',
    'received',
    'status',
    'action',
  ];

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
      .subscribe((value) => {
        this.updateQueryParams();
        this.fetchData(0);
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

  createNewLoan() {
    this.dialog.open(LoansCreateComponent, {});
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

    this.updateQueryParams();
    this.fetchData(0);
  }

  fetchData(targetPage: number = 1, pageSize: number = this.pageSize) {
    this.isLoading = true;
    let filter: any = {};
    const searchValue = this.searchControl.value;

    const filterValue = this.filterFormGroup.value;

    if (
      Object.values(filterValue).every((value) => value === true) ||
      Object.values(filterValue).every((value) => value === false)
    ) {
      filter = {
        isPaid: filterValue.isPaid,
        isUnpaid: filterValue.isUnpaid,
      };
    } else {
      for (const [key, value] of Object.entries(filterValue)) {
        filter[key] = value;
      }
    }

    this.page = targetPage;
    this.apiService
      .get('loans', {
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
          this.dataSource = res.data;
          this.dataCount = res.count;
        },
        error: (err) => {
          console.error(err);
        },
      })
      .add(() => {
        this.isLoading = false;
      });
  }

  openPaymentDetail(id: number) {
    this.dialog.open(LoanPaymentCreateComponent, {
      data: {
        loanID: id,
      },
    });
  }

  viewLoan(id: number) {
    this.dialog.open(LoansViewComponent, {
      data: {
        id: id,
      },
    });
  }
}
