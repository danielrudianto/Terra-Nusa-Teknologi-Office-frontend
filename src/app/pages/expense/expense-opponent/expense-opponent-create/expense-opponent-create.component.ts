import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from 'src/app/services/api.service';
import { banks, IBank } from 'src/app/utils/bank';

@Component({
  selector: 'app-expense-opponent-create',
  templateUrl: './expense-opponent-create.component.html',
  styleUrl: './expense-opponent-create.component.scss',
  standalone: false,
})
export class ExpenseOpponentCreateComponent {
  constructor(private apiService: ApiService, private snackBar: MatSnackBar) {}

  isSubmitting: boolean = false;

  formGroup: FormGroup = new FormGroup({
    name: new FormControl('', Validators.required),
    description: new FormControl('', Validators.required),
    type: new FormControl('', Validators.required),
    paymentNumber: new FormControl('', Validators.required),
  });

  onSubmit(): void {
    this.isSubmitting = true;
    this.apiService
      .post('expense-opponents', this.formGroup.value)
      .subscribe({
        next: (data) => {
          this.snackBar.open('Data successfully saved', 'Close', {
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
