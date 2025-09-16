import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ExpenseOpponentSelectorComponent } from '../../../components/expense-opponent-selector/expense-opponent-selector.component';
import { ApiService } from '../../../services/api.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import moment from 'moment';

@Component({
  selector: 'app-income-create',
  standalone: false,
  templateUrl: './income-create.component.html',
  styleUrl: './income-create.component.scss',
})
export class IncomeCreateComponent {
  constructor(
    private dialog: MatDialog,
    private apiService: ApiService,
    private snackBar: MatSnackBar
  ) {}

  bankAccounts: any[] = [];
  isSubmitting: boolean = false;

  formGroup: FormGroup = new FormGroup({
    date: new FormControl('', Validators.required),
    paymentDate: new FormControl('', Validators.required),
    incomeType: new FormControl('', Validators.required),
    bankAccountID: new FormControl('', Validators.required),
    opponentID: new FormControl('', Validators.required),
    opponentName: new FormControl('', Validators.required),
    opponentDescription: new FormControl('', Validators.required),
    amount: new FormControl(0, [Validators.required, Validators.min(0.01)]),
    description: new FormControl('', Validators.required),
  });

  ngOnInit(): void {
    this.fetchBankData();
  }

  openOpponentSelector() {
    this.dialog
      .open(ExpenseOpponentSelectorComponent, {
        minWidth: '400px',
      })
      .afterClosed()
      .subscribe((data) => {
        if (data) {
          this.formGroup.patchValue({
            opponentID: data.id,
            opponentName: data.name,
            opponentDescription: data.description,
          });
        }
      });
  }

  fetchBankData() {
    this.apiService.get('banks/all', {}).subscribe({
      next: (data: any) => {
        this.bankAccounts = data;
      },
      error: (error) => {
        this.snackBar.open('Error fetching bank accounts', 'Close', {
          duration: 3000,
        });
      },
    });
  }

  onSubmit() {
    this.isSubmitting = true;
    this.apiService
      .post(`income`, {
        date: moment(this.formGroup.value.date).format('YYYY-MM-DD'),
        paymentDate: moment(this.formGroup.value.paymentDate).format(
          'YYYY-MM-DD'
        ),
        amount: this.formGroup.value.amount,
        incomeType: this.formGroup.value.incomeType,
        description: this.formGroup.value.description,
        opponentID: this.formGroup.value.opponentID,
        bankAccountID: this.formGroup.value.bankAccountID,
      })
      .subscribe({
        next: (_) => {
          this.snackBar.open('Income successfully created', 'Close', {
            duration: 3000,
          });

          this.formGroup.reset();
        },
        error: (error) => {
          this.snackBar.open(error.error.detail, 'Close', {
            duration: 3000,
          });
        },
      })
      .add(() => {
        this.isSubmitting = false;
      });
  }
}
