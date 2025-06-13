import { Component } from '@angular/core';
import { FormControl } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-interpayment-list',
  standalone: false,
  templateUrl: './interpayment-list.component.html',
  styleUrl: './interpayment-list.component.scss',
})
export class InterpaymentListComponent {
  constructor(private apiService: ApiService) {}

  sortBy: string = 'date';
  sortByDirection: string = 'desc';

  searchControl: FormControl = new FormControl('');

  page: number = 1;
  payments: any[] = [];
  count: number = 0;
  isLoading: boolean = false;
  pageSize: number = 10;

  displayedColumns: string[] = [
    'date',
    'bankAccountOrigin',
    'bankAccountDestination',
    'amount',
  ];

  ngOnInit(): void {
    this.fetchData();

    this.searchControl.valueChanges.subscribe({
      next: (data) => {
        this.fetchData(1);
      },
      error: (error) => {
        console.error('Error fetching search data:', error);
      },
    });
  }

  fetchData(targetPage: number = 1) {
    this.isLoading = true;
    this.apiService
      .get('interpayments', {
        page: targetPage,
        pageSize: this.pageSize,
        search: this.searchControl.value,
        sortBy: this.sortBy,
        sortByDirection: this.sortByDirection,
      })
      .subscribe({
        next: (data: any) => {
          this.payments = data.data;
          this.count = data.count;
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
}
