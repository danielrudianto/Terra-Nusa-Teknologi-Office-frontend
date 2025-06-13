import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from 'src/app/services/api.service';
import { DataTransferService } from 'src/app/services/data-transfer.service';

@Component({
  selector: 'app-employee-salary-slip-selector-create',
  imports: [
    MatDialogModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    ReactiveFormsModule,
    CommonModule,
    RouterModule,
  ],
  templateUrl: './employee-salary-slip-selector-create.component.html',
  styleUrl: './employee-salary-slip-selector-create.component.scss',
})
export class EmployeeSalarySlipSelectorCreateComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { id: number },
    private apiService: ApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router,
    private dataTransferService: DataTransferService
  ) {}

  months: { value: number; label: string }[] = [
    { value: 0, label: 'January' },
    { value: 1, label: 'February' },
    { value: 2, label: 'March' },
    { value: 3, label: 'April' },
    { value: 4, label: 'May' },
    { value: 5, label: 'June' },
    { value: 6, label: 'July' },
    { value: 7, label: 'August' },
    { value: 8, label: 'September' },
    { value: 9, label: 'October' },
    { value: 10, label: 'November' },
    { value: 11, label: 'December' },
  ];
  isSubmitting: boolean = false;

  salarySlipFormGroup: FormGroup = new FormGroup({
    month: new FormControl('', [
      Validators.required,
      Validators.min(0),
      Validators.max(11),
    ]),
    year: new FormControl('', [
      Validators.required,
      Validators.min(2024),
      Validators.max(new Date().getFullYear()),
    ]),
  });

  ngOnInit(): void {}

  onSubmit() {
    this.isSubmitting = true;
    this.apiService
      .post('salary-slips/check', {
        userID: this.data.id,
        month: this.salarySlipFormGroup.value.month + 1,
        year: this.salarySlipFormGroup.value.year,
      })
      .subscribe({
        next: () => {
          this.dataTransferService.setData({
            userID: this.data.id,
            month: this.salarySlipFormGroup.value.month,
            year: this.salarySlipFormGroup.value.year,
          });
          this.dialog.closeAll();
          this.snackBar.open(
            'Navigating to salary slip creation page',
            'Close',
            {
              duration: 2000,
            }
          );
          this.router.navigate(['/Salary-slip/Create'], {});
        },
        error: (error) => {
          console.error('Error checking salary slip:', error);
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
