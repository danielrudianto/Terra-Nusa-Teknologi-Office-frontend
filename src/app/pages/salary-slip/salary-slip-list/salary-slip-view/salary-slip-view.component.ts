import { Component, Inject, ViewChild } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogRef,
} from '@angular/material/dialog';
import { ApiService } from '../../../../services/api.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormArray, FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { MatTable } from '@angular/material/table';
import { DeleteConfirmationComponent } from 'src/app/components/delete-confirmation/delete-confirmation.component';

@Component({
  selector: 'app-salary-slip-view',
  standalone: false,
  templateUrl: './salary-slip-view.component.html',
  styleUrl: './salary-slip-view.component.scss',
})
export class SalarySlipViewComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { id: number },
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<SalarySlipViewComponent>,
    private dialog: MatDialog,
    private formBuilder: FormBuilder
  ) {}

  @ViewChild('allowanceTable') allowanceTable!: MatTable<any>;
  @ViewChild('deductionTable') deductionTable!: MatTable<any>;
  isSubmitting = false;

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

  formGroup: FormGroup = new FormGroup({
    userID: new FormControl('', { nonNullable: true }),
    month: new FormControl('', { nonNullable: true }),
    monthName: new FormControl('', { nonNullable: true }),
    year: new FormControl('', { nonNullable: true }),
    name: new FormControl('', { nonNullable: true }),
    address: new FormControl('', { nonNullable: true }),
    taxCategory: new FormControl('', { nonNullable: true }),
    position: new FormControl('', { nonNullable: true }),
    department: new FormControl('', { nonNullable: true }),
    basicSalary: new FormControl(0, { nonNullable: true }),
    transportationAllowanceQuantity: new FormControl(0, { nonNullable: true }),
    transportationAllowanceRate: new FormControl(0, { nonNullable: true }),
    mealAllowanceQuantity: new FormControl(0, { nonNullable: true }),
    mealAllowanceRate: new FormControl(0, { nonNullable: true }),
    overtimeQuantity: new FormControl(0, { nonNullable: true }),
    overtimeRate: new FormControl(0, { nonNullable: true }),
    isDelete: new FormControl(false),

    // other allowances
    otherAllowances: new FormArray([]),

    // deductions
    deductions: new FormArray([]),

    // bank details
    bankName: new FormControl('', { nonNullable: true }),
    bankAccountNumber: new FormControl('', { nonNullable: true }),
    bankAccountName: new FormControl('', { nonNullable: true }),

    // tax deduction
    taxAmount: new FormControl(0, { nonNullable: true }),
    grossSalary: new FormControl(0, { nonNullable: true }),
    netSalary: new FormControl(0, { nonNullable: true }),
  });

  get allowancesFormArray(): FormArray {
    return this.formGroup.get('otherAllowances') as FormArray;
  }

  get allowancesControls() {
    return this.allowancesFormArray.controls;
  }

  get deductionsFormArray(): FormArray {
    return this.formGroup.get('deductions') as FormArray;
  }

  get deductionsControls() {
    return this.deductionsFormArray.controls;
  }

  displayedAllowancesColumns: string[] = ['name', 'amount', 'description'];

  displayedDeductionsColumns: string[] = ['name', 'amount', 'description'];

  ngOnInit(): void {
    this.apiService.get(`salary-slips/${this.data.id}`, {}).subscribe({
      next: (data: any) => {
        this.formGroup.patchValue(data.data);
        data.allowances.forEach((x: any) => {
          this.allowancesFormArray.push(
            this.formBuilder.group({
              id: [x.id],
              name: new FormControl(x.name, { nonNullable: true }),
              amount: new FormControl(x.amount, { nonNullable: true }),
              description: new FormControl(x.description, {
                nonNullable: true,
              }),
            })
          );
        });

        data.deductions.forEach((x: any) => {
          this.deductionsFormArray.push(
            this.formBuilder.group({
              id: [x.id],
              name: new FormControl(x.name, { nonNullable: true }),
              amount: new FormControl(x.amount, { nonNullable: true }),
              description: new FormControl(x.description, {
                nonNullable: true,
              }),
            })
          );
        });

        this.allowanceTable.renderRows();
        this.deductionTable.renderRows();

        this.formGroup.patchValue({
          month: data.data.month,
          monthName: this.months[data.data.month - 1].label,
          grossSalary:
            data.data.basicSalary +
            data.data.transportationAllowanceRate *
              data.data.transportationAllowanceQuantity +
            data.data.mealAllowanceRate * data.data.mealAllowanceQuantity +
            data.data.overtimeRate * data.data.overtimeQuantity +
            data.allowances.reduce((a: any, b: any) => {
              return a + b.amount;
            }, 0) -
            data.deductions.reduce((a: any, b: any) => {
              return a + b.amount;
            }, 0),
          netSalary:
            data.data.basicSalary +
            data.data.transportationAllowanceRate *
              data.data.transportationAllowanceQuantity +
            data.data.mealAllowanceRate * data.data.mealAllowanceQuantity +
            data.data.overtimeRate * data.data.overtimeQuantity +
            data.allowances.reduce((a: any, b: any) => {
              return a + b.amount;
            }, 0) -
            data.deductions.reduce((a: any, b: any) => {
              return a + b.amount;
            }, 0) -
            data.data.taxAmount,
        });
      },
      error: (err) => {
        this.snackBar.open(err.error.detail, 'Close', {
          duration: 3000,
        });
        this.dialogRef.close();
      },
    });
  }

  onDelete() {
    this.dialog
      .open(DeleteConfirmationComponent, {
        data: {
          title: 'Delete salary slip',
          prompt: 'Are you sure to delete this salary slip?',
        },
      })
      .afterClosed()
      .subscribe((data) => {
        if (data === true) {
          this.isSubmitting = true;
          this.apiService
            .delete(`salary-slips/${this.data.id}`)
            .subscribe({
              next: () => {
                this.snackBar.open(
                  'Salary slip deleted successfully',
                  'Close',
                  {
                    duration: 3000,
                  }
                );

                this.dialogRef.close('deleted');
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
      });
  }
}
