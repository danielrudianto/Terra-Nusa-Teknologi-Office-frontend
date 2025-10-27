import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ApiService } from '../../../services/api.service';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-expense-view',
  imports: [
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
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
    @Inject(MAT_DIALOG_DATA) public data: { id: number }
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
  });

  ngOnInit(): void {
    this.fetchData();
  }

  fetchData() {
    this.apiService.get(`expenses/${this.data.id}`, {}).subscribe({
      next: (data: any) => {
        this.formGroup.patchValue({
          date: this.datePipe.transform(data.date, 'dd MMMM yyyy'),
          dueDate: this.datePipe.transform(data.dueDate, 'dd MMMM yyyy'),
          invoiceName: data.invoiceName,
          receiptName: data.receiptName,
          purchaseType: data.purchaseType,
          description: data.description,
          dpp: this.decimalPipe.transform(data.dpp, '1.2-2'),
          pph: this.decimalPipe.transform(
            data.pphPercentage * data.dpp,
            '1.2-2'
          ),
          pbbkb: this.decimalPipe.transform(data.pbbkb, '1.2-2'),
          pphCode:
            data.pphCode != null
              ? `${data.pphCode} - ${data.pphTaxObject}`
              : '',
          total: this.decimalPipe.transform(data.dpp + data.pbbkb, '1.2-2'),
          opponent: `${data.expense_opponent_name} - ${data.expense_opponent_description}`,
          bankAccountName: data.bankAccountName,
          bankAccountNumber: data.bankAccountNumber,
          bankName: data.bankName,
        });
      },
      error: (error) => {},
    });
  }
}
