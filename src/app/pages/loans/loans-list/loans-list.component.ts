import { CommonModule } from '@angular/common';
import { CanDirective } from '../../../directives/can.directive';
import { Component } from '@angular/core';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { HeaderTitleComponent } from '../../../components/header-title/header-title.component';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiService } from '../../../services/api.service';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { LoansCreateComponent } from '../loans-create/loans-create.component';
import { LoansUpdateComponent } from '../loans-update/loans-update.component';
import { LoanPaymentCreateComponent } from '../../../components/payment-create/loan-payment-create/loan-payment-create.component';
import { LoansViewComponent } from '../loans-view/loans-view.component';
import { RefreshButtonComponent } from '../../../components/refresh-button/refresh-button.component';

@Component({
  selector: 'app-loans-list',
  imports: [
    CanDirective,
    TranslatePipe,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    HeaderTitleComponent,
    MatIconModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule,
    MatButtonModule,
    RefreshButtonComponent,
  ],
  templateUrl: './loans-list.component.html',
  styleUrl: './loans-list.component.scss',
  standalone: true,
})
export class LoansListComponent {
  /** track by id: hindari render ulang seluruh baris saat data berubah. */
  trackById = (_: number, row: any): any => row?.id ?? _;

  constructor(
    private apiService: ApiService,
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog,
  ) {}

  private destroy$ = new Subject<void>();

  filterFormGroup: FormGroup = new FormGroup({
    isPaid: new FormControl(false, { nonNullable: true }),
    isUnpaid: new FormControl(true, { nonNullable: true }),
  });

  chipSelections: { [key: string]: boolean } = {
    isPaid: false,
    isUnpaid: true,
  };

  sortBy: string = 'date';
  sortByDirection: string = 'desc';

  searchControl: FormControl = new FormControl('');

  dataSource: any[] = [];
  dataCount: number = 0;
  page: number = 0;
  pageSize: number = 10;

  isLoading: boolean = false;

  displayedColumns: string[] = [
    'date',
    'creditorName',
    'description',
    'debt',
    'received',
    'status',
    'action',
  ];

  isChipSelected(field: string): boolean {
    return this.chipSelections[field];
  }

  /*
   * Pemuatan PERTAMA.
   *
   * Dulu tidak ada `ngOnInit` sama sekali: data termuat hanya karena chip
   * yang dipilih lewat `[selected]` ikut memancarkan selectionChange. Sejak
   * pancaran palsu itu disaring (transisi ganda), halaman ini kosong sampai
   * disegarkan — dan pendengar pencariannya pun tidak pernah terpasang.
   */
  ngOnInit(): void {
    const q = this.route.snapshot?.queryParamMap;
    const n = (k: string) => Number(q?.get(k));
    if (Number.isFinite(n('page')) && n('page') >= 0 && q?.get('page')) this.page = n('page');
    if (Number.isFinite(n('pageSize')) && n('pageSize') > 0) this.pageSize = n('pageSize');
    if (q?.get('sortBy')) this.sortBy = q.get('sortBy')!;
    if (q?.get('sortByDirection')) this.sortByDirection = q.get('sortByDirection')!;
    if (q?.get('search')) this.searchControl.setValue(q.get('search'), { emitEvent: false });
    for (const k of ['isPaid', 'isUnpaid']) {
      const v = q?.get(k);
      if (v === 'true' || v === 'false') {
        this.filterFormGroup.get(k)?.setValue(v === 'true', { emitEvent: false });
        this.chipSelections[k] = v === 'true';
      }
    }
    this.setupQueryParamListeners();
    this.fetchData(this.page, this.pageSize);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupQueryParamListeners(): void {
    this.filterFormGroup.valueChanges
      .pipe(takeUntil(this.destroy$), debounceTime(300))
      .subscribe(() => {
        this.updateQueryParams();
      });

    this.searchControl.valueChanges
      .pipe(takeUntil(this.destroy$), debounceTime(500))
      .subscribe((value) => {
        this.updateQueryParams();
        this.fetchData(0);
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

  createNewLoan() {
    this.dialog.open(LoansCreateComponent, {});
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

  changeSelection(field: string, event: any) {
    // Chip yang dipilih LEWAT KODE (`[selected]` saat halaman dibuka)
    // juga memancarkan `selectionChange`. Tanpa penyaring ini URL ditulis
    // ulang dan data dimuat ganda saat halaman baru dibuka — transisi
    // halamannya pun jalan dua kali.
    if (event?.isUserInput === false) return;
    this.filterFormGroup.get(field)?.setValue(event.selected);
    this.chipSelections[field] = event.selected;
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

    this.updateQueryParams();
    this.fetchData(0);
  }

  // `targetPage` bawaannya HALAMAN SAAT INI, bukan 1.
  //
  // Tombol muat-ulang memanggil `fetchData()` tanpa argumen; bawaan lama `1`
  // membuat setiap kali refresh MELONCAT dari halaman yang sedang dibuka ke
  // halaman berikutnya (dan pada daftar 0-indeks, `1` itu halaman kedua).
  // Yang menekan refresh ingin melihat data terbaru pada halaman yang SAMA —
  // bukan dipindahkan. Pemanggil yang memang hendak kembali ke halaman
  // pertama tetap melewatkan `0` secara eksplisit.
  fetchData(targetPage: number = this.page, pageSize: number = this.pageSize) {
    this.isLoading = true;
    let filter: any = {};
    const searchValue = this.searchControl.value;

    const filterValue = this.filterFormGroup.value;

    if (
      Object.values(filterValue).every((value) => value === true) ||
      Object.values(filterValue).every((value) => value === false)
    ) {
      filter = {
        isPaid: filterValue.isPaid,
        isUnpaid: filterValue.isUnpaid,
      };
    } else {
      for (const [key, value] of Object.entries(filterValue)) {
        filter[key] = value;
      }
    }

    this.page = targetPage;
    this.apiService
      .get('loans', {
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
          this.dataSource = res.data;
          this.dataCount = res.count;
        },
        error: (err) => {
          console.error(err);
        },
      })
      .add(() => {
        this.isLoading = false;
      });
  }

  openPaymentDetail(id: number) {
    this.dialog.open(LoanPaymentCreateComponent, {
      data: {
        loanID: id,
      },
    });
  }

  /**
   * Ubah data pinjaman.
   *
   * Barisnya dikirim utuh agar dialog dapat menampilkan nilai pinjaman
   * sebagai keterangan — nilainya tidak dapat diubah, tetapi perlu terlihat
   * agar pengguna tahu pinjaman mana yang sedang disunting.
   */
  editLoan(loan: any) {
    this.dialog
      .open(LoansUpdateComponent, { data: { loan } })
      .afterClosed()
      .subscribe((berubah) => {
        if (berubah) this.fetchData(this.page, this.pageSize);
      });
  }

  viewLoan(id: number) {
    this.dialog.open(LoansViewComponent, {
      data: {
        id: id,
      },
    });
  }
}
