import { Component, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CanDirective } from '../../../directives/can.directive';
import { PurchaseOrderViewComponent } from '../../purchase-order/purchase-order-view/purchase-order-view.component';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from 'src/app/services/api.service';
import { PurchaseReportSelectComponent } from './purchase-report-select/purchase-report-select.component';
import { PurchasePaymentCreateComponent } from '../../../components/payment-create/purchase-payment-create/purchase-payment-create.component';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { PurchaseViewComponent } from '../purchase-view/purchase-view.component';
import { DeleteConfirmationComponent } from 'src/app/components/delete-confirmation/delete-confirmation.component';
import { PurchaseUpdateComponent } from '../purchase-update/purchase-update.component';
import { PurchaseUpdateMetaComponent } from '../purchase-update-meta/purchase-update-meta.component';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { HeaderTitleComponent } from '../../../components/header-title/header-title.component';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { TranslatePipe } from '@ngx-translate/core';
import { SettingsService } from '../../../services/setting.service';
import { PermissionService } from '../../../services/permission.service';
import { RefreshButtonComponent } from '../../../components/refresh-button/refresh-button.component';
import { ShortCurrencyPipe } from 'src/app/pipes/short-currency.pipe';

@Component({
  selector: 'app-purchase-list',
  imports: [
    CanDirective,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatChipsModule,
    MatMenuModule,
    MatPaginatorModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    HeaderTitleComponent,
    MatSnackBarModule,
    TranslatePipe,
    RefreshButtonComponent,
    ShortCurrencyPipe,
  ],
  templateUrl: './purchase-list.component.html',
  styleUrls: ['./purchase-list.component.scss'],
  standalone: true,
})
export class PurchaseListComponent {
  private readonly translate = inject(TranslateService);
  constructor(
    private permissionService: PermissionService,
    public settings: SettingsService,
    private apiService: ApiService,
    private dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
  ) {}

  private destroy$ = new Subject<void>();

  filterFormGroup: FormGroup = new FormGroup({
    isDue: new FormControl(false, { nonNullable: true }),
    isNotDue: new FormControl(false, { nonNullable: true }),
    isPaid: new FormControl(false, { nonNullable: true }),
    isUnpaid: new FormControl(false, { nonNullable: true }),
    isReady: new FormControl(false, { nonNullable: true }),
    isDraft: new FormControl(false, { nonNullable: true }),
  });

  chipSelections: { [key: string]: boolean } = {
    isDue: false,
    isNotDue: false,
    isPaid: false,
    isUnpaid: false,
    isReady: false,
    isDraft: false,
  };

  sortBy: string = 'date';
  sortByDirection: string = 'desc';

  searchControl: FormControl = new FormControl('');

  page: number = 0;
  purchases: any[] = [];
  count: number = 0;
  isLoading: boolean = false;
  /** Nilai awal dari pengaturan pengguna; tetap bisa diubah per halaman. */
  pageSize: number = this.settings.pageSize;
  displayedColumns: string[] = [
    'date',
    'invoiceName',
    'supplier',
    'projectName',
    'purchaseOrderName',
    'total',
    'status',
    'paidStatus',
    'isInternal',
    'action',
  ];

