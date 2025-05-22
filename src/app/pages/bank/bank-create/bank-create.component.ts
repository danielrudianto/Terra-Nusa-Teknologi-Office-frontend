import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from 'src/app/services/api.service';
import { banks, IBank } from 'src/app/utils/bank';

@Component({
  selector: 'app-bank-create',
  templateUrl: './bank-create.component.html',
  styleUrl: './bank-create.component.scss',
  standalone: false,
})
export class BankCreateComponent {
  constructor(private apiService: ApiService, private snackBar: MatSnackBar) {}

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
        option.alias.toLowerCase().includes(filterValue)
    );
  }

  onSubmit() {
    this.isSubmitting = true;
    this.apiService
      .post('banks', this.bankFormGroup.value)
      .subscribe({
        next: (_) => {
          this.bankFormGroup.reset();
          this.input.nativeElement.value = '';
          this.filteredOptions = this.options.slice();

          this.snackBar.open('Bank account created successfully', 'Close', {
            duration: 2000,
          });
        },
        error: (err) => {
          this.snackBar.open('Error creating bank account', 'Close', {
            duration: 2000,
          });
        },
      })
      .add(() => {
        this.isSubmitting = false;
      });
  }
}
