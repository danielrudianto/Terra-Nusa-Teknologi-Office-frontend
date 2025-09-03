import { Component } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import moment from 'moment';
import { ApiService } from 'src/app/services/api.service';

// create a validator function, which states that bankAccountIDOrigin and bankAccountIDDestination cannot be the same
// ValidatorFn
function validateBankAccount(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const form = control as FormGroup;
    const bankAccountIDOrigin = form.get('bankAccountIDOrigin')?.value;
    const bankAccountIDDestination = form.get(
      'bankAccountIDDestination'
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
  standalone: false,
  templateUrl: './interpayment-create.component.html',
  styleUrl: './interpayment-create.component.scss',
})
export class InterpaymentCreateComponent {
  constructor(private apiService: ApiService, private snackBar: MatSnackBar) {}

  bankAccounts: any[] = [];
  isSubmitting: boolean = false;

  formGroup: FormGroup = new FormGroup(
    {
      date: new FormControl('', Validators.required),
      bankAccountIDOrigin: new FormControl('', Validators.required),
      bankAccountIDDestination: new FormControl('', Validators.required),
      amount: new FormControl(0, [Validators.required, Validators.min(1)]),
    },
    {
      validators: [validateBankAccount()],
    }
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

  onSubmit() {
    this.apiService
      .post('interpayments', {
        bankAccountIDOrigin: this.formGroup.value.bankAccountIDOrigin,
        bankAccountIDDestination: this.formGroup.value.bankAccountIDDestination,
        amount: this.formGroup.value.amount,
        date: moment(this.formGroup.value.date).format('YYYY-MM-DD'),
      })
      .subscribe({
        next: (data) => {
          this.snackBar.open('Interpayment created successfully', 'Close', {
            duration: 3000,
          });
          this.formGroup.reset();
        },
        error: (error) => {
          console.error('Error creating interpayment:', error);
          this.snackBar.open('Error on creating interpayment', 'Close', {
            duration: 3000,
          });
        },
      });
  }
}
