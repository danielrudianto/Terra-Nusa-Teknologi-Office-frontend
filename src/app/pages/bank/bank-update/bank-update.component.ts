import { Component, ElementRef, Inject, ViewChild } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from 'src/app/services/api.service';
import { banks, IBank } from 'src/app/utils/bank';

@Component({
  selector: 'app-bank-update',
  templateUrl: './bank-update.component.html',
  styleUrl: './bank-update.component.scss',
  standalone: false,
})
export class BankUpdateComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialogRef<BankUpdateComponent>
  ) {}

  @ViewChild('input') input!: ElementRef<HTMLInputElement>;
  isLoading: boolean = true;
  isSubmitting: boolean = false;
  filteredOptions: IBank[] = [];
  options: IBank[] = banks;

  formGroup: FormGroup = new FormGroup({
    id: new FormControl('', Validators.required),
    bankAccountName: new FormControl('', Validators.required),
    bankAccountNumber: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[0-9]*$/),
    ]),
    bankName: new FormControl('', Validators.required),
  });

  ngOnInit(): void {
    this.fetchData();
  }

  fetchData() {
    const id = this.data.id;
    this.apiService
      .get('banks/' + id, {})
      .subscribe({
        next: (data: any) => {
          this.formGroup.patchValue({
            id: data.id,
            bankAccountName: data.bankAccountName,
            bankAccountNumber: data.bankAccountNumber,
            bankName: data.bankName,
          });
          this.filteredOptions = this.options.slice();
        },
        error: (error) => {
          this.snackBar.open('Error fetching bank account', 'Close', {
            duration: 2000,
          });
          this.dialog.close();
        },
      })
      .add(() => {
        this.isLoading = false;
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

  onClose() {
    this.dialog.close();
  }

  onSubmit() {
    this.isSubmitting = true;
    this.apiService
      .put('banks/' + this.data.id, this.formGroup.value)
      .subscribe({
        next: (_) => {
          this.snackBar.open('Bank account updated successfully', 'Close', {
            duration: 2000,
          });
          this.dialog.close();
        },
        error: (err) => {
          this.snackBar.open('Error updating bank account', 'Close', {
            duration: 2000,
          });
        },
      })
      .add(() => {
        this.isSubmitting = false;
      });
  }
}
