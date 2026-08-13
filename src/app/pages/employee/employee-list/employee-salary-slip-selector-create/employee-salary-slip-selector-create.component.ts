import { CommonModule } from '@angular/common';
import { ServerMessageService } from 'src/app/services/server-message.service';
import { Component, Inject, inject } from '@angular/core';
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
  private readonly serverMessage = inject(ServerMessageService);
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
      Validators.min(2023),
      Validators.max(new Date().getFullYear()),
    ]),
  });

  ngOnInit(): void {}

  /**
   * Submit the salary slip form and navigate to the creation page if successful.
   * It will send a POST request to /salary_slips/check with the user ID, month, and year.
   * If the request is successful, it will store the user ID, month, and year in the data transfer service,
   * close all the dialogs, display a snackbar with a success message, and navigate to the salary slip creation page.
   * If the request fails, it will display a snackbar with an error message.
   */
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
          this.snackBar.open(
          this.serverMessage.terjemahkan(error), 'Close', {
            duration: 3000,
          });
        },
      })
      .add(() => {
        this.isSubmitting = false;
      });
  }
}
