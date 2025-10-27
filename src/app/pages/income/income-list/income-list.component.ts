import { Component } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { ExpenseOpponentCreateComponent } from '../../expense/expense-opponent/expense-opponent-create/expense-opponent-create.component';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { debounceTime } from 'rxjs';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { HeaderTitleComponent } from '../../../components/header-title/header-title.component';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { PillSuccessComponent } from '../../../components/pills/pill-success/pill-success.component';
import { IncomeViewComponent } from '../income-view/income-view.component';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import moment from 'moment';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

@Component({
  selector: 'app-income-list',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatButtonModule,
    MatMenuModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    HeaderTitleComponent,
    PillSuccessComponent,
    MatDatepickerModule,
    MatSlideToggleModule,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './income-list.component.html',
  styleUrl: './income-list.component.scss',
  standalone: true,
})
export class IncomeListComponent {
  constructor(
    private apiService: ApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  sortBy: string = 'date';
  sortByDirection: string = 'desc';

  date: Date = new Date();
  startOfMonth: Date = new Date(
    this.date.getFullYear(),
    this.date.getMonth(),
    1
  );
  endOfMonth: Date = new Date(
    this.date.getFullYear(),
    this.date.getMonth() + 1,
    0
  );

  formGroup: FormGroup = new FormGroup({
    start: new FormControl<Date | null>(this.startOfMonth, Validators.required),
    end: new FormControl<Date | null>(this.endOfMonth, Validators.required),
  });
  searchControl: FormControl = new FormControl('');
  ignoreControl: FormControl = new FormControl(false);
  page: number = 0;
  purchases: any[] = [];
  count: number = 0;
  isLoading: boolean = false;
  pageSize: number = 10;
  displayedColumns: string[] = [
    'date',
    'description',
    'opponent',
    'amount',
    'expenseType',
    'status',
    'action',
  ];

  ngOnInit(): void {
    this.fetchData();

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

  openCreateOpponentDialog() {
    this.dialog.open(ExpenseOpponentCreateComponent, {});
  }

  changePage(event: any) {
    if (event.pageSize !== this.pageSize) {
      this.page = 0;
      this.pageSize = event.pageSize;
      this.fetchData(this.page, this.pageSize);
    } else {
      this.page = event.pageIndex;
      this.fetchData(this.page, this.pageSize);
    }
  }

  get isFilterDisabled(): boolean {
    return this.searchControl.value === '' && !this.ignoreControl.value;
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

  fetchData(targetPage: number = 0, pageSize: number = this.pageSize) {
    if (this.formGroup.invalid) return;

    const start = this.formGroup.value.start;
    const end = this.formGroup.value.end;

    // 🧠 Only proceed if both dates are selected and valid
    if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
      console.warn('Date range not complete, skipping fetch');
      return;
    }

    this.isLoading = true;
    let filter: any = {};
    const searchValue = this.searchControl.value;

    this.page = targetPage;
    this.apiService
      .get('income', {
        page: this.page,
        pageSize: pageSize,
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

  createNewIncome() {
    this.router.navigate(['/Income/Create']);
  }

  viewIncome(id: number) {
    this.dialog.open(IncomeViewComponent, {
      data: {
        id: id,
      },
    });
  }
}