  ngOnInit(): void {
    this.loadStateFromQueryParams();
    this.setupQueryParamListeners();
    // Dimuat SEKALI: angkanya menyangkut seluruh tagihan, bukan halaman
    // yang sedang tampil, sehingga tidak perlu diulang tiap ganti halaman.
    this.muatBelumDibayar();
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

        // Load filters
        const filterKeys = [
          'isDue',
          'isNotDue',
          'isPaid',
          'isUnpaid',
          'isReady',
          'isDraft',
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
        this.fetchData(this.page, this.pageSize);
      });
  }

  isChipSelected(field: string): boolean {
    return this.chipSelections[field];
  }

  private setupQueryParamListeners(): void {
    this.filterFormGroup.valueChanges
      .pipe(takeUntil(this.destroy$), debounceTime(300))
      .subscribe(() => {
        this.updateQueryParams();
      });

    this.searchControl.valueChanges
      .pipe(takeUntil(this.destroy$), debounceTime(500))
      .subscribe((_) => {
        this.page = 0;
        this.updateQueryParams();
        this.fetchData();
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

    // Add filter values
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
      replaceUrl: true, // Prevent adding to browser history on every change
    });
  }

  openPurchaseReportSelector() {
    this.dialog.open(PurchaseReportSelectComponent, {});
  }

  openUpdateInternal(id: number) {
    this.dialog.open(PurchaseUpdateComponent, {
      data: {
        id: id,
      },
    });
  }

  /**
   * Level pengguna, untuk membatasi sunting meta pembelian LUAR.
   *
   * `permissionService` sendiri privat; getter ini membuka HANYA angka
   * levelnya ke templat. Servernya tetap yang memutuskan — level 5 di sini
   * hanya menyembunyikan tombol yang pasti akan ditolak, bukan pengaman.
   */
  get userLevel(): number {
    return this.permissionService.level();
  }

  /**
   * Sunting META pembelian LUAR (bukan internal).
   *
   * Membetulkan tanggal / nomor faktur / nomor kuitansi yang salah ketik —
   * dan DPP/PPN/PPh selama belum ada pembayaran. Dialognya sendiri yang
   * memuat datanya; di sini hanya membuka dan menyegarkan daftar bila ada
   * yang benar-benar berubah.
   */
  openUpdateMeta(id: number) {
    this.dialog
      .open(PurchaseUpdateMetaComponent, {
        data: { id },
        width: '460px',
        maxWidth: '94vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((hasil) => {
        if (hasil === 'updated') this.fetchData(this.page);
      });
  }

  /**
   * Hitung ulang status lunas satu pembelian.
   *
   * Statusnya diselaraskan sendiri saat pembayaran disetujui; tombol ini
   * untuk keadaan ketika penyelarasan itu tertinggal — penulisannya gagal
   * setelah pembayarannya tersimpan, dan tidak ada yang mengulanginya.
   *
   * Daftar dimuat ulang sesudahnya agar tanda lunasnya langsung terlihat
   * berubah; tanpa itu yang menekan tidak tahu apakah ada yang terjadi.
   */
  selaraskanLunas(purchaseID: number): void {
    this.apiService
      .post(`outgoing-payments/selaraskan/purchase/${purchaseID}`, {})
      .subscribe({
        next: () => {
          this.snackBar.open(
            this.translate.instant('purchase.lunasDiselaraskan'),
            this.translate.instant('common.close'),
            { duration: 2500 },
          );
          this.fetchData();
        },
        error: (err: any) => {
          this.snackBar.open(
            this.translate.instant('purchase.lunasGagal'),
            this.translate.instant('common.close'),
            { duration: 4000 },
          );
        },
      });
  }

  openPaymentDetail(id: number) {
    this.dialog.open(PurchasePaymentCreateComponent, {
      data: {
        purchaseID: id,
        expenseID: null,
        reimbursementID: null,
      },
    });
  }

  changePage(event: any) {
    if (event.pageSize !== this.pageSize) {
      this.page = 0;
      this.pageSize = event.pageSize;
    } else {
      this.page = event.pageIndex;
    }

    this.updateQueryParams();
    this.fetchData(this.page, this.pageSize);
  }


  /**
   * Tagihan yang belum lunas.
   *
   * Dimuat dari rutenya sendiri, bukan dihitung dari halaman yang sedang
   * tampil: daftarnya berhalaman, dan menghitung dari sepuluh baris yang
   * kebetulan terlihat menghasilkan angka yang selalu terlalu kecil.
   */
  belumDibayar: any = null;

  private muatBelumDibayar(): void {
    this.apiService.get('purchases/belum-dibayar', {}).subscribe({
      next: (res: any) => (this.belumDibayar = res),
      // Gagal memuat TIDAK mengosongkan daftarnya; bannernya saja yang
      // tidak muncul.
      error: () => (this.belumDibayar = null),
    });
  }

  /**
   * Saring daftar ke yang belum lunas.
   *
   * Bannernya menyebut jumlahnya; tanpa jalan menuju daftarnya, yang
   * membacanya harus mencari sendiri saringan mana yang dimaksud.
   */
  lihatBelumDibayar(): void {
    this.filterFormGroup.get('isUnpaid')?.setValue(true);
    this.filterFormGroup.get('isPaid')?.setValue(false);
    this.updateQueryParams();
    this.fetchData(0);
  }

  changeSelection(field: string, event: any) {
    this.filterFormGroup.get(field)?.setValue(event.selected);
    this.updateQueryParams();
    this.fetchData(0);
  }

  changeSortBy(sortBy: string) {
    if (this.sortBy === sortBy) {
      this.sortByDirection = this.sortByDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = sortBy;
      this.sortByDirection = 'asc';
    }

    this.page = 0;

    this.updateQueryParams();
    this.fetchData(0);
  }

  fetchData(targetPage: number = 0, pageSize: number = this.pageSize) {
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
      for (const [key, value] of Object.entries(filterValue)) {
        filter[key] = value;
      }
    }

    this.page = targetPage;
    this.apiService
      .get('purchases', {
        page: this.page,
        pageSize: pageSize,
        filter: Object.keys(filter).length === 0 ? 0 : 1,
        ...filter,
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
          console.error(err);
        },
      })
      .add(() => {
        this.isLoading = false;
      });
  }

  /**
   * Buka dokumen purchase order asal pembelian ini.
   *
   * Nomor PO pada pembelian tersimpan sebagai teks, sehingga dokumennya
   * belum tentu ada — pembelian lama kerap mengacu pada nomor yang dicatat
   * manual sebelum purchase order dibuat di sistem. Nomornya tetap dapat
   * ditekan agar keterangannya jelas; tanpa itu, teks yang tidak bereaksi
   * terbaca seperti tombol yang rusak.
   */
  /**
   * Apakah pengguna ini boleh membuka dokumen purchase order.
   *
   * Izin `purchase` dan `purchase_order` adalah dua modul terpisah, dan
   * tidak selalu dimiliki bersamaan — izin khusus per pengguna dapat
   * memberikan satu tanpa yang lain.
   *
   * Tanpa pemeriksaan ini, nomornya tetap tampil sebagai tautan bagi yang
   * tidak berhak; menekannya menghasilkan penolakan dari server tanpa
   * penjelasan, dan yang membacanya menyangka dokumennya rusak.
   */
  get bolehLihatPO(): boolean {
    return this.permissionService.can('purchase_order', 'read');
  }

  viewPurchaseOrder(id: number) {
    if (!id) {
      this.snackBar.open(
        this.translate.instant('notify.poDocNotAvailable'),
        'Close',
        { duration: 3000 },
      );
      return;
    }
    this.dialog.open(PurchaseOrderViewComponent, {
      data: { id },
      width: '900px',
      maxWidth: '94vw',
      autoFocus: false,
    });
  }

  viewPurchase(id: number) {
    this.dialog
      .open(PurchaseViewComponent, {
        data: {
          id: id,
        },
      })
      .afterClosed()
      .subscribe((value) => {
        if (value === 'delete') {
          this.dialog
            .open(DeleteConfirmationComponent, {
              data: {
                title: 'Delete Purchase',
                prompt: 'Are you sure you want to delete this purchase?',
              },
            })
            .afterClosed()
            .subscribe((result) => {
              if (result === true) {
                this.apiService.delete(`purchases/${id}`).subscribe({
                  next: () => {
                    this.snackBar.open(
                      this.translate.instant('notify.createSuccess'),
                      'Close',
                      {
                        duration: 3000,
                      },
                    );
                    this.fetchData(this.page); // Refresh data after deletion
                  },
                  error: (err) => {
                    console.error('Error deleting purchase:', err);
                    /*
                     * Kode tetap dari server dipetakan ke kalimat, bukan
                     * ditampilkan apa adanya. Tanpa ini yang terbaca pengguna
                     * adalah "PURCHASE_HAS_PAYMENTS" — yang tidak memberi
                     * tahu apa yang harus dilakukan berikutnya.
                     */
                    const pesan =
                      err?.error?.detail === 'PURCHASE_HAS_PAYMENTS'
                        ? this.translate.instant('purchase.deleteHasPayments')
                        : (err?.error?.detail ??
                          this.translate.instant('notify.deleteFailed'));
                    this.snackBar.open(pesan, 'Close', {
                      duration: 6000,
                    });
                  },
                });
              }
            });
        }
      });
  }

  createNewPurchase() {
    this.router.navigate(['/Purchase/Create']);
  }
}
