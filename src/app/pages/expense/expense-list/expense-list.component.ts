import { Component, OnDestroy, inject } from '@angular/core';
import { ServerMessageService } from 'src/app/services/server-message.service';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { debounceTime, takeUntil, Subject } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';
import { ExpenseOpponentCreateComponent } from '../expense-opponent/expense-opponent-create/expense-opponent-create.component';
import { ExpensePaymentCreateComponent } from 'src/app/components/payment-create/expense-payment-create/expense-payment-create.component';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatTableModule } from '@angular/material/table';
import { HeaderTitleComponent } from '../../../components/header-title/header-title.component';
import { TranslatePipe } from '@ngx-translate/core';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule } from '@angular/material/paginator';
import { ExpenseViewComponent } from '../expense-view/expense-view.component';
import { provideNativeDateAdapter } from '@angular/material/core';
import moment from 'moment';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { RefreshButtonComponent } from '../../../components/refresh-button/refresh-button.component';

@Component({
  selector: 'app-expense-list',
  imports: [
    MatDatepickerModule,
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    RouterModule,
    MatSnackBarModule,
    MatChipsModule,
    MatPaginatorModule,
    HeaderTitleComponent,
    MatSlideToggleModule,
    TranslatePipe,
    RefreshButtonComponent,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './expense-list.component.html',
  styleUrl: './expense-list.component.scss',
})
export class ExpenseListComponent {
  /** track by id: hindari render ulang seluruh baris saat data berubah. */
  trackById = (_: number, row: any): any => row?.id ?? _;

  private readonly serverMessage = inject(ServerMessageService);
  /** map kode expense type -> i18n key. */
  private static readonly EXPENSE_TYPE_MAP: { [k: string]: string } = {
    '5.1.1': '5_1_1',
    '5.1.2': '5_1_2',
    '5.1.3': '5_1_3',
    '5.1.4': '5_1_4',
    '5.1.5': '5_1_5',
    '5.1.6': '5_1_6',
    '5.1.7': '5_1_7',
    '5.1.8': '5_1_8',
    '5.1.8.1': '5_1_8_1',
    '5.1.8.2': '5_1_8_2',
    '5.1.8.3': '5_1_8_3',
    '5.1.8.4': '5_1_8_4',
    '5.1.8.5': '5_1_8_5',
    '5.1.8.6': '5_1_8_6',
    '5.1.8.7': '5_1_8_7',
    '5.1.9': '5_1_9',
    '5.1.10': '5_1_10',
    '5.1.11': '5_1_11',
    '5.1.12': '5_1_12',
    '5.1.13': '5_1_13',
    '5.1.14': '5_1_14',
    A: 'A',
    B: 'B',
    C: 'C',
    D: 'D',
    E: 'E',
    F: 'F',
    G: 'G',
    H1: 'H1',
    H2: 'H2',
    '6.3.1': '6_3_1',
    '6.3.2': '6_3_2',
    '6.4.1': '6_4_1',
    '6.4.2': '6_4_2',
    '6.5.1': '6_5_1',
    '6.5.2': '6_5_2',
    '6.5.3': '6_5_3',
  };

  /** kembalikan i18n key untuk expense type; fallback 'unknown'. */
  expenseTypeKey(code: string): string {
    const k = ExpenseListComponent.EXPENSE_TYPE_MAP[code] || 'unknown';
    return 'expenseType.' + k;
  }

  private destroy$ = new Subject<void>();

  constructor(
    private apiService: ApiService,
    private dialog: MatDialog,
    private router: Router,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute,
  ) {}

  filterFormGroup: FormGroup = new FormGroup({
    isDue: new FormControl(false, { nonNullable: true }),
    isNotDue: new FormControl(false, { nonNullable: true }),
    isPaid: new FormControl(false, { nonNullable: true }),
    isUnpaid: new FormControl(false, { nonNullable: true }),
  });

  date: Date = new Date();
  startOfMonth: Date = new Date(
    this.date.getFullYear(),
    this.date.getMonth(),
    1,
  );
  endOfMonth: Date = new Date(
    this.date.getFullYear(),
    this.date.getMonth() + 1,
    0,
  );

  formGroup: FormGroup = new FormGroup({
    start: new FormControl<Date | null>(this.startOfMonth, Validators.required),
    end: new FormControl<Date | null>(this.endOfMonth, Validators.required),
  });

  // Add chip selections tracking
  chipSelections: { [key: string]: boolean } = {
    isDue: false,
    isNotDue: false,
    isPaid: false,
    isUnpaid: false,
  };

  sortBy: string = 'date';
  sortByDirection: string = 'desc';

  searchControl: FormControl = new FormControl('');
  ignoreControl: FormControl = new FormControl(false);
  page: number = 0;
  purchases: any[] = [];
  count: number = 0;
  isLoading: boolean = false;
  pageSize: number = 10;
  displayedColumns: string[] = [
    'date',
    'invoiceName',
    'supplier',
    'total',
    'expenseType',
    'masaPajak',
    'paidStatus',
    'action',
  ];

  /**
   * Tanggal buku (masa yang ditanggung) sebagai "MM/YYYY".
   * Kosong -> "N/A": beban biasa memang tidak menanggung suatu periode.
   */
  formatMasa(masa: string | null | undefined): string {
    if (!masa) return 'N/A';
    const d = new Date(masa);
    if (isNaN(d.getTime())) return 'N/A';
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }

  /**
   * Kunci penyimpanan state daftar (filter, pencarian, halaman, urutan).
   *
   * Disimpan agar sesudah membuka/mengubah beban lalu kembali ke daftar,
   * pengguna mendarat di halaman, keyword, rentang tanggal, dan urutan yang
   * SAMA — bukan halaman 1 yang kosong. Pakai sessionStorage: cukup untuk satu
   * sesi tab, tidak mengotori URL, dan tidak perlu merombak formulir jadi
   * dialog.
   */
  private readonly STATE_KEY = 'expenseListState';

  private simpanState(): void {
    try {
      sessionStorage.setItem(
        this.STATE_KEY,
        JSON.stringify({
          keyword: this.searchControl.value ?? '',
          ignore: !!this.ignoreControl.value,
          start: this.formGroup.controls['start'].value,
          end: this.formGroup.controls['end'].value,
          filter: this.filterFormGroup.value,
          chip: this.chipSelections,
          sortBy: this.sortBy,
          sortByDirection: this.sortByDirection,
          page: this.page,
          pageSize: this.pageSize,
        }),
      );
    } catch {
      /* storage tidak tersedia — abaikan, daftar tetap jalan */
    }
  }

  /** Kembalikan state daftar dari sesi sebelumnya. `true` bila ada yang dipulihkan. */
  private pulihkanState(): boolean {
    try {
      const raw = sessionStorage.getItem(this.STATE_KEY);
      if (!raw) return false;
      const s = JSON.parse(raw);

      this.searchControl.setValue(s.keyword ?? '', { emitEvent: false });
      this.ignoreControl.setValue(!!s.ignore, { emitEvent: false });
      if (s.start)
        this.formGroup.controls['start'].setValue(new Date(s.start), {
          emitEvent: false,
        });
      if (s.end)
        this.formGroup.controls['end'].setValue(new Date(s.end), {
          emitEvent: false,
        });
      if (s.filter)
        this.filterFormGroup.setValue(s.filter, { emitEvent: false });
      if (s.chip) this.chipSelections = s.chip;
      if (s.sortBy) this.sortBy = s.sortBy;
      if (s.sortByDirection) this.sortByDirection = s.sortByDirection;
      this.page = s.page ?? 0;
      this.pageSize = s.pageSize ?? 10;

      // "Abaikan tanggal" hanya aktif saat ada keyword.
      if ((s.keyword ?? '').trim() !== '') {
        this.ignoreControl.enable({ emitEvent: false });
      } else {
        this.ignoreControl.disable({ emitEvent: false });
      }
      return true;
    } catch {
      return false;
    }
  }

  ngOnInit(): void {
    // Pulihkan state SEBELUM fetch pertama; kalau tak ada, pakai default.
    const dipulihkan = this.pulihkanState();
    if (!dipulihkan) {
      this.ignoreControl.disable();
    }
    this.fetchData(this.page);

    this.formGroup.valueChanges.pipe(debounceTime(100)).subscribe(() => {
      this.fetchData(0);
    });

    this.searchControl.valueChanges.pipe(debounceTime(500)).subscribe(() => {
      const search = this.searchControl.value.trim();
      if (search === '') {
        this.ignoreControl.setValue(false, {
          emitEvent: false,
        });
      }
      this.fetchData(0);
    });

    this.ignoreControl.valueChanges.pipe(debounceTime(100)).subscribe(() => {
      this.fetchData(0);
    });
  }

  isChipSelected(field: string): boolean {
    return this.chipSelections[field];
  }

  openCreateOpponentDialog() {
    this.dialog.open(ExpenseOpponentCreateComponent, {});
  }

  openPaymentDetail(id: number) {
    this.dialog.open(ExpensePaymentCreateComponent, {
      data: {
        purchaseID: null,
        expenseID: id,
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

    this.fetchData(this.page, this.pageSize);
  }

  changeSelection(field: string, event: any) {
    const isSelected = event.selected;
    this.filterFormGroup.get(field)?.setValue(isSelected);
    this.chipSelections[field] = isSelected;
    this.fetchData(0);
  }

  changeSortBy(sortBy: string) {
    if (this.sortBy === sortBy) {
      this.sortByDirection = this.sortByDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = sortBy;
      this.sortByDirection = 'asc';
    }

    this.fetchData(0);
  }

  // Bawaan HALAMAN SAAT INI, bukan 1 — lihat catatan yang sama di daftar
  // pinjaman: tombol muat-ulang memanggil `fetchData()` tanpa argumen, dan
  // bawaan `1` membuat setiap refresh meloncat ke halaman berikutnya.
  fetchData(targetPage: number = this.page, pageSize: number = this.pageSize) {
    if (this.formGroup.invalid) return;

    this.isLoading = true;
    let filter: any = {};
    const searchValue = this.searchControl.value;

    const filterValue = this.filterFormGroup.value;
    // if all the filter value is true or all the filter value is false, then filter = {}, filter = 0
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
    this.pageSize = pageSize;
    // Simpan state tiap fetch agar kembali ke daftar memulihkan kondisi ini.
    this.simpanState();
    this.apiService
      .get('expenses', {
        page: this.page,
        pageSize: pageSize,
        // if filter is empty, then filter = 0
        filter: Object.keys(filter).length === 0 ? 0 : 1,
        ...filter,
        sortBy: this.sortBy,
        sortByDirection: this.sortByDirection,
        keyword: searchValue,
        start: moment(this.formGroup.value.start).format('YYYY-MM-DD'),
        end: moment(this.formGroup.value.end).format('YYYY-MM-DD'),
        ignore: this.ignoreControl.value,
      })
      .subscribe({
        next: (res: any) => {
          this.purchases = res.data;
          this.count = res.count;
        },
        error: (err) => {
          this.snackBar.open(
          this.serverMessage.terjemahkan(err), 'Close', {
            duration: 3000,
          });
        },
      })
      .add(() => {
        this.isLoading = false;
      });
  }

  createNewExpense() {
    this.router.navigate(['/Expense/Create']);
  }

  viewExpense(id: number) {
    this.dialog.open(ExpenseViewComponent, {
      data: {
        id: id,
      },
    });
  }
}
