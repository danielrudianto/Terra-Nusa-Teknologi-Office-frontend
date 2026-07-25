import { Component } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ApiService } from '../../../services/api.service';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import moment from 'moment';
import { MatTableModule } from '@angular/material/table';
import { CommonModule } from '@angular/common';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { HeaderTitleComponent } from 'src/app/components/header-title/header-title.component';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { BankMutationDownloadComponent } from './bank-mutation-download/bank-mutation-download.component';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-bank-mutation',
  providers: [provideNativeDateAdapter()],
  imports: [
    MatFormFieldModule,
    MatDatepickerModule,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    CommonModule,
    MatPaginatorModule,
    HeaderTitleComponent,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './bank-mutation.component.html',
  styleUrl: './bank-mutation.component.scss',
})
export class BankMutationComponent {
  constructor(
    private apiService: ApiService,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  bankAccount: any = null;

  date: Date = new Date();
  endOfMonth = new Date(this.date.getFullYear(), this.date.getMonth() + 1, 0);
  startOfMonth = new Date(this.date.getFullYear(), this.date.getMonth(), 1);

  page: number = 1;
  pageSize: number = 20;

  dataSource: any[] = [];
  dataCount: number = 0;

  displayedColumns: string[] = [
    'date',
    'opponent',
    'document',
    'amount',
    'balance',
  ];

  readonly range = new FormGroup({
    start: new FormControl<Date | null>(
      moment(this.startOfMonth, 'DD-MM-YYYY').toDate(),
      Validators.required
    ),
    end: new FormControl<Date | null>(
      moment(this.endOfMonth, 'DD-MM-YYYY').toDate(),
      Validators.required
    ),
  });

  ngOnInit(): void {
    this.fetchMetaData();
    this.fetchData();
  }

  dateRangeChange(
    dateRangeStart: HTMLInputElement,
    dateRangeEnd: HTMLInputElement
  ) {
    if (dateRangeStart.value && dateRangeEnd.value) {
      this.fetchData(1);
    }
  }

  fetchMetaData() {
    const bankAccountID = this.route.snapshot.params['id'];
    this.apiService.get(`banks/${bankAccountID}`, {}).subscribe({
      next: (data) => {
        this.bankAccount = data;
      },
      error: (error) => {
        this.snackBar.open(error.error.detail, 'Close', {
          duration: 1000,
        });
      },
    });
  }

  fetchData(page: number = this.page) {
    this.page = page;
    const bankAccountID = this.route.snapshot.params['id'];
    this.apiService
      .post(`banks/mutation`, {
        bankAccountID: Number(bankAccountID),
        page: this.page,
        pageSize: this.pageSize,
        startDate: moment(this.range.value.start).format('YYYY-MM-DD'),
        endDate: moment(this.range.value.end).format('YYYY-MM-DD'),
      })
      .subscribe({
        next: (data: any) => {
          this.dataSource = data.data;
          this.dataCount = data.count;
        },
        error: (error) => {
          this.snackBar.open(error.error.detail, 'Close', {
            duration: 1000,
          });
        },
      });
  }

  onPageChange(event: PageEvent) {
    if (event.pageSize == this.pageSize) {
      this.page = event.pageIndex + 1;
      this.fetchData();
    } else {
      this.pageSize = event.pageSize;
      this.fetchData(1);
    }
  }

  getOpponentName(data: any) {
    if (data.expense != null) {
      return `${data.expense.accountName}`;
    }

    if (data.reimbursement != null) {
      return `${data.reimbursement.accountName}`;
    }

    if (data.purchase != null) {
      return `${data.purchase.accountName}`;
    }

    return 'N/A';
  }

  getDocumentName(data: any) {
    if (data.expense != null) {
      return `${data.expense.invoiceName}`;
    }

    if (data.reimbursement != null) {
      return `${data.reimbursement.name}`;
    }

    if (data.purchase != null) {
      return `${data.purchase.invoiceName}`;
    }

    return 'N/A';
  }

  download() {
    this.dialog.open(BankMutationDownloadComponent, {
      data: {
        id: Number(this.route.snapshot.params['id']),
      },
    });
  }
}
