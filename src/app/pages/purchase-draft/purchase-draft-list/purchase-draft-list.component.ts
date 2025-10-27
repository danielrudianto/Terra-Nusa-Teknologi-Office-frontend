import { Component, ViewChild } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from 'src/app/services/api.service';
import { PurchaseDraftViewComponent } from '../purchase-draft-view/purchase-draft-view.component';
import { CommonModule } from '@angular/common';
import { MatTable, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { HeaderTitleComponent } from '../../../components/header-title/header-title.component';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { ActivatedRoute, Router } from '@angular/router';
import { PillSuccessComponent } from '../../../components/pills/pill-success/pill-success.component';
import { PillDangerComponent } from '../../../components/pills/pill-danger/pill-danger.component';
import { MatMenuModule } from '@angular/material/menu';

@Component({
  selector: 'app-purchase-draft-list',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatPaginatorModule,
    HeaderTitleComponent,
    PillSuccessComponent,
    PillDangerComponent,
    MatMenuModule,
  ],
  templateUrl: './purchase-draft-list.component.html',
  styleUrl: './purchase-draft-list.component.scss',
  standalone: true,
})
export class PurchaseDraftListComponent {
  constructor(
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  @ViewChild('table') table: MatTable<any> | undefined;
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
    this.dialog
      .open(PurchaseDraftViewComponent, {
        data: {
          id: id,
        },
      })
      .afterClosed()
      .subscribe((data) => {
        if (data == true) {
          const index = this.purchases.findIndex((x) => x.id == id);
          this.purchases[index].isDelete = true;
          this.table?.renderRows();
        }
      });
  }

  convertPurchase(id: number) {
    this.router.navigate(['Update', id], {
      relativeTo: this.route,
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

  createNewPurchaseDraft() {
    this.router.navigate(['Purchase-draft/Create']);
  }
}
