import { Component } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { debounceTime } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';
import { BankUpdateComponent } from '../bank-update/bank-update.component';
import { DeleteConfirmationComponent } from 'src/app/components/delete-confirmation/delete-confirmation.component';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-bank-list',
  templateUrl: './bank-list.component.html',
  styleUrl: './bank-list.component.scss',
  standalone: false,
})
export class BankListComponent {
  constructor(
    private apiService: ApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
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
    'action',
  ];

  ngOnInit(): void {
    this.fetchBankAccounts();

    this.formControl.valueChanges.pipe(debounceTime(500)).subscribe((_) => {
      this.fetchBankAccounts(1);
    });
  }

  fetchBankAccounts(targetPage: number = 1) {
    this.isLoading = true;

    this.page = targetPage;
    this.apiService
      .get('banks', {
        page: this.page,
        keyword: this.formControl.value,
      })
      .subscribe({
        next: (res: any) => {
          this.banks = res.data;
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

  changePage(event: any) {
    const targetPage = event.pageIndex + 1;
    this.fetchBankAccounts(targetPage);
  }

  onEdit(id: number) {
    this.dialog.open(BankUpdateComponent, {
      data: {
        id: id,
      },
    });
  }

  onDelete(id: number) {
    this.dialog
      .open(DeleteConfirmationComponent, {
        data: {
          title: 'Delete Bank Account',
          prompt: 'Are you sure you want to delete this bank account?',
        },
      })
      .afterClosed()
      .subscribe({
        next: (data) => {
          this.apiService.delete('banks/' + id).subscribe({
            next: (a) => {
              // remove the deleted bank account from the list
              this.banks = this.banks.filter((bank) => bank.id !== id);
              this.count--;
              this.snackBar.open(
                'Bank account deleted successfully.',
                'Close',
                {
                  duration: 3000,
                }
              );
            },
            error: (b) => {
              console.error('Error deleting bank account:', b);
              this.snackBar.open(
                'Failed to delete bank account. Please try again later.',
                'Close',
                {
                  duration: 3000,
                }
              );
            },
          });
        },
        error: (error) => {
          console.error('Error opening delete confirmation dialog:', error);
        },
      });
  }

  onViewDetail(id: number) {}
}
