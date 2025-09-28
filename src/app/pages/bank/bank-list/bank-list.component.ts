import { Component } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { debounceTime } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';
import { BankUpdateComponent } from '../bank-update/bank-update.component';
import { DeleteConfirmationComponent } from 'src/app/components/delete-confirmation/delete-confirmation.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';

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
    private snackBar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute
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
    'balance',
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
          if (data === true) {
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
          }
        },
        error: (error) => {
          console.error('Error opening delete confirmation dialog:', error);
        },
      });
  }

  onOpenMutation(id: number) {
    this.router.navigate(['Mutation', id], {
      relativeTo: this.route,
    });
  }
}
