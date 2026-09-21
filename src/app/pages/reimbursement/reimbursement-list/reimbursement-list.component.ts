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
import { RefreshButtonComponent } from '../../../components/refresh-button/refresh-button.component';

@Component({
  selector: 'app-reimbursement-list',
  imports: [
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
    RefreshButtonComponent,
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

  /**
   * Saringan status BAWAAN: disetujui + menunggu, tanpa yang ditolak.
   *
   * Reimbursement yang ditolak tidak menuntut tindakan apa pun — ia sudah
   * selesai, dan selesainya dengan tidak terjadi. Menampilkannya secara
   * bawaan membuat daftar yang dibuka untuk mengerjakan sesuatu berisi baris
   * yang justru tidak dapat dikerjakan, dan pada bulan yang ramai baris
   * itulah yang paling banyak.
   *
   * TIDAK disembunyikan: chip "Ditolak" tetap ada dan tinggal ditekan.
   * Bedanya cuma pada apa yang muncul tanpa diminta.
   *
   * `isPaid`/`isUnpaid` sengaja dibiarkan mati — itu saringan PEMBAYARAN,
   * bukan status, dan server memperlakukannya sebagai kelompok OR tersendiri.
   * Menyalakannya ikut akan mempersempit daftarnya dua kali.
   */
  private static readonly SARINGAN_BAWAAN: Record<string, boolean> = {
    isApprove: true,
    isPending: true,
    isDelete: false,
    isPaid: false,
    isUnpaid: false,
  };

  filterFormGroup: FormGroup = new FormGroup({
    isApprove: new FormControl(
      ReimbursementListComponent.SARINGAN_BAWAAN['isApprove'],
      { nonNullable: true },
    ),
    isDelete: new FormControl(
      ReimbursementListComponent.SARINGAN_BAWAAN['isDelete'],
      { nonNullable: true },
    ),
    isPending: new FormControl(
      ReimbursementListComponent.SARINGAN_BAWAAN['isPending'],
      { nonNullable: true },
    ),
    isPaid: new FormControl(
      ReimbursementListComponent.SARINGAN_BAWAAN['isPaid'],
      { nonNullable: true },
    ),
    isUnpaid: new FormControl(
      ReimbursementListComponent.SARINGAN_BAWAAN['isUnpaid'],
      { nonNullable: true },
    ),
  });

  // Add chip selections tracking
  chipSelections: { [key: string]: boolean } = {
    ...ReimbursementListComponent.SARINGAN_BAWAAN,
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
        /*
         * Bawaan berlaku HANYA saat URL-nya belum menyebut saringan apa pun.
         *
         * Begitu seseorang menyentuh satu chip, pendengar di bawah menulis
         * SELURUH kunci ke URL — jadi hadirnya satu kunci sudah berarti
         * pilihannya disengaja, termasuk pilihan mengosongkan semuanya.
         * Memaksakan bawaan di situ akan menyalakan kembali chip yang baru
         * saja dimatikan orangnya, dan itu terbaca sebagai halaman yang
         * menolak diatur.
         */
        const adaSaringanDiUrl = filterKeys.some(
          (k) => params[k] !== undefined,
        );

        filterKeys.forEach((key) => {
          /*
           * Cabang "tidak ada di URL" dulu HANYA menyetel `chipSelections`
           * dan tidak menyentuh form controlnya — jadi chip dan saringan
           * yang benar-benar dikirim bisa berbeda tanpa satu pun galat.
           * Sekarang keduanya selalu disetel dari nilai yang sama.
           */
          const nilai = adaSaringanDiUrl
            ? params[key] === 'true'
            : ReimbursementListComponent.SARINGAN_BAWAAN[key];

          this.filterFormGroup.get(key)?.setValue(nilai, { emitEvent: false });
          this.chipSelections[key] = nilai;
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
    // Chip yang dipilih LEWAT KODE (`[selected]` saat halaman dibuka)
    // juga memancarkan `selectionChange`. Tanpa penyaring ini URL ditulis
    // ulang dan data dimuat ganda saat halaman baru dibuka — transisi
    // halamannya pun jalan dua kali.
    if (event?.isUserInput === false) return;
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
