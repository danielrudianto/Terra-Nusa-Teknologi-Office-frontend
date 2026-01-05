import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ApiService } from '../../../services/api.service';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';

@Component({
  selector: 'app-expense-view',
  imports: [
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatListModule,
    CommonModule,
  ],
  templateUrl: './expense-view.component.html',
  styleUrl: './expense-view.component.scss',
  standalone: true,
})
export class ExpenseViewComponent {
  constructor(
    private apiService: ApiService,
    private datePipe: DatePipe,
    private decimalPipe: DecimalPipe,
    @Inject(MAT_DIALOG_DATA) public data: { id: number },
    private formBuilder: FormBuilder
  ) {}

  formGroup: FormGroup = new FormGroup({
    date: new FormControl(''),
    dueDate: new FormControl(''),
    invoiceName: new FormControl(''),
    receiptName: new FormControl(''),
    purchaseType: new FormControl(''),
    description: new FormControl(''),
    dpp: new FormControl(''),
    pph: new FormControl(''),
    pphCode: new FormControl(''),
    pbbkb: new FormControl(''),
    total: new FormControl(''),
    opponent: new FormControl(''),
    bankAccountName: new FormControl(''),
    bankAccountNumber: new FormControl(''),
    bankName: new FormControl(''),
    payments: new FormArray([]),
  });

  ngOnInit(): void {
    this.fetchData();
  }

  get f() {
    return this.formGroup.controls;
  }

  get t() {
    return this.f['payments'] as FormArray;
  }

  fetchData() {
    this.apiService.get(`expenses/${this.data.id}`, {}).subscribe({
      next: (data: any) => {
        this.formGroup.patchValue({
          date: this.datePipe.transform(data.expense.date, 'dd MMMM yyyy'),
          dueDate: this.datePipe.transform(
            data.expense.dueDate,
            'dd MMMM yyyy'
          ),
          invoiceName: data.expense.invoiceName,
          receiptName: data.expense.receiptName,
          purchaseType: data.expense.purchaseType,
          description: data.expense.description,
          dpp: this.decimalPipe.transform(data.expense.dpp, '1.2-2'),
          pph: this.decimalPipe.transform(
            data.expense.pphPercentage * data.expense.dpp,
            '1.2-2'
          ),
          pbbkb: this.decimalPipe.transform(data.pbbkb, '1.2-2'),
          pphCode:
            data.expense.pphCode != null
              ? `${data.expense.pphCode} - ${data.expense.pphTaxObject}`
              : '',
          total: this.decimalPipe.transform(
            data.expense.dpp + data.expense.pbbkb,
            '1.2-2'
          ),
          opponent: `${data.expense.expense_opponent_name} - ${data.expense.expense_opponent_description}`,
          bankAccountName: data.expense.bankAccountName,
          bankAccountNumber: data.expense.bankAccountNumber,
          bankName: data.expense.bankName,
        });

        data.payments.forEach((x: any) => {
          this.t.push(
            this.formBuilder.group({
              id: [x.id],
              bankAccountName: [x.bankAccountName],
              bankAccountNumber: [x.bankAccountNumber],
              bankName: [x.bankName],
              amount: [x.amount],
              date: [x.date],
              isApprove: [x.isApprove],
            })
          );
        });
      },
      error: (error) => {},
    });
  }
}
