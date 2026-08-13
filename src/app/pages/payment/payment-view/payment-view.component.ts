import { Component, Inject } from '@angular/core';
import { AuditTrailComponent } from 'src/app/components/audit-trail/audit-trail.component';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { ApiService } from '../../../services/api.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { provideNgxMask } from 'ngx-mask';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-payment-view',
  providers: [provideNgxMask()],
  imports: [
    AuditTrailComponent,
    MatDialogModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    TranslatePipe,
  ],
  templateUrl: './payment-view.component.html',
  styleUrl: './payment-view.component.scss',
})
export class PaymentViewComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private datePipe: DatePipe,
    private translate: TranslateService,
  ) {}

  formGroup: FormGroup = new FormGroup({
    date: new FormControl('', Validators.required),
    amount: new FormControl(0, Validators.required),
    bank_account_name: new FormControl('', Validators.required),
    bank_account_number: new FormControl('', Validators.required),
    bank_name: new FormControl('', Validators.required),
    type: new FormControl(''),
  });

  ngOnInit(): void {
    this.fetchData();
  }

  fetchData() {
    this.apiService.get(`outgoing-payments/${this.data.id}`, {}).subscribe({
      next: (data: any) => {
        this.formGroup.patchValue({
          date: this.datePipe.transform(data.payment.date, 'dd MMMM yyyy'),
          amount: data.payment.amount,
          bank_account_name: data.bankAccount.bankAccountName,
          bank_account_number: data.bankAccount.bankAccountNumber,
          bank_name: data.bankAccount.bankName,
          type:
            data.expense != null
              ? this.translate.instant('paymentView.typeExpense')
              : data.reimbursement != null
                ? this.translate.instant('paymentView.typeReimbursement')
                : data.purchase != null
                  ? this.translate.instant('paymentView.typePurchase')
                  : data.salarySlip != null
                    ? this.translate.instant('paymentView.typeSalary')
                    : this.translate.instant('paymentView.typeLoan'),
        });
      },
      error: (error) => {
        this.snackBar.open(error.error.detail, 'Close', {
          duration: 3000,
        });
      },
    });
  }
}
