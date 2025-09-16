import { Component } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { ExpenseOpponentCreateComponent } from '../../expense/expense-opponent/expense-opponent-create/expense-opponent-create.component';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { debounceTime } from 'rxjs';

@Component({
  selector: 'app-income-list',
  standalone: false,
  templateUrl: './income-list.component.html',
  styleUrl: './income-list.component.scss',
})
export class IncomeListComponent {
  constructor(
    private apiService: ApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

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
    'description',
    'opponent',
    'amount',
    'expenseType',
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

  openCreateOpponentDialog() {
    this.dialog.open(ExpenseOpponentCreateComponent, {});
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

    this.page = targetPage;
    this.apiService
      .get('income', {
        page: this.page,
        pageSize: pageSize,
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
          this.snackBar.open(err.error.detail, 'Close', {
            duration: 3000,
          });
        },
      })
      .add(() => {
        this.isLoading = false;
      });
  }
}
