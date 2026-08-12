import { Component, inject } from '@angular/core';
import { PermissionService } from '../../../services/permission.service';
import { AgendaComponent } from '../agenda/agenda.component';
import { CanDirective } from '../../../directives/can.directive';
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
    AgendaComponent,
    CanDirective,
    TranslatePipe,
    CommonModule,
    RouterModule,
    TodayPaymentComponent,
    CashPositionComponent,
    DashboardReimbursementComponent,
  ],
})
export class DashboardBodyComponent {

  private readonly permission = inject(PermissionService);

  /**
   * Boleh membuka generator invoice.
   *
   * Bagian keuangan, atau akses 4 ke atas. Sengaja tidak memakai
   * `sales_invoice:read` saja: pengguna tanpa divisi tidak dibatasi wilayah,
   * sehingga seorang akses 3 tanpa divisi lolos pemeriksaan itu tanpa
   * menjadi bagian keuangan — padahal menerbitkan tagihan ke klien adalah
   * pekerjaan satu bagian, bukan sesuatu yang terbuka bagi yang kebetulan
   * dapat melihatnya.
   */
  get bolehBuatInvoice(): boolean {
    if (!this.permission.can('sales_invoice', 'create')) return false;
    return this.permission.level() >= 4 || this.permission.inDepartment('fat');
  }
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
