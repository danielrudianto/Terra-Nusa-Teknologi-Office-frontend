import { CommonModule } from '@angular/common';
import { ServerMessageService } from 'src/app/services/server-message.service';
import { TranslateService } from '@ngx-translate/core';
import { AccountService } from '../../../services/account.service';
import { CanDirective } from '../../../directives/can.directive';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { HeaderTitleComponent } from '../../../components/header-title/header-title.component';
import { TranslatePipe } from '@ngx-translate/core';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { PaymentViewComponent } from '../payment-view/payment-view.component';
import { MatDialog } from '@angular/material/dialog';
import { DeleteConfirmationComponent } from '../../../components/delete-confirmation/delete-confirmation.component';
import { RefreshButtonComponent } from '../../../components/refresh-button/refresh-button.component';

@Component({
  selector: 'app-payment-list',
  imports: [
    CanDirective,
    TranslatePipe,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatChipsModule,
    MatIconModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatMenuModule,
    MatButtonModule,
    HeaderTitleComponent,
    RefreshButtonComponent,
  ],
  templateUrl: './payment-list.component.html',
  styleUrl: './payment-list.component.scss',
  standalone: true,
})
export class PaymentListComponent implements OnInit, OnDestroy {
  private readonly serverMessage = inject(ServerMessageService);
  private readonly translate = inject(TranslateService);
  constructor(
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog,
  ) {}

  private readonly account = inject(AccountService);

  /**
   * Pembayaran ini dibuat oleh pengguna yang sedang masuk.
   *
   * Persetujuan atas dokumen sendiri ditolak server bagi yang bukan pemilik
   * usaha. Diperiksa juga di sini supaya tombolnya tidak menawarkan sesuatu
   * yang pasti gagal — penolakan setelah ditekan terbaca sebagai kerusakan,
   * bukan sebagai aturan.
   */
  buatanSendiri(payment: any): boolean {
    const saya = this.account.userId;
    // Tanpa id, anggap bukan buatan sendiri; server tetap menolak bila
    // ternyata iya, dan pesannya lebih jelas daripada tombol yang mati.
    if (saya === null) return false;
    return Number(payment?.createdBy) === saya;
  }

  /** Pemilik usaha boleh menyetujui dokumen buatannya sendiri. */
  get pemilikUsaha(): boolean {
    return Number(this.account.user?.['authenticationLevel']) >= 5;
  }

  /** Tombol setujui tidak berlaku pada pembayaran ini. */
  tidakBolehSetujui(payment: any): boolean {
    return this.buatanSendiri(payment) && !this.pemilikUsaha;
  }

  private destroy$ = new Subject<void>();

  isPending: boolean = true;
  isApproved: boolean = false;
  isRejected: boolean = false;

  /** Rentang tanggal & pencarian — nilainya juga tersimpan di alamat halaman. */
  readonly dariCtrl = new FormControl<Date | null>(null);
  readonly sampaiCtrl = new FormControl<Date | null>(null);
  readonly cariCtrl = new FormControl<string>('');
  dateFrom: string | null = null;
  dateTo: string | null = null;
  keyword: string = '';

  payments: any[] = [];
  count: number = 0;
  isLoading: boolean = true;
  page: number = 1;
  pageSize: number = 10;
  displayedColumns: string[] = [
    'date',
    'bankAccount',
    'documentName',
    'opponent',
    'amount',
    'approvalStatus',
    'documentStatus',
    'action',
  ];
  sortBy: string = 'date';
  sortByDirection: 'asc' | 'desc' = 'desc';

