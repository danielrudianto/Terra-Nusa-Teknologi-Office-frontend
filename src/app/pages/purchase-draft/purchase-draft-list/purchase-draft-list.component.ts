import { Component } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from 'src/app/services/api.service';
import { PurchaseDraftViewComponent } from '../purchase-draft-view/purchase-draft-view.component';

@Component({
  selector: 'app-purchase-draft-list',
  standalone: false,
  templateUrl: './purchase-draft-list.component.html',
  styleUrl: './purchase-draft-list.component.scss',
})
export class PurchaseDraftListComponent {
  constructor(
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  page: number = 1;
  pageSize: number = 10;
  isLoading: boolean = false;
  searchControl: FormControl = new FormControl('');
  sortBy: string = 'date';
  sortByDirection: 'asc' | 'desc' = 'asc';
  purchases: any[] = [];
  count: number = 0;

  isPending: boolean = true;
  isApproved: boolean = false;

  changeSelection(field: string, event: any) {
    switch (field) {
      case 'isPending':
        this.isPending = event.selected;
        this.fetchData(1);
        break;
      case 'isApproved':
        this.isApproved = event.selected;
        this.fetchData(1);
        break;
    }
  }

  fetchData(targetPage: number = 1, pageSize: number = this.pageSize) {
    this.isLoading = true;
    const searchValue = this.searchControl.value;
    this.page = targetPage;

    this.apiService
      .get('purchase-draft', {
        page: this.page,
        pageSize: pageSize,
        // if filter is empty, then filter = 0
        isPending: this.isPending,
        isApproved: this.isApproved,
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

  viewPurchase(id: number) {
    this.dialog.open(PurchaseDraftViewComponent, {
      data: {
        id: id,
      },
    });
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

  displayedColumns: string[] = [
    'date',
    'supplier',
    'projectName',
    'purchaseOrderName',
    'total',
    'status',
    'action',
  ];

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
}
