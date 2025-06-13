import { Component, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTable } from '@angular/material/table';
import { ReimbursementPaymentCreateComponent } from 'src/app/components/payment-create/reimbursement-payment-create/reimbursement-payment-create.component';
import { ApiService } from 'src/app/services/api.service';
import { ReimbursementViewComponent } from '../reimbursement-view/reimbursement-view.component';
import { ReimbursementConfirmComponent } from '../reimbursement-confirm/reimbursement-confirm.component';
import { FormControl, FormGroup } from '@angular/forms';
import { debounceTime } from 'rxjs';

@Component({
  selector: 'app-reimbursement-list',
  templateUrl: './reimbursement-list.component.html',
  styleUrls: ['./reimbursement-list.component.scss'],
  standalone: false,
})
export class ReimbursementListComponent {
  constructor(private apiService: ApiService, private dialog: MatDialog) {}

  @ViewChild('table') table!: MatTable<any>;

  page: number = 1;
  reimbursements: any[] = [];
  count: number = 0;
  isLoading: boolean = false;
  pageSize: number = 10;

  sortBy: string = 'date';
  sortByDirection: string = 'desc';

  searchControl: FormControl = new FormControl('');

  displayedColumns: string[] = [
    'date',
    'name',
    'projectName',
    'expenseType',
    'amount',
    'status',
    'isPaid',
    'action',
  ];

  filterFormGroup: FormGroup = new FormGroup({
    isApprove: new FormControl(false, { nonNullable: true }),
    isDelete: new FormControl(false, { nonNullable: true }),
    isPending: new FormControl(false, { nonNullable: true }),
    isPaid: new FormControl(false, { nonNullable: true }),
    isUnpaid: new FormControl(false, { nonNullable: true }),
  });

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

  openPaymentDetail(id: number) {
    this.dialog.open(ReimbursementPaymentCreateComponent, {
      data: { id: id },
    });
  }

  openConfirmationDialog(id: number) {
    this.dialog
      .open(ReimbursementConfirmComponent, {
        data: {
          id: id,
        },
      })
      .afterClosed()
      .subscribe((data) => {
        const index = this.reimbursements.findIndex((item) => item.id === id);
        if (data === 'approve') {
          this.reimbursements[index].isApprove = true;
          this.reimbursements[index].isDelete = false;
          this.table.renderRows();
        }

        if (data === 'reject') {
          this.reimbursements[index].isApprove = false;
          this.reimbursements[index].isDelete = true;
          this.table.renderRows();
        }
      });
  }

  viewReimbursementData(id: number) {
    this.dialog.open(ReimbursementViewComponent, {
      data: {
        id: id,
      },
    });
  }

  changePage(event: any) {
    if (event.pageSize !== this.pageSize) {
      this.pageSize = event.pageSize;
      this.page = 1; // Reset to first page when page size changes
      this.fetchData(this.page);
    } else {
      this.page = event.pageIndex + 1; // MatPaginator uses zero-based index
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

  changeSelection(field: string, event: any) {
    this.filterFormGroup.get(field)?.setValue(event.selected);
    this.fetchData(1);
  }

  fetchData(targetPage: number = 1) {
    this.isLoading = true;
    let filter: any = {};
    const searchValue = this.searchControl.value;

    const filterValue = this.filterFormGroup.value;
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
      .get('reimbursements', {
        filter: Object.keys(filter).length === 0 ? 0 : 1,
        ...filter,
        keyword: searchValue,
        page: this.page,
        pageSize: this.pageSize,
        sortBy: this.sortBy,
        sortByDirection: this.sortByDirection,
      })
      .subscribe({
        next: (res: any) => {
          this.reimbursements = res.data;
          this.count = res.count;

          if (this.table) {
            this.table.renderRows();
          }
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
