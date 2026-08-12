import { Component, ViewChild, OnDestroy } from '@angular/core';
import { CanDirective } from '../../../directives/can.directive';
import { TranslatePipe } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTable, MatTableModule } from '@angular/material/table';
import { ReimbursementPaymentCreateComponent } from 'src/app/components/payment-create/reimbursement-payment-create/reimbursement-payment-create.component';
import { ApiService } from 'src/app/services/api.service';
import { ReimbursementViewComponent } from '../reimbursement-view/reimbursement-view.component';
import { ReimbursementConfirmComponent } from '../reimbursement-confirm/reimbursement-confirm.component';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { debounceTime, takeUntil, Subject } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule } from '@angular/material/paginator';
import { HeaderTitleComponent } from '../../../components/header-title/header-title.component';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { ReimbursementHelper } from '../../../helpers/reimbursement.helper';
import { PanduanButtonComponent } from '../../../components/panduan/panduan-button/panduan-button.component';

@Component({
  selector: 'app-reimbursement-list',
  imports: [
    PanduanButtonComponent,
    CanDirective,
    TranslatePipe,
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatPaginatorModule,
    MatChipsModule,
    MatMenuModule,
    HeaderTitleComponent,
  ],
  templateUrl: './reimbursement-list.component.html',
  styleUrls: ['./reimbursement-list.component.scss'],
  standalone: true,
})
export class ReimbursementListComponent implements OnDestroy {
  private destroy$ = new Subject<void>();

  constructor(
    private apiService: ApiService,
    private dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

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

  // Add chip selections tracking
  chipSelections: { [key: string]: boolean } = {
    isApprove: false,
    isDelete: false,
    isPending: false,
    isPaid: false,
    isUnpaid: false,
  };

  ngOnInit(): void {
    this.loadStateFromQueryParams();
    this.setupQueryParamListeners();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadStateFromQueryParams(): void {
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        // Load pagination
        if (params['page']) this.page = +params['page'];
        if (params['pageSize']) this.pageSize = +params['pageSize'];

        // Load sort
        if (params['sortBy']) this.sortBy = params['sortBy'];
        if (params['sortByDirection'])
          this.sortByDirection = params['sortByDirection'];

        // Load search
        if (params['search'])
          this.searchControl.setValue(params['search'], { emitEvent: false });

        // Load filters and update chip selections - following your exact filter names
        const filterKeys = [
          'isApprove',
          'isDelete',
          'isPending',
          'isPaid',
          'isUnpaid',
        ];
        filterKeys.forEach((key) => {
          if (params[key] !== undefined) {
            const value = params[key] === 'true';
            this.filterFormGroup
              .get(key)
              ?.setValue(value, { emitEvent: false });
            this.chipSelections[key] = value;
          } else {
            this.chipSelections[key] = false;
          }
        });

        // Fetch data with loaded state
        this.fetchData(this.page);
      });
  }

  private setupQueryParamListeners(): void {
    // Listen to form changes and update URL
    this.filterFormGroup.valueChanges
      .pipe(takeUntil(this.destroy$), debounceTime(300))
      .subscribe((value) => {
        // Update chip selections when form changes
        Object.keys(value).forEach((key) => {
          this.chipSelections[key] = value[key];
        });
        this.updateQueryParams();
      });

    this.searchControl.valueChanges
      .pipe(takeUntil(this.destroy$), debounceTime(500))
      .subscribe((value) => {
        this.updateQueryParams();
        this.fetchData(1);
      });
  }

  private updateQueryParams(): void {
    const queryParams: any = {
      page: this.page,
      pageSize: this.pageSize,
      sortBy: this.sortBy,
      sortByDirection: this.sortByDirection,
      search: this.searchControl.value || null,
    };

    // Add filter values - using your exact filter names
    const filterValue = this.filterFormGroup.value;
    Object.keys(filterValue).forEach((key) => {
      queryParams[key] = filterValue[key] ? 'true' : 'false';
    });

    // Remove null/undefined values
    Object.keys(queryParams).forEach((key) => {
      if (queryParams[key] === null || queryParams[key] === undefined) {
        delete queryParams[key];
      }
    });

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: '',
      replaceUrl: true,
    });
  }

  isChipSelected(field: string): boolean {
    return this.chipSelections[field];
  }

  openPaymentDetail(id: number) {
    this.dialog.open(ReimbursementPaymentCreateComponent, {
      data: { id: id },
    });
  }

  openConfirmationDialog(id: number) {
    this.dialog
      .open(ReimbursementConfirmComponent, {
        width: '640px',
        maxWidth: '92vw',
        autoFocus: false,
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

  print(id: number) {
    this.apiService.get(`reimbursements/${id}`, {}).subscribe({
      next: (data: any) => {
        ReimbursementHelper.generatePDF({
          name: data.reimbursement.name,
          bankName: data.reimbursement.bankName,
          bankAccountName: data.reimbursement.bankAccountName,
          bankAccountNumber: data.reimbursement.bankAccountNumber,
          date: new Date(data.reimbursement.date),
          projectName: data.reimbursement.projectName,
          reimbursementItems: data.reimbursement_items,
        });
      },
      error: (error) => {
        console.error(`[error]: Error on fetching reimbursement`, error);
      },
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
      this.page = 1;
    } else {
      this.page = event.pageIndex + 1;
    }

    this.updateQueryParams();
    this.fetchData(this.page);
  }

  changeSortBy(sortBy: string) {
    if (this.sortBy === sortBy) {
      this.sortByDirection = this.sortByDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = sortBy;
      this.sortByDirection = 'asc';
    }

    this.updateQueryParams();
    this.fetchData(1);
  }

  changeSelection(field: string, event: any) {
    const isSelected = event.selected;
    this.filterFormGroup.get(field)?.setValue(isSelected);
    this.chipSelections[field] = isSelected;
    this.updateQueryParams();
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

  createNewReimbursement() {
    this.router.navigate(['/Reimbursement/Create']);
  }
}
