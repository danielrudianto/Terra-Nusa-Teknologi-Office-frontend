import { Component } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';
import { DialogGeserDirective } from '../../../../directives/dialog-geser.directive';

@Component({
  selector: 'app-reimbursement-create-item-dialog',
  templateUrl: './reimbursement-create-item-dialog.component.html',
  styleUrls: ['./reimbursement-create-item-dialog.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    TranslatePipe,
    DialogGeserDirective,
  ],
})
export class ReimbursementCreateItemDialogComponent {
  constructor(
    private dialog: MatDialogRef<ReimbursementCreateItemDialogComponent>,
  ) {}

  formGroup: FormGroup = new FormGroup({
    date: new FormControl('', Validators.required),
    description: new FormControl('', [
      Validators.required,
      Validators.maxLength(255),
      Validators.minLength(10),
    ]),
    // Nominal reimbursement tidak boleh negatif — yang negatif berarti
    // perusahaan menagih karyawannya, dan itu bukan reimbursement.
    amount: new FormControl('', [Validators.required, Validators.min(0)]),
  });

  onSubmit() {
    const date = this.formGroup.get('date')?.value;
    // i think the date here is moment object, so we need to format it
    this.formGroup.get('date')?.setValue(date.format('YYYY-MM-DD'));
    // ngx-mask "separator" menyimpan nilai sebagai string ("1000000").
    // Konversi ke number agar penjumlahan (PDF) & submit backend tidak
    // memperlakukannya sebagai teks (string concatenation).
    const rawAmount = this.formGroup.get('amount')?.value;
    const numericAmount =
      typeof rawAmount === 'string'
        ? Number(rawAmount.replace(/[^0-9.]/g, ''))
        : Number(rawAmount);
    this.dialog.close({
      ...this.formGroup.value,
      amount: isNaN(numericAmount) ? 0 : numericAmount,
    });
  }

  onCancel() {
    this.dialog.close();
  }
}
