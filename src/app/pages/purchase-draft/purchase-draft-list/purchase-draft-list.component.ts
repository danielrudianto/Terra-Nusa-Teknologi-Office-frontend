import { Component, ViewChild, inject } from '@angular/core';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ServerMessageService } from 'src/app/services/server-message.service';
import { CanDirective } from '../../../directives/can.directive';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from 'src/app/services/api.service';
import { PurchaseDraftViewComponent } from '../purchase-draft-view/purchase-draft-view.component';
import { CommonModule } from '@angular/common';
import { MatTable, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { HeaderTitleComponent } from '../../../components/header-title/header-title.component';
import { MatChipsModule } from '@angular/material/chips';
import { TranslatePipe } from '@ngx-translate/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { ActivatedRoute, Router } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { PurchaseDraftCreateComponent } from '../purchase-draft-create/purchase-draft-create.component';
import { RefreshButtonComponent } from '../../../components/refresh-button/refresh-button.component';
import { KerangkaTabelDirective } from '../../../directives/kerangka-tabel.directive';
import { RupiahComponent } from '../../../components/rupiah/rupiah.component';
import { NamaBadanComponent, inisialBadan } from '../../../components/nama-badan/nama-badan.component';
import { PILIHAN_BARIS } from 'src/app/constants/paginasi.constant';
import { MatDatepickerModule } from '@angular/material/datepicker';

@Component({
  selector: 'app-purchase-draft-list',
  imports: [
    NamaBadanComponent,
    RupiahComponent,
    KerangkaTabelDirective,
    CanDirective,
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatPaginatorModule,
    HeaderTitleComponent,
    TranslatePipe,
    MatMenuModule,
    RefreshButtonComponent,
    MatDatepickerModule,
  ],
  templateUrl: './purchase-draft-list.component.html',
  styleUrl: './purchase-draft-list.component.scss',
  standalone: true,
})
export class PurchaseDraftListComponent {
  /** Pilihan baris per halaman — satu daftar untuk seluruh aplikasi. */
  readonly pilihanBaris = PILIHAN_BARIS;

  /** Huruf lencana dari NAMA pemasok, bukan dari bentuk badan usahanya. */
  readonly inisialBadan = inisialBadan;

  private readonly serverMessage = inject(ServerMessageService);
  constructor(
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  @ViewChild('table') table: MatTable<any> | undefined;
  page: number = 1;
  pageSize: number = 10;
  isLoading: boolean = false;
  searchControl: FormControl = new FormControl('');
  sortBy: string = 'date';
  sortByDirection: 'asc' | 'desc' = 'asc';
  purchases: any[] = [];
  count: number = 0;

  isPending: boolean = true;
  /*
   * TIGA KEADAAN, bukan dua.
   *
   * `isApproved` nama lama penyaring "dihapus", dan namanya keliru sejak
   * awal — draf yang dihapus ditampilkan sebagai "Disetujui" berlencana
   * centang hijau, sehingga yang barusan dibatalkan terbaca sebagai
   * pekerjaan yang sudah beres. Server kini menerima `isConverted` dan
   * `isDeleted`; `isApproved` tidak lagi dipakai layar ini.
   */
  isApproved: boolean = false;
  isConverted: boolean = false;
  isDeleted: boolean = false;

  /*
   * PENYARING PERIODE — yang dipakai saat menyusun tagihan.
   *
   * Logistik lapangan memasukkan draf setiap hari, sehingga daftar ini
   * panjang dan tidak ada tanda mana yang masuk hitungan bulan ini. Rentang
   * ini yang memotongnya, dan draf lama yang belum berperiode dinilai
   * server menurut tanggal dokumennya supaya tidak ada yang hilang.
   */
  periodeMulai = new FormControl<any>(null);
  periodeSelesai = new FormControl<any>(null);

  /** `Date`/Moment/teks -> `YYYY-MM-DD` waktu setempat; kosong tetap null. */
  private tanggalIso(v: any): string | null {
    if (!v) return null;
    const d =
      v instanceof Date
        ? v
        : typeof v?.toDate === 'function'
          ? v.toDate()
          : new Date(v);
    if (isNaN(d.getTime())) return null;
    const dd = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${dd(d.getMonth() + 1)}-${dd(d.getDate())}`;
  }

  /** Keadaan satu draf: belum diapa-apakan, sudah jadi pembelian, atau dihapus. */
  keadaan(d: any): 'draf' | 'konversi' | 'hapus' {
    if (d?.convertedAt) return 'konversi';
    if (d?.isDelete) return 'hapus';
    return 'draf';
  }

  changeSelection(field: string, event: any) {
    // Chip yang dipilih LEWAT KODE (`[selected]` saat halaman dibuka)
    // juga memancarkan `selectionChange`. Tanpa penyaring ini URL ditulis
    // ulang dan data dimuat ganda saat halaman baru dibuka — transisi
    // halamannya pun jalan dua kali.
    if (event?.isUserInput === false) return;
    switch (field) {
      case 'isPending':
        this.isPending = event.selected;
        this.fetchData(1);
        break;
      case 'isConverted':
        this.isConverted = event.selected;
        this.fetchData(1);
        break;
      case 'isDeleted':
        this.isDeleted = event.selected;
        this.fetchData(1);
        break;
    }
  }

  /*
   * Pemuatan PERTAMA — dulu hanya terjadi karena chip `[selected]` ikut
   * memancarkan selectionChange; sejak pancaran palsu itu disaring, halaman
   * ini kosong sampai disegarkan.
   */
  ngOnInit(): void {
    this.fetchData(1);

    /*
     * Kotak pencarian sebelumnya tidak terhubung ke apa pun.
     *
     * Mengetik di sana tidak mengubah daftar sama sekali; kata kuncinya baru
     * terpakai bila kebetulan ada tindakan lain yang memanggil `fetchData`
     * — menekan muat ulang, mengganti keping, berpindah halaman. Yang
     * mencari lalu menyimpulkan drafnya tidak ada.
     */
    this.searchControl.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe(() => this.fetchData(1));

    /*
     * Rentang periode: dimuat ulang saat rentangnya LENGKAP atau kosong
     * seluruhnya. Di antara keduanya — baru tanggal awal yang dipilih —
     * daftarnya akan memuat separuh penyaring dan berkedip dua kali.
     */
    this.periodeSelesai.valueChanges
      .pipe(debounceTime(150))
      .subscribe(() => this.fetchData(1));
    this.periodeMulai.valueChanges
      .pipe(debounceTime(150))
      .subscribe(() => {
        if (!this.periodeMulai.value && !this.periodeSelesai.value)
          this.fetchData(1);
      });
  }

  fetchData(targetPage: number = 1, pageSize: number = this.pageSize) {
    this.isLoading = true;
    const searchValue = this.searchControl.value;
    this.page = targetPage;

    this.apiService
      .get('purchase-draft', {
        page: this.page,
        pageSize: pageSize,
        // if filter is empty, then filter = 0
        isPending: this.isPending,
        isApproved: false,
        isConverted: this.isConverted,
        isDeleted: this.isDeleted,
        sortBy: this.sortBy,
        sortByDirection: this.sortByDirection,
        keyword: searchValue,
        // Dikirim hanya bila terisi — parameter kosong membuat server
        // membangun penyaring yang menyaring apa pun jadi tidak ada.
        ...(this.tanggalIso(this.periodeMulai.value)
          ? { periodFrom: this.tanggalIso(this.periodeMulai.value) }
          : {}),
        ...(this.tanggalIso(this.periodeSelesai.value)
          ? { periodTo: this.tanggalIso(this.periodeSelesai.value) }
          : {}),
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

  viewPurchase(id: number) {
    this.dialog
      .open(PurchaseDraftViewComponent, {
        data: {
          id: id,
        },
      })
      .afterClosed()
      .subscribe((data) => {
        if (data === true) {
          const index = this.purchases.findIndex((x) => x.id == id);
          this.purchases[index].isDelete = true;
          this.table?.renderRows();
        } else if (data === 'ubah') {
          // Nominal/periodenya berubah di dalam dialog; barisnya di daftar
          // masih memuat angka lama. Dimuat ulang pada HALAMAN YANG SAMA,
          // bukan kembali ke halaman satu.
          this.fetchData(this.page);
        }
      });
  }

  convertPurchase(id: number) {
    this.router.navigate(['Update', id], {
      relativeTo: this.route,
    });
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

  displayedColumns: string[] = [
    'date',
    'supplier',
    'projectName',
    'purchaseOrderName',
    'total',
    'status',
    'action',
  ];

  changePage(event: any) {
    if (event.pageSize !== this.pageSize) {
      this.page = 1;
      this.pageSize = event.pageSize;
      this.fetchData(this.page, this.pageSize);
    } else {
      this.page = event.pageIndex + 1;
      this.fetchData(this.page, this.pageSize);
    }
  }

  createNewPurchaseDraft() {
    this.dialog
      .open(PurchaseDraftCreateComponent, {
        width: '640px',
        maxWidth: '94vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((created) => {
        if (created) this.fetchData(1);
      });
  }
}
