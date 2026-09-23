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
import { ActivatedRoute, Router } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Location } from '@angular/common';
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
import { PILIHAN_BARIS } from 'src/app/constants/paginasi.constant';

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
    MatTooltipModule,
  ],
  templateUrl: './bank-mutation.component.html',
  styleUrl: './bank-mutation.component.scss',
})
export class BankMutationComponent {
  /** Pilihan baris per halaman — satu daftar untuk seluruh aplikasi. */
  readonly pilihanBaris = PILIHAN_BARIS;

  private readonly serverMessage = inject(ServerMessageService);
  constructor(
    private apiService: ApiService,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
  ) {}

  private readonly router = inject(Router);
  private readonly lokasi = inject(Location);

  /**
   * Kembali ke daftar rekening — ke halaman & pencarian yang tadi, karena
   * keadaannya tersimpan di alamat daftar. Dibuka langsung (tanpa riwayat),
   * jatuh ke daftar bawaan.
   */
  kembali(): void {
    if (this.router.lastSuccessfulNavigation?.previousNavigation) {
      this.lokasi.back();
    } else {
      this.router.navigate(['/Bank']);
    }
  }

  /** Periode & halaman ke alamat (hanya yang bukan bawaan, hanya bila berubah). */
  private simpanKeAlamat(): void {
    const kini = new Date();
    const qp: Record<string, string> = {};
    if (this.month !== kini.getMonth() || this.year !== kini.getFullYear()) {
      qp['periode'] = `${this.year}-${String(this.month + 1).padStart(2, '0')}`;
    }
    if (this.page > 1) qp['hal'] = String(this.page);
    if (this.pageSize !== 20) qp['per'] = String(this.pageSize);
    const lama = this.route.snapshot.queryParams ?? {};
    const sama =
      Object.keys(qp).length === Object.keys(lama).length &&
      Object.keys(qp).every((k) => String(lama[k]) === qp[k]);
    if (sama) return;
    this.router.navigate([], { relativeTo: this.route, queryParams: qp, replaceUrl: true });
  }

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
    const q = this.route.snapshot.queryParamMap;
    const m = /^(\d{4})-(\d{2})$/.exec(q.get('periode') ?? '');
    if (m) {
      this.year = Number(m[1]);
      this.month = Math.min(11, Math.max(0, Number(m[2]) - 1));
    }
    const per = Number(q.get('per'));
    if ([10, 20, 25, 50, 100].includes(per)) this.pageSize = per;
    const hal = Number(q.get('hal'));
    this.fetchMetaData();
    this.fetchData(Number.isFinite(hal) && hal > 1 ? Math.floor(hal) : 1);
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
    this.simpanKeAlamat();
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