  ngOnInit(): void {
    this.loadStateFromQueryParams();

    // Pencarian ditunda sejenak: mengetik "budi" tidak memicu empat kali
    // pemuatan, hanya satu setelah ketikannya berhenti.
    this.cariCtrl.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((value) => {
        this.keyword = (value || '').trim();
        this.page = 1;
        this.updateQueryParams();
        this.fetchPayments(1);
      });

    this.dariCtrl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((value) => {
        this.dateFrom = this.toYmd(value);
        this.page = 1;
        this.updateQueryParams();
        this.fetchPayments(1);
      });

    this.sampaiCtrl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((value) => {
        this.dateTo = this.toYmd(value);
        this.page = 1;
        this.updateQueryParams();
        this.fetchPayments(1);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Tanggal → 'YYYY-MM-DD' dari bagian LOKAL; `toISOString` menggeser ke UTC. */
  private toYmd(d: Date | null | undefined): string | null {
    if (!d) return null;
    const bulan = `${d.getMonth() + 1}`.padStart(2, '0');
    const hari = `${d.getDate()}`.padStart(2, '0');
    return `${d.getFullYear()}-${bulan}-${hari}`;
  }

  private parseYmd(s: string | null | undefined): Date | null {
    if (!s) return null;
    const t = new Date(s);
    return isNaN(t.getTime()) ? null : t;
  }

  /** Kosongkan rentang tanggal & pencarian sekaligus. */
  bersihkanFilter(): void {
    this.keyword = '';
    this.dateFrom = null;
    this.dateTo = null;
    this.cariCtrl.setValue('', { emitEvent: false });
    this.dariCtrl.setValue(null, { emitEvent: false });
    this.sampaiCtrl.setValue(null, { emitEvent: false });
    this.page = 1;
    this.updateQueryParams();
    this.fetchPayments(1);
  }

  get adaFilter(): boolean {
    return !!(this.keyword || this.dateFrom || this.dateTo);
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

        // Load filter states - RESET to false if not in params
        this.isPending =
          params['isPending'] == undefined
            ? true
            : params['isPending'] === 'true';
        this.isApproved = params['isApproved'] === 'true';
        this.isRejected = params['isRejected'] === 'true';

        // Rentang tanggal & pencarian. Kontrolnya ikut disetel tanpa memicu
        // valueChanges, supaya memuat dari alamat tidak menjadwalkan pemuatan
        // kedua di atas pemuatan ini.
        this.dateFrom = params['dateFrom'] || null;
        this.dateTo = params['dateTo'] || null;
        this.keyword = params['keyword'] || '';
        this.cariCtrl.setValue(this.keyword, { emitEvent: false });
        this.dariCtrl.setValue(this.parseYmd(this.dateFrom), {
          emitEvent: false,
        });
        this.sampaiCtrl.setValue(this.parseYmd(this.dateTo), {
          emitEvent: false,
        });

        // Fetch data with loaded state
        this.fetchPayments(this.page);
      });
  }

  private updateQueryParams(): void {
    const queryParams: any = {
      page: this.page,
      pageSize: this.pageSize,
      sortBy: this.sortBy,
      sortByDirection: this.sortByDirection,
      isPending: this.isPending ? 'true' : null,
      isApproved: this.isApproved ? 'true' : null,
      isRejected: this.isRejected ? 'true' : null,
      dateFrom: this.dateFrom || null,
      dateTo: this.dateTo || null,
      keyword: this.keyword || null,
    };

    // Remove null values
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

  onPageChange(event: any): void {
    if (event.pageSize == this.pageSize) {
      this.page = event.pageIndex + 1;
    } else {
      this.page = 1;
      this.pageSize = event.pageSize;
    }

    this.updateQueryParams();
    this.fetchPayments(this.page);
  }

  fetchPayments(targetPage: number): void {
    this.isLoading = true;
    this.page = targetPage;

    const params: any = {
      page: this.page,
      pageSize: this.pageSize,
      isApproved: this.isApproved,
      isPending: this.isPending,
      isRejected: this.isRejected,
      sortBy: this.sortBy,
      sortByDirection: this.sortByDirection,
    };
    if (this.dateFrom) params.dateFrom = this.dateFrom;
    if (this.dateTo) params.dateTo = this.dateTo;
    if (this.keyword) params.keyword = this.keyword;

    this.apiService
      .get('outgoing-payments', params)
      .subscribe({
        next: (data: any) => {
          this.payments = data.data;
          this.count = data.count;
        },
        error: (error) => {
          console.error(error);
          this.snackBar.open(
      this.translate.instant('notify.loadFailed'), 'Close', {
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

    this.updateQueryParams();
    this.fetchPayments(1);
  }

  approvePayment(paymentID: number) {
    this.dialog
      .open(DeleteConfirmationComponent, {
        data: {
          title: 'Approve payment',
          prompt: 'Are you sure you want to approve this payment?',
        },
      })
      .afterClosed()
      .subscribe((data) => {
        if (data === true) {
          this.apiService
            .put(`outgoing-payments/approve/${paymentID}`, {})
            .subscribe({
              next: (data: any) => {
                this.snackBar.open(
      this.translate.instant('notify.approveSuccess'), 'Close', {
                  duration: 3000,
                });

                const index = this.payments.findIndex((x) => x.id == paymentID);
                if (index != -1) {
                  this.payments[index].isApprove = true;
                }
              },
              error: (error) => {
                this.snackBar.open(
          this.serverMessage.terjemahkan(error), 'Close', {
                  duration: 3000,
                });
              },
            });
        }
      });
  }

  rejectPayment(paymentID: number) {
    this.dialog
      .open(DeleteConfirmationComponent, {
        data: {
          title: 'Reject payment',
          prompt: 'Are you sure you want to reject this payment?',
        },
      })
      .afterClosed()
      .subscribe((data) => {
        if (data === true) {
          this.apiService
            .put(`outgoing-payments/reject/${paymentID}`, {})
            .subscribe({
              next: (data: any) => {
                this.snackBar.open(
      this.translate.instant('notify.paymentRejected'), 'Close', {
                  duration: 3000,
                });

                const index = this.payments.findIndex((x) => x.id == paymentID);
                if (index != -1) {
                  this.payments[index].isDelete = true;
                }
              },
              error: (error) => {
                this.snackBar.open(
          this.serverMessage.terjemahkan(error), 'Close', {
                  duration: 3000,
                });
              },
            });
        }
      });
  }

  changeSelection(field: string, event: any): void {
    switch (field) {
      case 'pending':
        this.isPending = event.selected;
        break;
      case 'approved':
        this.isApproved = event.selected;
        break;
      case 'rejected':
        this.isRejected = event.selected;
        break;
    }

    this.updateQueryParams();
    this.fetchPayments(1);
  }

  viewPayment(id: number) {
    this.dialog
      .open(PaymentViewComponent, {
        data: {
          id: id,
        },
      })
      .afterClosed()
      .subscribe((berubah) => {
        // Dialog menutup dengan `true` bila pembayarannya dihapus dari sana —
        // daftarnya dimuat ulang supaya barisnya tidak tertinggal seolah masih
        // aktif.
        if (berubah) this.fetchPayments(this.page);
      });
  }
}
