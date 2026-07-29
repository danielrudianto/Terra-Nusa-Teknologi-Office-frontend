import { Component, OnDestroy } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { debounceTime, takeUntil, Subject } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';
import { ExpenseOpponentCreateComponent } from '../expense-opponent/expense-opponent-create/expense-opponent-create.component';
import { ExpensePaymentCreateComponent } from 'src/app/components/payment-create/expense-payment-create/expense-payment-create.component';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { HeaderTitleComponent } from '../../../components/header-title/header-title.component';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule } from '@angular/material/paginator';
import { ExpenseViewComponent } from '../expense-view/expense-view.component';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import moment from 'moment';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

@Component({
  selector: 'app-expense-list',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    RouterModule,
    MatSnackBarModule,
    MatChipsModule,
    MatPaginatorModule,
    HeaderTitleComponent,
    MatDatepickerModule,
    MatSlideToggleModule,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './expense-list.component.html',
  styleUrl: './expense-list.component.scss',
})
export class ExpenseListComponent {
  private destroy$ = new Subject<void>();

  constructor(
    private apiService: ApiService,
    private dialog: MatDialog,
    private router: Router,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute,
  ) {}

  filterFormGroup: FormGroup = new FormGroup({
    isDue: new FormControl(false, { nonNullable: true }),
    isNotDue: new FormControl(false, { nonNullable: true }),
    isPaid: new FormControl(false, { nonNullable: true }),
    isUnpaid: new FormControl(false, { nonNullable: true }),
  });

  date: Date = new Date();
  startOfMonth: Date = new Date(
    this.date.getFullYear(),
    this.date.getMonth(),
    1,
  );
  endOfMonth: Date = new Date(
    this.date.getFullYear(),
    this.date.getMonth() + 1,
    0,
  );

  formGroup: FormGroup = new FormGroup({
    start: new FormControl<Date | null>(this.startOfMonth, Validators.required),
    end: new FormControl<Date | null>(this.endOfMonth, Validators.required),
  });

  // Add chip selections tracking
  chipSelections: { [key: string]: boolean } = {
    isDue: false,
    isNotDue: false,
    isPaid: false,
    isUnpaid: false,
  };

  sortBy: string = 'date';
  sortByDirection: string = 'desc';

  searchControl: FormControl = new FormControl('');
  ignoreControl: FormControl = new FormControl(false);
  page: number = 0;
  purchases: any[] = [];
  count: number = 0;
  isLoading: boolean = false;
  pageSize: number = 10;
  displayedColumns: string[] = [
    'date',
    'invoiceName',
    'supplier',
    'total',
    'expenseType',
    'paidStatus',
    'action',
  ];

  ngOnInit(): void {
    this.fetchData(0);

    this.ignoreControl.disable();

    this.formGroup.valueChanges.pipe(debounceTime(100)).subscribe(() => {
      this.fetchData(0);
    });

    this.searchControl.valueChanges.pipe(debounceTime(500)).subscribe(() => {
      const search = this.searchControl.value.trim();
      if (search === '') {
        this.ignoreControl.setValue(false, {
          emitEvent: false,
        });
      }
      this.fetchData(0);
    });

    this.ignoreControl.valueChanges.pipe(debounceTime(100)).subscribe(() => {
      this.fetchData(0);
    });
  }

  isChipSelected(field: string): boolean {
    return this.chipSelections[field];
  }

  openCreateOpponentDialog() {
    this.dialog.open(ExpenseOpponentCreateComponent, {});
  }

  openPaymentDetail(id: number) {
    this.dialog.open(ExpensePaymentCreateComponent, {
      data: {
        purchaseID: null,
        expenseID: id,
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

    this.fetchData(this.page, this.pageSize);
  }

  changeSelection(field: string, event: any) {
    const isSelected = event.selected;
    this.filterFormGroup.get(field)?.setValue(isSelected);
    this.chipSelections[field] = isSelected;
    this.fetchData(0);
  }

  changeSortBy(sortBy: string) {
    if (this.sortBy === sortBy) {
      this.sortByDirection = this.sortByDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = sortBy;
      this.sortByDirection = 'asc';
    }

    this.fetchData(0);
  }

  fetchData(targetPage: number = 1, pageSize: number = this.pageSize) {
    if (this.formGroup.invalid) return;

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
      .get('expenses', {
        page: this.page,
        pageSize: pageSize,
        // if filter is empty, then filter = 0
        filter: Object.keys(filter).length === 0 ? 0 : 1,
        ...filter,
        sortBy: this.sortBy,
        sortByDirection: this.sortByDirection,
        keyword: searchValue,
        start: moment(this.formGroup.value.start).format('YYYY-MM-DD'),
        end: moment(this.formGroup.value.end).format('YYYY-MM-DD'),
        ignore: this.ignoreControl.value,
      })
      .subscribe({
        next: (res: any) => {
          this.purchases = res.data;
          this.count = res.count;
        },
        error: (err) => {
          this.snackBar.open(err.error.detail, 'Close', {
            duration: 3000,
          });
        },
      })
      .add(() => {
        this.isLoading = false;
      });
  }

  createNewExpense() {
    this.router.navigate(['/Expense/Create']);
  }

  viewExpense(id: number) {
    this.dialog.open(ExpenseViewComponent, {
      data: {
        id: id,
      },
    });
  }
}
