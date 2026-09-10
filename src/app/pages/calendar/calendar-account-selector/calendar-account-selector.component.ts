import { Component, EventEmitter, Output, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from 'src/app/services/api.service';
import { CalendarAccountSelectorDialogComponent } from './calendar-account-selector-dialog/calendar-account-selector-dialog.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-calendar-account-selector',
  imports: [MatButtonModule, MatIconModule, TranslatePipe],
  templateUrl: './calendar-account-selector.component.html',
  styleUrl: './calendar-account-selector.component.scss',
  standalone: true,
})
export class CalendarAccountSelectorComponent {
  private readonly translate = inject(TranslateService);
  constructor(
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
  ) {}

  bankAccounts: any[] = [];
  @Output('onBankAccountChanges') bankAccountChanges: EventEmitter<any[]> =
    new EventEmitter<any[]>();

  ngOnInit(): void {
    this.fetchBankAccounts();
  }

  fetchBankAccounts(): void {
    this.apiService.get('banks/all', {}).subscribe({
      next: (data: any) => {
        /*
         * Rekening yang DIKECUALIKAN tidak tercentang di awal.
         *
         * Sebagian rekening bukan kas operasional — deposito, escrow,
         * rekening penampung uang muka. Uangnya ada, tetapi tidak dapat
         * dipakai membayar apa pun bulan ini, sehingga memasukkannya ke
         * saldo gabungan membuat perencanaan kas terbaca lebih longgar
         * daripada keadaan sebenarnya.
         *
         * Yang disetel di sini hanya nilai AWALNYA. Rekeningnya tetap
         * tampil di pemilih dan tetap dapat dicentang sendiri — kadang
         * memang ingin dilihat.
         */
        this.bankAccounts = data.map((account: any) => {
          return {
            ...account,
            selected: !account.excludeFromCalendar,
          };
        });

        /*
         * Pilihan awal DIPANCARKAN, tidak menunggu dialog dibuka.
         *
         * Sebelumnya pemancarnya hanya berjalan saat dialog ditutup,
         * sehingga kalender memulai dengan daftar kosong dan server
         * memperlakukannya sebagai "seluruh rekening". Selama semua
         * rekening memang ikut, itu kebetulan benar; begitu ada yang
         * dikecualikan, kalender akan tetap menghitungnya sampai seseorang
         * membuka pemilihnya.
         */
        this.bankAccountChanges.emit(this.bankAccounts);
      },
      error: (error) => {
        this.snackBar.open(
      this.translate.instant('notify.loadFailed'), 'Close', {
          duration: 3000,
        });
      },
    });
  }

  onOpenBankAccountSelector(): void {
    const bankAccountsDeepCopy = JSON.parse(JSON.stringify(this.bankAccounts));
    this.dialog
      .open(CalendarAccountSelectorDialogComponent, {
        data: {
          bankAccounts: bankAccountsDeepCopy,
        },
      })
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          this.bankAccounts = result.map((account: any) => {
            return {
              ...account,
              selected: account.selected ?? true, // Ensure selected is set
            };
          });

          this.bankAccountChanges.emit(this.bankAccounts);
        }
      });
  }

  get selectedBankAccounts(): number {
    return this.bankAccounts.filter((account) => account.selected).length;
  }
}
