import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ApiService } from 'src/app/services/api.service';

@Component({
    selector: 'app-purchase-payment-create',
    templateUrl: './purchase-payment-create.component.html',
    styleUrls: ['./purchase-payment-create.component.scss'],
    standalone: false
})
export class PurchasePaymentCreateComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private apiService: ApiService
  ) {}

  isLoading: boolean = false;
  isSubmitting: boolean = false;

  ngOnInit(): void {}

  fetchData() {}
}
