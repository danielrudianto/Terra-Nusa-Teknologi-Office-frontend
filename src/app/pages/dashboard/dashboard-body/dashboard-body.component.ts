import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from 'src/app/services/api.service';
import { TodayPaymentComponent } from '../today-payment/today-payment/today-payment.component';
import { CashPositionComponent } from '../cash-position/cash-position.component';
import { DashboardReimbursementComponent } from '../dashboard-reimbursement/dashboard-reimbursement.component';

@Component({
  selector: 'app-dashboard-body',
  templateUrl: './dashboard-body.component.html',
  styleUrls: ['./dashboard-body.component.scss'],
  standalone: true,
  imports: [
    TranslatePipe,
    CommonModule,
    RouterModule,
    TodayPaymentComponent,
    CashPositionComponent,
    DashboardReimbursementComponent,
  ],
})
export class DashboardBodyComponent {
  constructor(private apiService: ApiService) {}

  paymentList: any[] = [];

  isLoading: boolean = false;

  ngOnInit(): void {}

  fetchDashboardData() {
    this.isLoading = true;
    this.apiService.get('dashboard', {
      payment: true,
      agenda: true,
      balance: true,
      reimbursement: true,
    });
  }
}
