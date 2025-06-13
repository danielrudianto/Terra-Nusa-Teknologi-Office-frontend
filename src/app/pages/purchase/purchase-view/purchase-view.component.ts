import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatStepperModule } from '@angular/material/stepper';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-purchase-view',
  imports: [
    MatStepperModule,
    MatInputModule,
    MatDialogModule,
    MatButtonModule,
    CommonModule,
    NgxMaskDirective,
    ReactiveFormsModule,
    MatSelectModule,
  ],
  providers: [provideNgxMask()],
  templateUrl: './purchase-view.component.html',
  styleUrl: './purchase-view.component.scss',
})
export class PurchaseViewComponent {
  constructor(
    private apiService: ApiService,
    private dialog: MatDialogRef<PurchaseViewComponent>,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: { id: number }
  ) {}

  isLoading: boolean = true;
  purchase: any = null;

  valueFormGroup: FormGroup = new FormGroup({
    dpp: new FormControl(''),
    ppn: new FormControl(''),
    ppnValue: new FormControl(''),
    pphCode: new FormControl(''),
    pphTaxObject: new FormControl(''),
    pphPercentage: new FormControl(''),
    pph: new FormControl(''),
    pbbkb: new FormControl(''),
    otherValue: new FormControl(''),
    otherValueNote: new FormControl(''),
    total: new FormControl(''),
    paymentTotal: new FormControl(''),
  });

  paymentFormGroup: FormGroup = new FormGroup({
    paymentMethod: new FormControl(''),
    bankName: new FormControl(''),
    bankAccountNumber: new FormControl(''),
    bankAccountName: new FormControl(''),
  });

  ngOnInit(): void {
    this.fetchData();
  }

  fetchData() {
    this.apiService.get('purchases/' + this.data.id, {}).subscribe({
      next: (data) => {
        this.purchase = data;

        this.valueFormGroup.patchValue({
          dpp: this.purchase.dpp,
          ppn: this.purchase.ppn,
          ppnValue: ((this.purchase.ppn * this.purchase.dpp) / 100).toFixed(2),
          pphCode: this.purchase.pphCode,
          pphTaxObject: this.purchase.pphTaxObject,
          pphPercentage: this.purchase.pphPercentage,
          pph: (
            (this.purchase.pphPercentage * this.purchase.dpp) /
            100
          ).toFixed(2),
          pbbkb: this.purchase.pbbkb,
          otherValue: this.purchase.otherValue,
          otherValueNote: this.purchase.otherValueNote,
          total: (
            this.purchase.dpp +
            (this.purchase.ppn * this.purchase.dpp) / 100 +
            this.purchase.pbbkb +
            this.purchase.otherValue
          ).toFixed(2),
          paymentTotal: (
            this.purchase.dpp +
            (this.purchase.ppn * this.purchase.dpp) / 100 -
            (this.purchase.pphPercentage * this.purchase.dpp) / 100 +
            this.purchase.pbbkb +
            this.purchase.otherValue
          ).toFixed(2),
        });

        this.paymentFormGroup.patchValue({
          paymentMethod: this.purchase.paymentMethod,
          bankName: this.purchase.bankName,
          bankAccountNumber: this.purchase.bankAccountNumber,
          bankAccountName: this.purchase.bankAccountName,
        });
      },
      error: (error) => {
        console.error('Error fetching purchase data:', error);
        this.snackBar.open('Error fetching purchase data', 'Close', {
          duration: 3000,
        });
      },
    });
  }

  formatDate(date: string): string {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return new Date(date).toLocaleDateString('id-ID', options);
  }
}
