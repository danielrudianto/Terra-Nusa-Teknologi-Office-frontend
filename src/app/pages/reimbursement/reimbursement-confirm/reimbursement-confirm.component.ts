import { CommonModule, DatePipe } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { Component, Inject, inject } from '@angular/core';
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
import { TranslatePipe } from '@ngx-translate/core';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { NgxMaskDirective } from 'ngx-mask';
import { ApiService } from 'src/app/services/api.service';
import { DialogGeserDirective } from '../../../directives/dialog-geser.directive';

@Component({
  selector: 'app-reimbursement-confirm',
  imports: [
    MatDialogModule,
    MatSnackBarModule,
    MatInputModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    NgxMaskDirective,
    CommonModule,
    TranslatePipe,
    DialogGeserDirective,
  ],
  providers: [DatePipe],
  templateUrl: './reimbursement-confirm.component.html',
  styleUrl: './reimbursement-confirm.component.scss',
})
export class ReimbursementConfirmComponent {
  private readonly translate = inject(TranslateService);
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { id: number },
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private datePipe: DatePipe,
    private formBuilder: FormBuilder,
    private dialog: MatDialogRef<ReimbursementConfirmComponent>,
  ) {}

  formGroup: FormGroup = new FormGroup({
    date: new FormControl(''),
    dueDate: new FormControl(''),
    projectName: new FormControl(''),
    name: new FormControl(''),
    purchaseType: new FormControl(''),
    items: new FormArray([]),
    bankName: new FormControl(''),
    bankAccountName: new FormControl(''),
    bankAccountNumber: new FormControl(''),
    paymentMethod: new FormControl(''),
    total: new FormControl(0),
  });

  isLoading: boolean = false;
  isSubmitting: boolean = false;

  ngOnInit(): void {
    this.fetchData();
  }

  fetchData() {
    this.isLoading = true;
    this.apiService
      .get('reimbursements/' + this.data.id, {})
      .subscribe({
        next: (data: any) => {
          if (data.reimbursement.isApprove) {
            this.snackBar.open(
      this.translate.instant('notify.alreadyApproved'),
              'Close',
              {
                duration: 3000,
              },
            );
            this.dialog.close();
            return;
          }

          if (data.reimbursement.isDelete) {
            this.snackBar.open(
      this.translate.instant('notify.alreadyRejected'),
              'Close',
              {
                duration: 3000,
              },
            );
            this.dialog.close();
            return;
          }

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
              'dd MMMM yyyy',
            ),
            dueDate: this.datePipe.transform(
              data.reimbursement.date,
              'dd MMMM yyyy',
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
              0,
            ),
          });

          data.reimbursement_items.forEach((item: any) => {
            this.t.push(
              this.formBuilder.group({
                amount: new FormControl(item.amount),
                description: new FormControl(item.description),
                date: new FormControl(
                  this.datePipe.transform(item.date, 'dd MMMM yyyy'),
                ),
              }),
            );
          });
        },
        error: (error) => {
          this.snackBar.open(
      this.translate.instant('notify.loadFailed'), 'Close', {
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

  approve() {
    this.apiService
      .put('reimbursements/approve/' + this.data.id, {})
      .subscribe({
        next: (data: any) => {
          this.snackBar.open(
      this.translate.instant('notify.approveSuccess'), 'Close', {
            duration: 3000,
          });
          this.dialog.close('approve');
        },
      })
      .add(() => {
        this.isSubmitting = false;
      });
  }

  reject() {
    this.apiService
      .put('reimbursements/reject/' + this.data.id, {})
      .subscribe({
        next: (data: any) => {
          this.snackBar.open(
      this.translate.instant('notify.updateSuccess'), 'Close', {
            duration: 3000,
          });
          this.dialog.close('reject');
        },
      })
      .add(() => {
        this.isSubmitting = false;
      });
  }

  get f() {
    return this.formGroup.controls;
  }

  get t() {
    return this.formGroup.get('items') as FormArray;
  }
}
