import { Component } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-payment-list',
  standalone: false,
  templateUrl: './payment-list.component.html',
  styleUrl: './payment-list.component.scss',
})
export class PaymentListComponent {
  constructor(
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private route: Router
  ) {}

  isPending: boolean = true;
  isApproved: boolean = false;
  isRejected: boolean = false;

  payments: any[] = [];
  count: number = 0;
  isLoading: boolean = true;
  page: number = 1;
  pageSize: number = 10;
  displayedColumns: string[] = [
    'date',
    'createdAt',
    'amount',
    'documentName',
    'approvalStatus',
    'documentStatus',
  ];
  sortBy: string = 'date';
  sortByDirection: 'asc' | 'desc' = 'desc';

  ngOnInit(): void {
    this.fetchPayments(1);
  }

  onPageChange(event: any): void {
    if (event.pageSize == this.pageSize) {
      this.fetchPayments(event.pageIndex + 1);
    } else {
      this.pageSize = event.pageSize;
      this.fetchPayments(1);
    }
  }

  fetchPayments(targetPage: number): void {
    this.isLoading = true;
    this.page = targetPage;
    this.apiService
      .get('outgoing-payments', {
        page: this.page,
        pageSize: this.pageSize,
        isApproved: this.isApproved,
        isPending: this.isPending,
        isRejected: this.isRejected,
        sortBy: this.sortBy,
        sortByDirection: this.sortByDirection,
      })
      .subscribe({
        next: (data: any) => {
          this.payments = data.data;
          this.count = data.count;
        },
        error: (error) => {
          console.error(error);
          this.snackBar.open('Error fetching payments', 'Close', {
            duration: 3000,
          });
        },
      })
      .add(() => {
        this.isLoading = false;
      });
  }

  changeSortBy(sortBy: string) {
    if (this.sortBy === sortBy) {
      this.sortByDirection = this.sortByDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = sortBy;
      this.sortByDirection = 'asc';
    }

    this.fetchPayments(1);
  }

  approvePayment(paymentID: number) {
    this.route.navigate(['/Payment/Approval/' + paymentID]);
  }

  changeSelection(field: string, event: any): void {
    switch (field) {
      case 'pending':
        this.isPending = event.selected;
        this.fetchPayments(1);
        break;
      case 'approved':
        this.isApproved = event.selected;
        this.fetchPayments(1);
        break;
      case 'rejected':
        this.isRejected = event.selected;
        this.fetchPayments(1);
        break;
    }
  }
}
