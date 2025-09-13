import { Component, ElementRef, ViewChild } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { DataTransferService } from 'src/app/services/data-transfer.service';
import { SalarySlipAllowanceCreateComponent } from './salary-slip-allowance-create/salary-slip-allowance-create.component';
import { SalarySlipDeductionCreateComponent } from './salary-slip-deduction-create/salary-slip-deduction-create.component';
import { MatTable } from '@angular/material/table';
import { ApiService } from 'src/app/services/api.service';
import { banks, IBank } from 'src/app/utils/bank';

@Component({
  selector: 'app-salary-slip-create',
  standalone: false,
  templateUrl: './salary-slip-create.component.html',
  styleUrl: './salary-slip-create.component.scss',
})
export class SalarySlipCreateComponent {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private dataTransferService: DataTransferService,
    private dialog: MatDialog,
    private formBuilder: FormBuilder,
    private apiService: ApiService
  ) {}

  @ViewChild('allowanceTable') allowanceTable!: MatTable<any>;
  @ViewChild('deductionTable') deductionTable!: MatTable<any>;
  @ViewChild('input') input!: ElementRef<HTMLInputElement>;
  isFinal: boolean = false;
  isSubmitting: boolean = false;
  filteredOptions: IBank[] = [];
  options: IBank[] = banks;
  bankAccounts: any[] = [];

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

  ngOnInit(): void {
    const data = this.dataTransferService.getData();
    if (data) {
      this.formGroup.patchValue({
        userID: data.userID,
        month: data.month + 1,
        monthName: this.months[data.month].label,
        year: data.year,
      });

      this.fetchEmployeeData();

      this.dataTransferService.clearData();
    } else {
      this.snackBar.open('No data provided', 'Close', {
        duration: 3000,
      });
      this.router.navigate(['/Employee']);
    }

    // if there is any changes on basic salary, transportation allowance, meal allowance, overtime,
    // then recalculate the salary
    this.formGroup.valueChanges.subscribe((changes) => {
      if (
        changes.basicSalary ||
        changes.transportationAllowanceQuantity ||
        changes.transportationAllowanceRate ||
        changes.mealAllowanceQuantity ||
        changes.mealAllowanceRate ||
        changes.overtimeQuantity ||
        changes.overtimeRate ||
        changes.taxAmount ||
        changes.otherAllowances ||
        changes.deductions
      ) {
        this.isFinal = false;
      }
    });
  }

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

    // other allowances
    otherAllowances: new FormArray([]),

    // deductions
    deductions: new FormArray([]),

    // bank details
    bankName: new FormControl('', { nonNullable: true }),
    bankAccountNumber: new FormControl('', { nonNullable: true }),
    bankAccountName: new FormControl('', { nonNullable: true }),
    paymentMethod: new FormControl('', Validators.required),

    // tax deduction
    taxAmount: new FormControl(0, { nonNullable: true }),
    grossSalary: new FormControl(0, { nonNullable: true }),
    netSalary: new FormControl(0, { nonNullable: true }),
  });

  onAddOtherAllowance() {
    this.dialog
      .open(SalarySlipAllowanceCreateComponent, {})
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          this.allowancesFormArray().push(
            this.formBuilder.group({
              name: new FormControl(result.name, { nonNullable: true }),
              amount: new FormControl(result.amount, { nonNullable: true }),
              description: new FormControl(result.description, {
                nonNullable: true,
              }),
            })
          );
          this.allowanceTable.renderRows();
        }
      });
  }

  onAddDeducation() {
    this.dialog
      .open(SalarySlipDeductionCreateComponent, {})
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          this.deductionsFormArray().push(
            this.formBuilder.group({
              name: new FormControl(result.name, { nonNullable: true }),
              amount: new FormControl(result.amount, { nonNullable: true }),
              description: new FormControl(result.description, {
                nonNullable: true,
              }),
            })
          );
          this.deductionTable.renderRows();
        }
      });
  }

  allowancesFormArray(): FormArray {
    return this.formGroup.get('otherAllowances') as FormArray;
  }

  get allowancesControls() {
    return this.allowancesFormArray().controls;
  }

  deductionsFormArray(): FormArray {
    return this.formGroup.get('deductions') as FormArray;
  }

  get deductionsControls() {
    return this.deductionsFormArray().controls;
  }

  onRemoveAllowance(index: number) {
    const allowances = this.formGroup.get('otherAllowances') as FormArray;
    if (index >= 0 && index < allowances.length) {
      allowances.removeAt(index);
      this.allowanceTable.renderRows();
    }
  }

  onRemoveDeduction(index: number) {
    const deductions = this.formGroup.get('deductions') as FormArray;
    if (index >= 0 && index < deductions.length) {
      deductions.removeAt(index);
      this.deductionTable.renderRows();
    }
  }

  displayedAllowancesColumns: string[] = [
    'name',
    'amount',
    'description',
    'action',
  ];

  displayedDeductionsColumns: string[] = [
    'name',
    'amount',
    'description',
    'action',
  ];

  fetchEmployeeData() {
    const userID = this.formGroup.get('userID')?.value;
    this.apiService.get('employees/' + userID, {}).subscribe({
      next: (data: any) => {
        this.formGroup.patchValue({
          name: data.name,
          address: data.address,
          taxCategory: data.taxCategory,
          position: data.position,
          department: data.department,
        });
      },
      error: (error) => {},
    });
  }

  calculateSalary(): void {
    this.isFinal = true;
    const basicSalary = this.formGroup.get('basicSalary')?.value || 0;
    const transportationAllowanceQuantity =
      this.formGroup.get('transportationAllowanceQuantity')?.value || 0;
    const transportationAllowanceRate =
      this.formGroup.get('transportationAllowanceRate')?.value || 0;
    const mealAllowanceQuantity =
      this.formGroup.get('mealAllowanceQuantity')?.value || 0;
    const mealAllowanceRate =
      this.formGroup.get('mealAllowanceRate')?.value || 0;
    const overtimeQuantity = this.formGroup.get('overtimeQuantity')?.value || 0;
    const overtimeRate = this.formGroup.get('overtimeRate')?.value || 0;
    const taxAmount = this.formGroup.get('taxAmount')?.value || 0;

    // Calculate total allowances
    let totalAllowances = 0;
    this.allowancesFormArray().controls.forEach((control) => {
      totalAllowances += control.get('amount')?.value || 0;
    });

    // Calculate total deductions
    let totalDeductions = 0;
    this.deductionsFormArray().controls.forEach((control) => {
      totalDeductions += control.get('amount')?.value || 0;
    });

    // Calculate net salary
    const netSalary =
      basicSalary +
      transportationAllowanceQuantity * transportationAllowanceRate +
      mealAllowanceQuantity * mealAllowanceRate +
      overtimeQuantity * overtimeRate +
      totalAllowances -
      totalDeductions -
      taxAmount;

    // Update the form with calculated values
    this.formGroup.patchValue({
      grossSalary:
        basicSalary +
        transportationAllowanceQuantity * transportationAllowanceRate +
        mealAllowanceQuantity * mealAllowanceRate +
        overtimeQuantity * overtimeRate +
        totalAllowances -
        totalDeductions,
      netSalary: netSalary,
    });

    this.isFinal = true;
  }

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
      .post('salary-slips', this.formGroup.value)
      .subscribe({
        next: (_) => {
          this.snackBar.open('Salary slip created successfully', 'Close', {
            duration: 3000,
          });
          this.router.navigate(['/Salary-slip']);
        },
        error: (error) => {
          console.error('Error creating salary slip:', error);
          this.snackBar.open(
            'Failed to create salary slip. Please try again later.',
            'Close',
            {
              duration: 3000,
            }
          );
        },
      })
      .add(() => {
        this.isSubmitting = false;
      });
  }
}
