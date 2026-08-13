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
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-employee-salary-slip-selector-create',
  imports: [
    TranslatePipe,
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
