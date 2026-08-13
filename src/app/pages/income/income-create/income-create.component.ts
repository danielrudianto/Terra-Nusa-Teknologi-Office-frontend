import { CommonModule } from '@angular/common';
import { ServerMessageService } from 'src/app/services/server-message.service';
import { TranslateService } from '@ngx-translate/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Component, inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import moment from 'moment';
import { ExpenseOpponentSelectorComponent } from '../../../components/expense-opponent-selector/expense-opponent-selector.component';
import { ApiService } from '../../../services/api.service';
import { BankAccountSelectorComponent } from '../../../components/bank-account-selector/bank-account-selector.component';

@Component({
  selector: 'app-income-create',
  standalone: true,
  providers: [provideNgxMask(), provideNativeDateAdapter()],
  imports: [
    BankAccountSelectorComponent,
    TranslatePipe,
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule,
    MatDatepickerModule,
    NgxMaskDirective,
  ],
  templateUrl: './income-create.component.html',
  styleUrl: './income-create.component.scss',
})
export class IncomeCreateComponent {
  private readonly serverMessage = inject(ServerMessageService);
  private readonly translate = inject(TranslateService);
  constructor(
    private dialog: MatDialog,
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<IncomeCreateComponent>,
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

  onCancel() {
    this.dialogRef.close();
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
        this.snackBar.open(
      this.translate.instant('notify.loadFailed'), 'Close', {
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
          'YYYY-MM-DD',
        ),
        amount: this.formGroup.value.amount,
        incomeType: this.formGroup.value.incomeType,
        description: this.formGroup.value.description,
        opponentID: this.formGroup.value.opponentID,
        bankAccountID: this.formGroup.value.bankAccountID,
      })
      .subscribe({
        next: (_) => {
          this.snackBar.open(
      this.translate.instant('notify.createSuccess'), 'Close', {
            duration: 3000,
          });
          this.formGroup.reset();
          // close and signal the list to refresh
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.snackBar.open(
          this.serverMessage.terjemahkan(error), 'Close', {
            duration: 3000,
          });
        },
      })
      .add(() => {
        this.isSubmitting = false;
      });
  }
}
