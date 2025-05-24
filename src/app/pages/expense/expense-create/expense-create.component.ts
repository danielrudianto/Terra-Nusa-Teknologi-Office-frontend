import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-expense-create',
  templateUrl: './expense-create.component.html',
  styleUrl: './expense-create.component.scss',
  standalone: false,
})
export class ExpenseCreateComponent {
  constructor(private apiService: ApiService) {}

  metaFormGroup: FormGroup = new FormGroup({
    date: new FormControl('', Validators.required),
    description: new FormControl('', Validators.required),
    purchaseType: new FormControl('', Validators.required),
    dpp: new FormControl('', [Validators.required, Validators.min(1)]),
    ppn: new FormControl('', [
      Validators.required,
      Validators.min(0),
      Validators.max(11),
    ]),
    ppnValue: new FormControl(0),
    pphCode: new FormControl(''),
    pphTaxObject: new FormControl(''),
    pphPercentage: new FormControl(0, [Validators.required, Validators.min(0)]),
    pphValue: new FormControl(0),
    total: new FormControl(0),
  });

  paymentFormGroup: FormGroup = new FormGroup({
    bankName: new FormControl('', Validators.required),
    bankAccountName: new FormControl('', Validators.required),
    bankAccountNumber: new FormControl('', Validators.required),
    paymentMethod: new FormControl('', Validators.required),
    totalPayment: new FormControl(0, [Validators.required]),
  });

  onSubmit() {}
}
