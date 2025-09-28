import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import moment from 'moment';
import { ApiService } from 'src/app/services/api.service';
import { banks, IBank } from 'src/app/utils/bank';

@Component({
  selector: 'app-loans-create',
  standalone: false,
  templateUrl: './loans-create.component.html',
  styleUrl: './loans-create.component.scss',
})
export class LoansCreateComponent {
  constructor(private apiService: ApiService, private snackBar: MatSnackBar) {}

  @ViewChild('input') input!: ElementRef<HTMLInputElement>;
  filteredOptions: IBank[] = [];
  options: IBank[] = banks;
  isSubmitting: boolean = false;

  formGroup: FormGroup = new FormGroup({
    creditorName: new FormControl('', Validators.required),
    creditorAddress: new FormControl('', Validators.required),
    creditorNPWP: new FormControl(''),
    description: new FormControl('', Validators.required),
    date: new FormControl('', Validators.required),
    debt: new FormControl(0, [Validators.required, Validators.min(1)]),
    received: new FormControl(0, [Validators.required, Validators.min(0)]),
    bankAccountName: new FormControl('', Validators.required),
    bankAccountNumber: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[0-9]*$/),
    ]),
    bankName: new FormControl('', Validators.required),
  });

  onSubmit() {
    this.isSubmitting = true;
    this.apiService
      .post(`loans`, {
        date: moment(this.formGroup.value.date).format('YYYY-MM-DD'),
        creditorName: this.formGroup.value.creditorName,
        creditorAddress: this.formGroup.value.creditorAddress,
        creditorNPWP: this.formGroup.value.creditorNPWP,
        description: this.formGroup.value.description,
        debt: this.formGroup.value.debt,
        received: this.formGroup.value.received,
        bankAccountName: this.formGroup.value.bankAccountName,
        bankAccountNumber: this.formGroup.value.bankAccountNumber,
        bankName: this.formGroup.value.bankName,
      })
      .subscribe({
        next: (_) => {
          this.formGroup.reset();
          this.snackBar.open('Loan successfully created', 'Close', {
            duration: 3000,
          });
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

  filter(): void {
    const filterValue = this.input.nativeElement.value.toLowerCase();
    this.filteredOptions = this.options.filter(
      (option) =>
        option.name.toLowerCase().includes(filterValue) ||
        option.alias.toLowerCase().includes(filterValue)
    );
  }
}
