import { Component } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { debounceTime } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-expense-opponent-list',
  templateUrl: './expense-opponent-list.component.html',
  styleUrl: './expense-opponent-list.component.scss',
  standalone: true,
  imports: [
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
  ],
})
export class ExpenseOpponentListComponent {
  constructor(
    private apiService: ApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
  ) {}

  isLoading: boolean = false;

  formControl: FormControl = new FormControl('');

  suppliers: any[] = [];
  page: number = 1;
  pageSize: number = 10;
  count: number = 0;
  displayedColumns: string[] = [
    'name',
    'description',
    'type',
    'npwp',
    'paymentNumber',
    'action',
  ];
  sortBy: string = 'name';
  sortByDirection: string = 'asc';

  ngOnInit(): void {
    this.fetchOpponents();

    this.formControl.valueChanges.pipe(debounceTime(500)).subscribe((_) => {
      this.fetchOpponents(1);
    });
  }

  fetchOpponents(targetPage: number = 1) {
    this.isLoading = true;

    this.page = targetPage;
    this.apiService
      .get('expense-opponents', {
        page: this.page,
        pageSize: this.pageSize,
        keyword: this.formControl.value,
        sortBy: this.sortBy,
        sortByDirection: this.sortByDirection,
      })
      .subscribe({
        next: (res: any) => {
          this.suppliers = res.data;
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

  changePage(event: any) {
    if (event.pageSize == this.pageSize) {
      const targetPage = event.pageIndex + 1;
      this.fetchOpponents(targetPage);
    } else {
      this.pageSize = event.pageSize;
      this.fetchOpponents(1);
    }
  }

  onEdit(id: number) {}

  onViewDetail(id: number) {}

  copyPaymentNumber(paymentNumber: string) {
    navigator.clipboard
      .writeText(paymentNumber)
      .then(() => {
        this.snackBar.open('Payment number copied to clipboard', 'Close', {
          duration: 3000,
        });
      })
      .catch((err) => {
        console.error('Failed to copy payment number: ', err);
        this.snackBar.open('Failed to copy payment number', 'Close', {
          duration: 3000,
        });
      });
  }
}
