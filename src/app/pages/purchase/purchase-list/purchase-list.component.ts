import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from 'src/app/services/api.service';
import { PurchaseReportSelectComponent } from './purchase-report-select/purchase-report-select.component';

@Component({
  selector: 'app-purchase-list',
  templateUrl: './purchase-list.component.html',
  styleUrls: ['./purchase-list.component.scss'],
})
export class PurchaseListComponent {
  constructor(private apiService: ApiService, private dialog: MatDialog) {}

  page: number = 1;
  purchases: any[] = [];
  count: number = 0;
  isLoading: boolean = false;

  ngOnInit(): void {
    this.fetchData();
  }

  openPurchaseReportSelector() {
    this.dialog.open(PurchaseReportSelectComponent, {});
  }

  fetchData(targetPage: number = 1) {
    this.isLoading = true;

    this.page = targetPage;
    this.apiService
      .get('purchases', {
        page: this.page,
      })
      .subscribe({
        next: (res: any) => {
          this.purchases = res.data;
          this.count = res.count;
        },
        error: (err) => {
          console.error(err);
        },
      })
      .add(() => {
        this.isLoading = false;
      });
  }
}
