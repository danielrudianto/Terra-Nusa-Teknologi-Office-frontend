import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { ServerMessageService } from 'src/app/services/server-message.service';
import { TranslateService } from '@ngx-translate/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { DataTransferService } from 'src/app/services/data-transfer.service';
import { SalarySlipAllowanceCreateComponent } from './salary-slip-allowance-create/salary-slip-allowance-create.component';
import { SalarySlipDeductionCreateComponent } from './salary-slip-deduction-create/salary-slip-deduction-create.component';
import { MatTable, MatTableModule } from '@angular/material/table';
import { ApiService } from 'src/app/services/api.service';
import { banks, IBank } from 'src/app/utils/bank';
import { SalarySlipHelper } from 'src/app/helpers/salary-slip.helper';
import { CommonModule, DatePipe } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

const lastDateRequiredIfLastDay: ValidatorFn = (control: AbstractControl) => {
  const group = control as FormGroup;
  const isLastDay = group.get('isLastDay')?.value;
  const lastDate = group.get('lastDate')?.value;

  if (isLastDay && !lastDate) {
    return { lastDateRequired: true };
  }

  return null;
};

@Component({
  selector: 'app-salary-slip-create',
  providers: [provideNgxMask()],
  imports: [
    TranslatePipe,
    RouterModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatSelectModule,
    MatTableModule,
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatAutocompleteModule,
    NgxMaskDirective,
  ],
  templateUrl: './salary-slip-create.component.html',
  styleUrl: './salary-slip-create.component.scss',
  standalone: true,
})
export class SalarySlipCreateComponent {
  private readonly serverMessage = inject(ServerMessageService);
  private readonly translate = inject(TranslateService);
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private dataTransferService: DataTransferService,
    private dialog: MatDialog,
    private formBuilder: FormBuilder,
    private apiService: ApiService,
    private datePipe: DatePipe,
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
        nik: data.nik,
      });

      this.fetchEmployeeData();

      this.dataTransferService.clearData();
    } else {
      this.snackBar.open(
      this.translate.instant('notify.noDataProvided'), 'Close', {
        duration: 3000,
      });
      this.router.navigate(['/Master/Employee']);
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

    this.formGroup.get('lastDate')?.disable();

    this.formGroup.get('isLastDay')?.valueChanges.subscribe((isLastDay) => {
      const lastDateControl = this.formGroup.get('lastDate');

      if (!isLastDay) {
        lastDateControl?.disable(); // makes it readonly
      } else {
        lastDateControl?.enable(); // re-enable if not last day
      }
    });
  }

  formGroup: FormGroup = new FormGroup(
    {
      userID: new FormControl('', { nonNullable: true }),
      nik: new FormControl(''),
      month: new FormControl('', { nonNullable: true }),
      monthName: new FormControl('', { nonNullable: true }),
      year: new FormControl('', { nonNullable: true }),
      name: new FormControl('', { nonNullable: true }),
      address: new FormControl('', { nonNullable: true }),
      taxCategory: new FormControl('', { nonNullable: true }),
      position: new FormControl('', { nonNullable: true }),
      department: new FormControl('', { nonNullable: true }),
      basicSalary: new FormControl(0, { nonNullable: true }),
      transportationAllowanceQuantity: new FormControl(0, {
        nonNullable: true,
      }),
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

      isLastDay: new FormControl(false, { nonNullable: true }),
      lastDate: new FormControl(''),
    },
    {
      validators: lastDateRequiredIfLastDay,
    },
  );

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
              isIncluded: new FormControl(result.isIncluded, {
                nonNullable: true,
              }),
            }),
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
              isIncluded: new FormControl(result.isIncluded, {
                nonNullable: true,
              }),
            }),
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
    'included',
    'action',
  ];

  displayedDeductionsColumns: string[] = [
    'name',
    'amount',
    'description',
    'included',
    'action',
  ];

  fetchEmployeeData() {
    const userID = this.formGroup.get('userID')?.value;
    this.apiService.get('employees/' + userID, {}).subscribe({
      next: (data: any) => {
        this.formGroup.patchValue({
          name: data.name,
          nik: data.nik,
          address: data.address,
          taxCategory: data.taxCategory,
          position: data.position,
          department: data.department,
        });
      },
      error: (error) => {
        this.snackBar.open(
          this.serverMessage.terjemahkan(error), 'Close', {
          duration: 3000,
        });
      },
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
        option.alias.toLowerCase().includes(filterValue),
    );
  }

  formatFormData() {
    // only need
    // 1. userID, taxCategory, position, department, basicSalary, meal, transportation, and overtime, month, year, taxAmount, otherAllowances, deductions
    // 2. last day (if isLastDay == True), else set as null
    const lastDate = this.formGroup.get('isLastDay')?.value
      ? // Convert the date to YYYY-MM-DD
        this.datePipe.transform(
          this.formGroup.get('lastDate')?.value,
          'yyyy-MM-dd',
        )
      : null;

    const data = {
      userID: this.formGroup.get('userID')?.value,
      taxCategory: this.formGroup.get('taxCategory')?.value,
      position: this.formGroup.get('position')?.value,
      department: this.formGroup.get('department')?.value,
      basicSalary: this.formGroup.get('basicSalary')?.value,
      mealAllowanceQuantity: this.formGroup.get('mealAllowanceQuantity')?.value,
      mealAllowanceRate: this.formGroup.get('mealAllowanceRate')?.value,
      transportationAllowanceQuantity: this.formGroup.get(
        'transportationAllowanceQuantity',
      )?.value,
      transportationAllowanceRate: this.formGroup.get(
        'transportationAllowanceRate',
      )?.value,
      overtimeQuantity: this.formGroup.get('overtimeQuantity')?.value,
      overtimeRate: this.formGroup.get('overtimeRate')?.value,
      month: this.formGroup.get('month')?.value,
      year: this.formGroup.get('year')?.value,
      taxAmount: this.formGroup.get('taxAmount')?.value,
      otherAllowances: this.formGroup.get('otherAllowances')?.value,
      deductions: this.formGroup.get('deductions')?.value,
      lastDate: lastDate,
      bankAccountName: this.formGroup.get('bankAccountName')?.value,
      bankAccountNumber: this.formGroup.get('bankAccountNumber')?.value,
      bankName: this.formGroup.get('bankName')?.value,
      paymentMethod: this.formGroup.get('paymentMethod')?.value,
    };

    return data;
  }

  onSubmit() {
    this.isSubmitting = true;
    this.apiService
      .post('salary-slips', this.formatFormData())
      .subscribe({
        next: (_) => {
          this.generateSalarySlip(this.formGroup.value);
          this.snackBar.open(
      this.translate.instant('notify.createSuccess'), 'Close', {
            duration: 3000,
          });
          this.router.navigate(['/Salary-slip']);
        },
        error: (error) => {
          console.error('Error creating salary slip:', error);
          this.snackBar.open(
      this.translate.instant('notify.createFailed'),
            'Close',
            {
              duration: 3000,
            },
          );
        },
      })
      .add(() => {
        this.isSubmitting = false;
      });
  }

  generateSalarySlip(data: any) {
    SalarySlipHelper.createProxyPaymentPDF(data);
  }
}
