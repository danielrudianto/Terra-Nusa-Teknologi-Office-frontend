import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ViewChild,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTable, MatTableModule } from '@angular/material/table';
import { ApiService } from 'src/app/services/api.service';
import { HeaderTitleComponent } from '../../../components/header-title/header-title.component';
import { Router } from '@angular/router';
import moment from 'moment';
import { provideNativeDateAdapter } from '@angular/material/core';
import { debounceTime } from 'rxjs';

@Component({
  selector: 'app-interpayment-list',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    HeaderTitleComponent,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './interpayment-list.component.html',
  styleUrl: './interpayment-list.component.scss',
  standalone: true,
})
export class InterpaymentListComponent {
  constructor(private apiService: ApiService, private router: Router) {}

  @ViewChild('table') table: MatTable<any> | undefined;
  sortBy: string = 'date';
  sortByDirection: string = 'desc';

  date = new Date();
  // startOfDate
  startOfDate = new Date(this.date.getFullYear(), this.date.getMonth(), 1);
  endOfDate = new Date(this.date.getFullYear(), this.date.getMonth() + 1, 0);

  formGroup: FormGroup = new FormGroup({
    start: new FormControl<Date | null>(this.startOfDate, Validators.required),
    end: new FormControl<Date | null>(this.endOfDate, Validators.required),
  });

  page: number = 1;
  payments: any[] = []; // Change from dataSource to payments
  count: number = 0;
  isLoading: boolean = false;
  pageSize: number = 10;

  displayedColumns: string[] = [
    'date',
    'bankAccountOrigin',
    'bankAccountDestination',
    'amount',
  ];

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.fetchData();

    this.formGroup.valueChanges.pipe(debounceTime(100)).subscribe(() => {
      this.fetchData(1);
    });
  }

  fetchData(targetPage: number = 1) {
    if (this.formGroup.invalid) return;

    const start = this.formGroup.value.start;
    const end = this.formGroup.value.end;

    // 🧠 Only proceed if both dates are selected and valid
    if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
      console.warn('Date range not complete, skipping fetch');
      return;
    }

    this.isLoading = true;
    this.apiService
      .get('interpayments', {
        page: targetPage,
        pageSize: this.pageSize,
        sortBy: this.sortBy,
        sortByDirection: this.sortByDirection,
        start: moment(this.formGroup.value.start).format('YYYY-MM-DD'),
        end: moment(this.formGroup.value.end).format('YYYY-MM-DD'),
      })
      .subscribe({
        next: (data: any) => {
          this.payments = data.data;
          this.count = data.count;

          this.table?.renderRows();
        },
        error: (error) => {
          console.error('Error fetching interpayments:', error);
          this.isLoading = false;
        },
      })
      .add(() => {
        this.isLoading = false;
      });
  }

  changePage(event: PageEvent) {
    if (event.pageSize != this.pageSize) {
      this.pageSize = event.pageSize;
      this.page = 1; // Reset to first page when page size changes
      this.fetchData(1);
    } else {
      this.page = event.pageIndex + 1; // PageEvent uses zero-based index
      this.fetchData(this.page);
    }
  }

  changeSortBy(sb: string) {
    if (this.sortBy === sb) {
      this.sortByDirection = this.sortByDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = sb;
      this.sortByDirection = 'asc';
    }
    this.fetchData(1);
  }

  createNewInterpayment() {
    this.router.navigate(['/Interpayment/Create']);
  }
}
