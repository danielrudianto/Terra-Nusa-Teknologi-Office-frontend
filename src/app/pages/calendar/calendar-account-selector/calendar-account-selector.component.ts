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
        this.bankAccounts = data.map((account: any) => {
          return {
            ...account,
            selected: true,
          };
        });
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
