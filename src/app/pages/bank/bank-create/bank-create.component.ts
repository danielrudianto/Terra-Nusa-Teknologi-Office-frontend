import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from 'src/app/services/api.service';
import { banks, IBank } from 'src/app/utils/bank';

@Component({
  selector: 'app-bank-create',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatDialogModule,
    MatSnackBarModule,
    MatButtonModule,
  ],
  templateUrl: './bank-create.component.html',
  styleUrl: './bank-create.component.scss',
  standalone: true,
})
export class BankCreateComponent {
  constructor(
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialogRef<BankCreateComponent>,
  ) {}

  @ViewChild('input') input!: ElementRef<HTMLInputElement>;
  isSubmitting: boolean = false;
  filteredOptions: IBank[] = [];
  options: IBank[] = banks;

  bankFormGroup: FormGroup = new FormGroup({
    bankAccountName: new FormControl('', Validators.required),
    bankAccountNumber: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[0-9]*$/),
    ]),
    bankName: new FormControl('', Validators.required),
  });

  filter(): void {
    const filterValue = this.input.nativeElement.value.toLowerCase();
    this.filteredOptions = this.options.filter(
      (option) =>
        option.name.toLowerCase().includes(filterValue) ||
        option.alias.toLowerCase().includes(filterValue),
    );
  }

  onCancel() {
    this.dialog.close();
  }

  onSubmit() {
    this.isSubmitting = true;
    this.apiService
      .post('banks', this.bankFormGroup.value)
      .subscribe({
        next: (_) => {
          this.snackBar.open('Bank account created successfully', 'Close', {
            duration: 3000,
          });
          // close and signal the list to refresh
          this.dialog.close(true);
        },
        error: (err) => {
          this.snackBar.open(err.error.detail, 'Close', {
            duration: 3000,
          });
        },
      })
      .add(() => {
        this.isSubmitting = false;
      });
  }
}
