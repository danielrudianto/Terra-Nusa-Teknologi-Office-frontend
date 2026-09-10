import { Component } from '@angular/core';
import { CanDirective } from '../../../directives/can.directive';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { debounceTime } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';
import { BankUpdateComponent } from '../bank-update/bank-update.component';
import { DeleteConfirmationComponent } from 'src/app/components/delete-confirmation/delete-confirmation.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { CommonModule } from '@angular/common';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { HeaderTitleComponent } from '../../../components/header-title/header-title.component';
import { TranslatePipe } from '@ngx-translate/core';
import { BankCreateComponent } from '../bank-create/bank-create.component';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { TranslateService } from '@ngx-translate/core';
import { RefreshButtonComponent } from '../../../components/refresh-button/refresh-button.component';

@Component({
  selector: 'app-bank-list',
  imports: [
    CanDirective,
    TranslatePipe,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatTableModule,
    CommonModule,
    MatPaginatorModule,
    MatButtonModule,
    HeaderTitleComponent,
    MatMenuModule,
    RefreshButtonComponent,
    MatTooltipModule,
    MatChipsModule,
  ],
  templateUrl: './bank-list.component.html',
  styleUrl: './bank-list.component.scss',
  standalone: true,
})
export class BankListComponent {
  constructor(
    private translate: TranslateService,
    private apiService: ApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  isLoading: boolean = false;

  formControl: FormControl = new FormControl('');

  banks: any[] = [];
  page: number = 1;
  count: number = 0;
  displayedColumns: string[] = [
    'bankName',
    'bankAccountNumber',
    'bankAccountName',
    'excludeFromCalendar',
    'balance',
    'action',
  ];

  /**
   * Keadaan rekening yang sedang ditampilkan.
   *
   * "aktif" sejak awal: rekening yang dihapus adalah catatan, bukan rekening
   * yang sedang dipakai — dan penghitung halaman memang sudah tidak
   * menghitungnya, sehingga menampilkannya membuat jumlah di bawah tabel
   * tidak pernah cocok dengan isinya.
   */
  keadaan: 'aktif' | 'dihapus' | 'semua' = 'aktif';

  /**
   * Berganti keadaan berarti KEMBALI KE HALAMAN PERTAMA.
   *
   * Jumlah barisnya berubah seluruhnya; tetap di halaman lima setelah
   * penyaringnya berganti kerap mendarat di halaman kosong, dan yang
   * membacanya menyimpulkan tidak ada datanya.
   */
  gantiKeadaan(nilai: 'aktif' | 'dihapus' | 'semua') {
    // `mat-chip-listbox` mengirim `undefined` saat pilihan yang sedang aktif
    // ditekan lagi. Tanpa penjagaan ini penyaringnya jadi kosong dan server
    // mengembalikan bawaan yang tidak lagi cocok dengan pil yang tampak.
    if (!nilai || nilai === this.keadaan) return;
    this.keadaan = nilai;
    this.fetchBankAccounts(1);
  }

  ngOnInit(): void {
    this.fetchBankAccounts();

    this.formControl.valueChanges.pipe(debounceTime(500)).subscribe((_) => {
      this.fetchBankAccounts(1);
    });
  }

  /** Kolom & arah pengurutan; dikirim ke server agar mencakup seluruh data. */
  sortBy: string = 'bankName';
  sortByDirection: 'asc' | 'desc' = 'asc';

  /** Mengklik kolom yang sama membalik arahnya. */
  changeSortBy(sortBy: string) {
    if (this.sortBy === sortBy) {
      this.sortByDirection = this.sortByDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = sortBy;
      this.sortByDirection = 'asc';
    }

    this.fetchBankAccounts();
  }

  fetchBankAccounts(targetPage: number = 1) {
    this.isLoading = true;

    this.page = targetPage;
    this.apiService
      .get('banks', {
        sortBy: this.sortBy,
        sortByDirection: this.sortByDirection,
        page: this.page,
        keyword: this.formControl.value,
        keadaan: this.keadaan,
      })
      .subscribe({
        next: (res: any) => {
          this.banks = res.data;
          this.count = res.count;

          const balances = res.balances;
          balances.forEach((x: any) => {
            const id = x.id;
            const balance = x.balance;

            const index = this.banks.findIndex((y) => y.id == id);
            if (index != -1) {
              this.banks[index].balance = balance;
            }
          });
        },
        error: (err) => {
          console.error(err);
        },
      })
      .add(() => {
        this.isLoading = false;
      });
  }

  changePage(event: any) {
    const targetPage = event.pageIndex + 1;
    this.fetchBankAccounts(targetPage);
  }

  /** Brand-associated colour for a bank (used for the avatar).
   *  Uses each bank's recognisable brand colour + initials — not their
   *  trademarked logo. Falls back to the app brand blue. */
  bankTheme(name: string): string {
    const n = (name || '').toLowerCase();
    const map: [string, string][] = [
      ['bca', '#005ca9'],
      ['central asia', '#005ca9'],
      ['mandiri', '#063b7c'],
      ['bri', '#00529c'],
      ['rakyat indonesia', '#00529c'],
      ['bni', '#e06000'],
      ['negara indonesia', '#e06000'],
      ['danamon', '#0067b1'],
      ['permata', '#00795c'],
      ['mega', '#c98a00'],
      ['ocbc', '#d0021b'],
      ['cimb', '#862633'],
      ['niaga', '#862633'],
      ['syariah indonesia', '#00857a'],
      ['bsi', '#00857a'],
      ['tabungan negara', '#c25e12'],
      ['btn', '#c25e12'],
      ['maybank', '#b8860b'],
      ['panin', '#d51317'],
      ['jago', '#ff6b00'],
      ['seabank', '#1a56db'],
    ];
    for (const [k, c] of map) {
      if (n.includes(k)) return c;
    }
    return '#154dec';
  }

  onEdit(id: number) {
    this.dialog
      .open(BankUpdateComponent, {
        data: {
          id: id,
        },
      })
      .afterClosed()
      .subscribe(() => {
        this.fetchBankAccounts(this.page);
      });
  }

  onDelete(id: number) {
    this.dialog
      .open(DeleteConfirmationComponent, {
        data: {
          title: this.translate.instant('confirm.deleteTitle'),
          prompt: this.translate.instant('confirm.deletePrompt'),
        },
      })
      .afterClosed()
      .subscribe({
        next: (data) => {
          if (data === true) {
            this.apiService.delete('banks/' + id).subscribe({
              next: (a) => {
                // Dimuat ulang dari server, bukan dicoret dari daftar lokal.
                //
                // Penyaring keadaan menentukan apakah rekening yang baru
                // dihapus seharusnya tetap tampak (pada "dihapus" dan
                // "semua") atau hilang (pada "aktif"). Menghapusnya dari
                // array secara lokal selalu keliru pada dua dari tiga
                // keadaan itu, dan membuat hitungan halamannya meleset.
                this.fetchBankAccounts(this.page);
                this.snackBar.open(
      this.translate.instant('notify.deleteSuccess'),
                  'Close',
                  {
                    duration: 3000,
                  },
                );
              },
              error: (b) => {
                console.error('Error deleting bank account:', b);
                /*
                 * Kode tetap dari server dipetakan ke kalimat, bukan
                 * ditampilkan apa adanya. "BANK_HAS_BALANCE" tidak memberi
                 * tahu apa yang harus dilakukan berikutnya; kalimatnya
                 * menyebutkan bahwa saldonya harus dipindahkan dulu.
                 */
                const kode = b?.error?.detail;
                const pesan =
                  kode === 'BANK_HAS_BALANCE'
                    ? this.translate.instant('bank.deleteHasBalance')
                    : kode === 'BANK_BALANCE_UNKNOWN'
                      ? this.translate.instant('bank.deleteBalanceUnknown')
                      : this.translate.instant('notify.deleteFailed');
                this.snackBar.open(pesan, 'Close', {
                  duration: 6000,
                });
              },
            });
          }
        },
        error: (error) => {
          console.error('Error opening delete confirmation dialog:', error);
        },
      });
  }

  onOpenMutation(id: number) {
    // Absolut agar konsisten baik dibuka dari /Bank maupun /Master/Bank
    this.router.navigate(['/Bank', 'Mutation', id]);
  }

  createNewBank() {
    this.dialog
      .open(BankCreateComponent, {})
      .afterClosed()
      .subscribe((created) => {
        if (created) this.fetchBankAccounts(1);
      });
  }
}
