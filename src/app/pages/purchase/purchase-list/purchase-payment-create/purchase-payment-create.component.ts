import { Component, Inject } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-purchase-payment-create',
  templateUrl: './purchase-payment-create.component.html',
  styleUrls: ['./purchase-payment-create.component.scss'],
  standalone: false,
})
export class PurchasePaymentCreateComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private apiService: ApiService,
    private dialog: MatDialogRef<PurchasePaymentCreateComponent>,
    private snackBar: MatSnackBar
  ) {}

  isLoading: boolean = false;
  isSubmitting: boolean = false;
  bankAccounts: any[] = [];

  formGroup: FormGroup = new FormGroup({
    date: new FormControl('', Validators.required),
    bankName: new FormControl('', Validators.required),
    bankAccountName: new FormControl('', Validators.required),
    bankAccountNumber: new FormControl('', Validators.required),
    amount: new FormControl(0, [Validators.required, Validators.min(1)]),
  });

  ngOnInit(): void {
    this.fetchBankData();
    this.fetchData();
  }

  fetchBankData() {
    this.apiService.get('banks/all', {}).subscribe({
      next: (data: any) => {
        this.bankAccounts = data;
      },
      error: (error) => {
        this.snackBar.open('Error fetching bank accounts', 'Close', {
          duration: 3000,
        });
        this.dialog.close();
      },
    });
  }

  fetchData() {
    this.apiService
      .get('purchases/payments/' + this.data.id, {})
      .subscribe({
        next: (data) => {},
        error: (error) => {},
      })
      .add(() => {
        this.isLoading = false;
      });
  }

  onSubmit() {}

  onClose() {}
}
