import { Component } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-dashboard-body',
  templateUrl: './dashboard-body.component.html',
  styleUrls: ['./dashboard-body.component.scss'],
  standalone: false,
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
