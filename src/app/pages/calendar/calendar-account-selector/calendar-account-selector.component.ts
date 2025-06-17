import { Component, EventEmitter, Output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from 'src/app/services/api.service';
import { CalendarAccountSelectorDialogComponent } from './calendar-account-selector-dialog/calendar-account-selector-dialog.component';

@Component({
  selector: 'app-calendar-account-selector',
  templateUrl: './calendar-account-selector.component.html',
  styleUrl: './calendar-account-selector.component.scss',
  standalone: false,
})
export class CalendarAccountSelectorComponent {
  constructor(
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
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
        this.snackBar.open('Error fetching bank accounts', 'Close', {
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
