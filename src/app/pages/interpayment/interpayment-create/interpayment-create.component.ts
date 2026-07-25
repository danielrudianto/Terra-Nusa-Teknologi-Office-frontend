import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import moment from 'moment';
import { ApiService } from 'src/app/services/api.service';

// create a validator function, which states that bankAccountIDOrigin and bankAccountIDDestination cannot be the same
// ValidatorFn
function validateBankAccount(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const form = control as FormGroup;
    const bankAccountIDOrigin = form.get('bankAccountIDOrigin')?.value;
    const bankAccountIDDestination = form.get(
      'bankAccountIDDestination',
    )?.value;

    if (
      bankAccountIDOrigin &&
      bankAccountIDDestination &&
      bankAccountIDOrigin === bankAccountIDDestination
    ) {
      return { sameBankAccount: true };
    }

    return null;
  };
}

@Component({
  selector: 'app-interpayment-create',
  standalone: true,
  providers: [provideNgxMask()],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    NgxMaskDirective,
  ],
  templateUrl: './interpayment-create.component.html',
  styleUrl: './interpayment-create.component.scss',
})
export class InterpaymentCreateComponent {
  constructor(
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialogRef<InterpaymentCreateComponent>,
  ) {}

  bankAccounts: any[] = [];
  isSubmitting: boolean = false;

  formGroup: FormGroup = new FormGroup(
    {
      date: new FormControl('', Validators.required),
      bankAccountIDOrigin: new FormControl('', Validators.required),
      bankAccountIDDestination: new FormControl('', Validators.required),
      amount: new FormControl(null, [Validators.required, Validators.min(1)]),
      description: new FormControl(
        'Setoran kas operasional',
        Validators.required,
      ),
    },
    {
      validators: [validateBankAccount()],
    },
  );

  ngOnInit(): void {
    this.fetchBankData();
  }

  fetchBankData() {
    this.apiService.get('banks/all', {}).subscribe({
      next: (data: any) => {
        this.bankAccounts = data;
      },
      error: (error) => {
        console.error('Error fetching bank accounts:', error);
        this.snackBar.open('Error fetching bank accounts', 'Close', {
          duration: 3000,
        });
      },
    });
  }

  /** Bank picked as origin — used to grey it out in the destination list. */
  get originID() {
    return this.formGroup.get('bankAccountIDOrigin')?.value;
  }
  get destinationID() {
    return this.formGroup.get('bankAccountIDDestination')?.value;
  }

  onCancel() {
    this.dialog.close();
  }

  onSubmit() {
    this.isSubmitting = true;
    this.apiService
      .post('interpayments', {
        bankAccountIDOrigin: this.formGroup.value.bankAccountIDOrigin,
        bankAccountIDDestination: this.formGroup.value.bankAccountIDDestination,
        amount: this.formGroup.value.amount,
        date: moment(this.formGroup.value.date).format('YYYY-MM-DD'),
        description: this.formGroup.value.description,
      })
      .subscribe({
        next: (data) => {
          this.snackBar.open('Interpayment created successfully', 'Close', {
            duration: 3000,
          });
          // close and signal the list to refresh
          this.dialog.close(true);
        },
        error: (error) => {
          console.error('Error creating interpayment:', error);
          this.snackBar.open('Error on creating interpayment', 'Close', {
            duration: 3000,
          });
        },
      })
      .add(() => {
        this.isSubmitting = false;
      });
  }
}
