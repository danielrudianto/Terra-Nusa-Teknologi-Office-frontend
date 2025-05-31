import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-reimbursement-list',
  templateUrl: './reimbursement-list.component.html',
  styleUrls: ['./reimbursement-list.component.scss'],
  standalone: false,
})
export class ReimbursementListComponent {
  constructor(private apiService: ApiService, private dialog: MatDialog) {}

  page: number = 1;
  reimbursements: any[] = [];
  count: number = 0;
  isLoading: boolean = false;
  pageSize: number = 10;

  sortBy: string = 'date';
  sortByDirection: string = 'desc';

  displayedColumns: string[] = [
    'date',
    'name',
    'projectName',
    'expenseType',
    'amount',
    'action',
  ];

  ngOnInit(): void {
    this.fetchData();
  }

  openPaymentDetail(id: number) {}

  changePage(event: any) {
    if (event.pageSize !== this.pageSize) {
      this.pageSize = event.pageSize;
      this.page = 1; // Reset to first page when page size changes
      this.fetchData(this.page);
    } else {
      this.fetchData(this.page);
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

  fetchData(targetPage: number = 1) {
    this.isLoading = true;

    this.page = targetPage;
    this.apiService
      .get('reimbursements', {
        page: this.page,
        pageSize: this.pageSize,
        sortBy: this.sortBy,
        sortByDirection: this.sortByDirection,
      })
      .subscribe({
        next: (res: any) => {
          this.reimbursements = res.data;
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
}
