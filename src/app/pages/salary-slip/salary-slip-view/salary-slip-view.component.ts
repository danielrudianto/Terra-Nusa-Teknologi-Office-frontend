import { Component, Inject, ViewChild, inject } from '@angular/core';
import { ServerMessageService } from 'src/app/services/server-message.service';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { ApiService } from '../../../services/api.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatTable, MatTableModule } from '@angular/material/table';
import { DeleteConfirmationComponent } from 'src/app/components/delete-confirmation/delete-confirmation.component';
import { SalarySlipHelper } from 'src/app/helpers/salary-slip.helper';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { TranslateService } from '@ngx-translate/core';
import { AuditTrailComponent } from '../../../components/audit-trail/audit-trail.component';
import { DialogGeserDirective } from '../../../directives/dialog-geser.directive';

@Component({
  selector: 'app-salary-slip-view',
  standalone: true,
  templateUrl: './salary-slip-view.component.html',
  styleUrl: './salary-slip-view.component.scss',
  imports: [
    AuditTrailComponent,
    TranslatePipe,
    MatDialogModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    MatTableModule,
    DialogGeserDirective,
  ],
})
export class SalarySlipViewComponent {
  private readonly serverMessage = inject(ServerMessageService);
  constructor(
    private translate: TranslateService,
    @Inject(MAT_DIALOG_DATA) public data: { id: number },
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<SalarySlipViewComponent>,
    private dialog: MatDialog,
    private formBuilder: FormBuilder,
  ) {}

  @ViewChild('allowanceTable') allowanceTable!: MatTable<any>;
  @ViewChild('deductionTable') deductionTable!: MatTable<any>;
  isSubmitting = false;

  /*
   * Bulan punya DUA sebutan, dan keduanya diperlukan.
   *
   * `key`  — untuk yang tampil di layar; ikut bahasa aplikasi.
   * `nama` — nama Indonesia tetap, dipakai pada dokumen yang dicetak.
   *
   * Slip gaji seluruhnya berbahasa Indonesia ("SLIP GAJI", "Periode"),
   * sehingga bulannya harus Indonesia berapa pun bahasa aplikasinya.
   * Sebelumnya kolom ini berisi teks Inggris, dan slip yang tercetak
   * berbunyi "Periode January 2026".
   */
  months: { value: number; key: string; nama: string }[] = [
    { value: 0, key: 'common.january', nama: 'Januari' },
    { value: 1, key: 'common.february', nama: 'Februari' },
    { value: 2, key: 'common.march', nama: 'Maret' },
    { value: 3, key: 'common.april', nama: 'April' },
    { value: 4, key: 'common.may', nama: 'Mei' },
    { value: 5, key: 'common.june', nama: 'Juni' },
    { value: 6, key: 'common.july', nama: 'Juli' },
    { value: 7, key: 'common.august', nama: 'Agustus' },
    { value: 8, key: 'common.september', nama: 'September' },
    { value: 9, key: 'common.october', nama: 'Oktober' },
    { value: 10, key: 'common.november', nama: 'November' },
    { value: 11, key: 'common.december', nama: 'Desember' },
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
            }),
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
            }),
          );
        });

        this.allowanceTable.renderRows();
        this.deductionTable.renderRows();

        this.formGroup.patchValue({
          month: data.data.month,
          monthName: this.months[data.data.month - 1].nama,
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
        this.snackBar.open(
          this.serverMessage.terjemahkan(err), 'Close', {
          duration: 3000,
        });
        this.dialogRef.close();
      },
    });
  }

  /**
   * Cetak ulang slip gaji menggunakan helper PDF YANG SAMA dengan halaman
   * create, supaya format reprint identik dengan format saat dibuat.
   */
  reprintSlip() {
    const v = this.formGroup.getRawValue();
    const data = {
      name: v.name,
      nik: v.nik ?? v.userID ?? '',
      department: v.department,
      position: v.position,
      address: v.address,
      taxCategory: v.taxCategory,
      taxAmount: v.taxAmount ?? 0,
      basicSalary: v.basicSalary ?? 0,
      transportationAllowanceQuantity: v.transportationAllowanceQuantity ?? 0,
      transportationAllowanceRate: v.transportationAllowanceRate ?? 0,
      mealAllowanceQuantity: v.mealAllowanceQuantity ?? 0,
      mealAllowanceRate: v.mealAllowanceRate ?? 0,
      overtimeQuantity: v.overtimeQuantity ?? 0,
      overtimeRate: v.overtimeRate ?? 0,
      paymentMethod: v.paymentMethod ?? '',
      year: v.year,
      month: v.month,
      monthName: v.monthName || this.months[v.month - 1]?.nama || '',
      otherAllowances: this.allowancesFormArray.getRawValue(),
      deductions: this.deductionsFormArray.getRawValue(),
      bankAccountName: v.bankAccountName,
      bankAccountNumber: v.bankAccountNumber,
      bankName: v.bankName,
    };
    SalarySlipHelper.createProxyPaymentPDF(data as any);
  }

  onDelete() {
    this.dialog
      .open(DeleteConfirmationComponent, {
        data: {
          title: this.translate.instant('confirm.deleteTitle'),
          prompt: this.translate.instant('confirm.deletePrompt'),
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
      this.translate.instant('notify.deleteSuccess'),
                  'Close',
                  {
                    duration: 3000,
                  },
                );

                this.dialogRef.close('deleted');
              },
              error: (error) => {
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
      });
  }
}
