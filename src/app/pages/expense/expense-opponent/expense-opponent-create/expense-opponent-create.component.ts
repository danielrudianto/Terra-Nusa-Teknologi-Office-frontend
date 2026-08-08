import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from 'src/app/services/api.service';
import { banks, IBank } from 'src/app/utils/bank';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-expense-opponent-create',
  templateUrl: './expense-opponent-create.component.html',
  styleUrl: './expense-opponent-create.component.scss',
  standalone: true,
  imports: [
    TranslatePipe,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule,
  ],
})
export class ExpenseOpponentCreateComponent {
  constructor(
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<ExpenseOpponentCreateComponent>,
    private translate: TranslateService,
  ) {}

  isSubmitting: boolean = false;

  formGroup: FormGroup = new FormGroup({
    name: new FormControl('', Validators.required),
    description: new FormControl('', Validators.required),
    type: new FormControl('', Validators.required),
    paymentNumber: new FormControl('', Validators.required),
    npwp: new FormControl(''),
  });

  onSubmit(): void {
    this.isSubmitting = true;
    this.apiService
      .post('expense-opponents', {
        ...this.formGroup.value,
        npwp:
          this.formGroup.value.npwp == '' ? null : this.formGroup.value.npwp,
      })
      .subscribe({
        next: (data) => {
          this.snackBar.open(
            this.translate.instant('opponentForm.saved'),
            this.translate.instant('opponentForm.close'),
            { duration: 3000 },
          );
          this.dialogRef.close(true);
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
