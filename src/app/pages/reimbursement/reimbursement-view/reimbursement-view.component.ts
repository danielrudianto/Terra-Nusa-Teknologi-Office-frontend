import { Clipboard } from '@angular/cdk/clipboard';
import { CommonModule, DatePipe } from '@angular/common';
import { Component, Inject } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { NgxMaskDirective } from 'ngx-mask';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-reimbursement-view',
  imports: [
    MatDialogModule,
    MatSnackBarModule,
    MatInputModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    NgxMaskDirective,
    CommonModule,
    MatListModule,
  ],
  providers: [DatePipe],
  templateUrl: './reimbursement-view.component.html',
  styleUrl: './reimbursement-view.component.scss',
})
export class ReimbursementViewComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { id: number },
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private datePipe: DatePipe,
    private formBuilder: FormBuilder,
    private dialog: MatDialogRef<ReimbursementViewComponent>,
    private clipboard: Clipboard
  ) {}

  formGroup: FormGroup = new FormGroup({
    date: new FormControl(''),
    dueDate: new FormControl(''),
    projectName: new FormControl(''),
    name: new FormControl(''),
    purchaseType: new FormControl(''),
    items: new FormArray([]),
    payments: new FormArray([]),
    bankName: new FormControl(''),
    bankAccountName: new FormControl(''),
    bankAccountNumber: new FormControl(''),
    paymentMethod: new FormControl(''),
    total: new FormControl(0),
  });

  isLoading: boolean = false;

  ngOnInit(): void {
    this.fetchData();
  }

  fetchData() {
    this.isLoading = true;
    this.apiService
      .get('reimbursements/' + this.data.id, {})
      .subscribe({
        next: (data: any) => {
          const paymentMethod = data.reimbursement.paymentMethod;
          const paymentMethodText =
            paymentMethod == 'bank'
              ? 'Bank Transfer'
              : paymentMethod == 'cash'
              ? 'Cash'
              : 'Virtual Account';

          const purchaseType = data.reimbursement.purchaseType;
          const purchaseTypeText =
            purchaseType == 'A'
              ? 'Transportation'
              : purchaseType == 'E'
              ? 'Coordination; Consumption; and Accomodation'
              : 'Document handling & Stationery';
          this.formGroup.patchValue({
            date: this.datePipe.transform(
              data.reimbursement.date,
              'dd MMMM yyyy'
            ),
            dueDate: this.datePipe.transform(
              data.reimbursement.date,
              'dd MMMM yyyy'
            ),
            name: data.reimbursement.name,
            projectName: data.reimbursement.projectName,
            purchaseType: purchaseTypeText,
            bankName: data.reimbursement.bankName,
            bankAccountName: data.reimbursement.bankAccountName,
            bankAccountNumber: data.reimbursement.bankAccountNumber,
            paymentMethod: paymentMethodText,
            total: data.reimbursement_items.reduce(
              (a: any, b: any) => a + b.amount,
              0
            ),
          });

          data.reimbursement_items.forEach((item: any) => {
            this.t.push(
              this.formBuilder.group({
                amount: new FormControl(item.amount),
                description: new FormControl(item.description),
                date: new FormControl(
                  this.datePipe.transform(item.date, 'dd MMMM yyyy')
                ),
              })
            );
          });

          data.payments.forEach((x: any) => {
            this.p.push(
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
        error: (error) => {
          this.snackBar.open('Failed to fetch reimbursement data', 'Close', {
            duration: 3000,
          });
          console.error('Error fetching reimbursement data:', error);
          this.dialog.close();
        },
      })
      .add(() => {
        this.isLoading = false;
      });
  }

  copyBankAccountNumber() {
    this.clipboard.copy(this.formGroup.get('bankAccountNumber')!.value);
    this.snackBar.open('Bank account number copied to clipboard', 'Close', {
      duration: 3000,
    });
  }

  get f() {
    return this.formGroup.controls;
  }

  get t() {
    return this.formGroup.get('items') as FormArray;
  }

  get p() {
    return this.formGroup.get('payments') as FormArray;
  }
}
