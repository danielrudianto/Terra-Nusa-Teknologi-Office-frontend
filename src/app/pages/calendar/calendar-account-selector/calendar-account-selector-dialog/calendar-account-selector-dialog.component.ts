import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { MatCheckboxModule } from '@angular/material/checkbox';

@Component({
  selector: 'app-calendar-account-selector-dialog',
  imports: [
    MatDialogModule,
    MatListModule,
    MatButtonModule,
    CommonModule,
    MatIconModule,
    TranslatePipe,
    MatCheckboxModule,
  ],
  templateUrl: './calendar-account-selector-dialog.component.html',
  styleUrl: './calendar-account-selector-dialog.component.scss',
})
export class CalendarAccountSelectorDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { bankAccounts: any[] },
    private dialog: MatDialogRef<CalendarAccountSelectorDialogComponent>,
  ) {}

  // bankAccounts: any[] = this.data.bankAccounts;
  // create a variable to hold the copy of bankAccounts
  bankAccounts: any[] = this.data.bankAccounts.slice();

  onSelectionChanged(accountID: number, event: any): void {
    const account = this.bankAccounts.find((acc) => acc.id === accountID);
    if (account) {
      account.selected = event;
    }
  }

  onDialogClosed(): void {
    this.dialog.close(this.bankAccounts);
  }

  onClose() {
    this.dialog.close();
  }
}
