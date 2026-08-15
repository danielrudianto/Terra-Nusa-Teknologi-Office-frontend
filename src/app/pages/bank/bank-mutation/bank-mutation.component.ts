import { Component, inject } from '@angular/core';
import { ServerMessageService } from 'src/app/services/server-message.service';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ApiService } from '../../../services/api.service';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import moment from 'moment';
import { MatTableModule } from '@angular/material/table';
import { CommonModule } from '@angular/common';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { BankMutationDownloadComponent } from './bank-mutation-download/bank-mutation-download.component';
import { MatDialog } from '@angular/material/dialog';
import { CalendarMonthSelectorComponent } from '../../calendar/calendar-month-selector/calendar-month-selector.component';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-bank-mutation',
  providers: [provideNativeDateAdapter()],
  imports: [
    MatFormFieldModule,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    CommonModule,
    MatPaginatorModule,
    MatIconModule,
    MatButtonModule,
    CalendarMonthSelectorComponent,
    TranslatePipe,
  ],
  templateUrl: './bank-mutation.component.html',
  styleUrl: './bank-mutation.component.scss',
})
export class BankMutationComponent {
  private readonly serverMessage = inject(ServerMessageService);
  constructor(
    private apiService: ApiService,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
  ) {}

  bankAccount: any = null;

  month: number = new Date().getMonth(); // 0-indexed
  year: number = new Date().getFullYear();

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

  ngOnInit(): void {
    this.fetchMetaData();
    this.fetchData();
  }

  onMonthChanged(event: { month: number; year: number }) {
    this.month = event.month;
    this.year = event.year;
    this.fetchData(1);
  }

  private get startOfMonth(): string {
    return moment({ year: this.year, month: this.month, day: 1 }).format(
      'YYYY-MM-DD',
    );
  }
  private get endOfMonth(): string {
    return moment({ year: this.year, month: this.month })
      .endOf('month')
      .format('YYYY-MM-DD');
  }

  fetchMetaData() {
    const bankAccountID = this.route.snapshot.params['id'];
    this.apiService.get(`banks/${bankAccountID}`, {}).subscribe({
      next: (data) => {
        this.bankAccount = data;
      },
      error: (error) => {
        this.snackBar.open(
          this.serverMessage.terjemahkan(error), 'Close', {
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
        startDate: this.startOfMonth,
        endDate: this.endOfMonth,
      })
      .subscribe({
        next: (data: any) => {
          this.dataSource = data.data;
          this.dataCount = data.count;
        },
        error: (error) => {
          this.snackBar.open(
          this.serverMessage.terjemahkan(error), 'Close', {
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
        // detail rekening dipakai untuk judul dokumen & nama berkas
        accountNumber: this.bankAccount?.accountNumber,
        name: this.bankAccount?.name,
      },
    });
  }
}
