import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-supplier-view',
  templateUrl: './supplier-view.component.html',
  styleUrls: ['./supplier-view.component.scss'],
})
export class SupplierViewComponent {
  supplier: any = null;
  isLoading: boolean = true;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.apiService
      .get(`suppliers/${this.data.id}`, {})
      .subscribe({
        next: (res: any) => {
          this.supplier = res;
        },
        error: (err) => {
          console.error(err);
        },
      })
      .add(() => {
        this.isLoading = false;
      });
  }

  share() {
    navigator.share({
      text: `*Supplier data*\nName: ${this.supplier.name}, ${
        this.supplier.prefix
      }\nAddress: ${this.supplier.address}\nCity: ${
        this.supplier.city
      }\nProvince: ${this.supplier.province}\nNPWP: ${
        this.supplier.npwp ?? 'N/A'
      }\nPhone Number: ${this.supplier.phoneNumber ?? 'N/A'}\nEmail: ${
        this.supplier.email ?? 'N/A'
      }`,
    });
  }
}
