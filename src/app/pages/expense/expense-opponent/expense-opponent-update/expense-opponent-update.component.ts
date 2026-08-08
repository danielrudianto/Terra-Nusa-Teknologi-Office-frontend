import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-expense-opponent-update',
  templateUrl: './expense-opponent-update.component.html',
  styleUrl: './expense-opponent-update.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule,
    TranslatePipe,
  ],
})
export class ExpenseOpponentUpdateComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { id: number },
    private dialog: MatDialogRef<ExpenseOpponentUpdateComponent>,
    private apiService: ApiService,
    private snackBar: MatSnackBar,
  ) {}

  isSubmitting: boolean = false;
  isLoading: boolean = false;

  formGroup: FormGroup = new FormGroup({
    name: new FormControl('', Validators.required),
    description: new FormControl('', Validators.required),
    type: new FormControl('', Validators.required),
    paymentNumber: new FormControl('', Validators.required),
    npwp: new FormControl(''),
  });

  ngOnInit(): void {
    this.fetchOpponent();
  }

  fetchOpponent(): void {
    this.isLoading = true;
    this.apiService
      .get(`expense-opponents/${this.data.id}`, {})
      .subscribe({
        next: (opponent: any) => {
          this.formGroup.patchValue({
            name: opponent.name,
            description: opponent.description,
            type: opponent.type,
            paymentNumber: opponent.paymentNumber,
            npwp: opponent.npwp ?? '',
          });
        },
        error: (error) => {
          this.snackBar.open(
            error?.error?.detail || 'Failed to load data',
            'Close',
            { duration: 3000 },
          );
        },
      })
      .add(() => {
        this.isLoading = false;
      });
  }

  onSubmit(): void {
    if (!this.formGroup.valid) return;
    this.isSubmitting = true;
    this.apiService
      .put(`expense-opponents/${this.data.id}`, {
        ...this.formGroup.value,
        npwp:
          this.formGroup.value.npwp == '' ? null : this.formGroup.value.npwp,
      })
      .subscribe({
        next: () => {
          this.snackBar.open('Data successfully saved', 'Close', {
            duration: 3000,
          });
          this.dialog.close(true);
        },
        error: (error) => {
          this.snackBar.open(
            error?.error?.detail || 'Failed to save',
            'Close',
            { duration: 3000 },
          );
        },
      })
      .add(() => {
        this.isSubmitting = false;
      });
  }
}
