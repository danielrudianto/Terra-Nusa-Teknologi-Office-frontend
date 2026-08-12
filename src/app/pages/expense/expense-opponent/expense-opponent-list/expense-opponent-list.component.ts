import { Component } from '@angular/core';
import { CanDirective } from '../../../../directives/can.directive';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ExpenseOpponentViewComponent } from '../expense-opponent-view/expense-opponent-view.component';
import { ExpenseOpponentUpdateComponent } from '../expense-opponent-update/expense-opponent-update.component';
import { ExpenseOpponentCreateComponent } from '../expense-opponent-create/expense-opponent-create.component';
import { DeleteConfirmationComponent } from 'src/app/components/delete-confirmation/delete-confirmation.component';
import { TranslateService } from '@ngx-translate/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { debounceTime } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';
import { RouterModule, Router } from '@angular/router';
import { HeaderTitleComponent } from 'src/app/components/header-title/header-title.component';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-expense-opponent-list',
  templateUrl: './expense-opponent-list.component.html',
  styleUrl: './expense-opponent-list.component.scss',
  standalone: true,
  imports: [
    CanDirective,
    TranslatePipe,
    RouterModule,
    HeaderTitleComponent,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
  ],
})
export class ExpenseOpponentListComponent {
  constructor(
    private apiService: ApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router,
    private translate: TranslateService,
  ) {}

  isLoading: boolean = false;

  formControl: FormControl = new FormControl('');

  suppliers: any[] = [];
  page: number = 1;
  pageSize: number = 10;
  count: number = 0;
  displayedColumns: string[] = [
    'name',
    'description',
    'type',
    'npwp',
    'paymentNumber',
    'action',
  ];
  sortBy: string = 'name';
  sortByDirection: string = 'asc';

  ngOnInit(): void {
    this.fetchOpponents();

    this.formControl.valueChanges.pipe(debounceTime(500)).subscribe((_) => {
      this.fetchOpponents(1);
    });
  }

  fetchOpponents(targetPage: number = 1) {
    this.isLoading = true;

    this.page = targetPage;
    this.apiService
      .get('expense-opponents', {
        page: this.page,
        pageSize: this.pageSize,
        keyword: this.formControl.value,
        sortBy: this.sortBy,
        sortByDirection: this.sortByDirection,
      })
      .subscribe({
        next: (res: any) => {
          this.suppliers = res.data;
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
    if (event.pageSize == this.pageSize) {
      const targetPage = event.pageIndex + 1;
      this.fetchOpponents(targetPage);
    } else {
      this.pageSize = event.pageSize;
      this.fetchOpponents(1);
    }
  }

  onEdit(id: number) {
    this.dialog
      .open(ExpenseOpponentUpdateComponent, {
        data: { id },
        width: '640px',
        maxWidth: '94vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((updated) => {
        if (updated) this.fetchOpponents(this.page);
      });
  }

  createOpponent() {
    this.dialog
      .open(ExpenseOpponentCreateComponent, {})
      .afterClosed()
      .subscribe((result) => {
        if (result) this.fetchOpponents(this.page);
      });
  }

  onViewOpponent(opponent: any) {
    this.dialog
      .open(ExpenseOpponentViewComponent, {
        data: { opponent },
        width: '560px',
        maxWidth: '94vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((result) => {
        if (result?.action === 'edit') {
          this.onEdit(result.opponent.id);
        }
      });
  }

  onDeleteOpponent(opponent: any) {
    this.dialog
      .open(DeleteConfirmationComponent, {
        data: {
          title: this.translate.instant('expenseOpponent.deleteTitle'),
          prompt: this.translate.instant('expenseOpponent.deletePrompt'),
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.apiService.delete('expense-opponents/' + opponent.id).subscribe({
          next: () => {
            this.snackBar.open(
              this.translate.instant('expenseOpponent.deleted'),
              'Close',
              { duration: 2000 },
            );
            this.fetchOpponents(this.page);
          },
          error: (err) =>
            this.snackBar.open(
              err?.error?.detail ||
                this.translate.instant('expenseOpponent.deleteFailed'),
              'Close',
              { duration: 3000 },
            ),
        });
      });
  }

  copyPaymentNumber(paymentNumber: string) {
    navigator.clipboard
      .writeText(paymentNumber)
      .then(() => {
        this.snackBar.open(
      this.translate.instant('notify.copied'), 'Close', {
          duration: 3000,
        });
      })
      .catch((err) => {
        console.error('Failed to copy payment number: ', err);
        this.snackBar.open(
      this.translate.instant('notify.createFailed'), 'Close', {
          duration: 3000,
        });
      });
  }
}
