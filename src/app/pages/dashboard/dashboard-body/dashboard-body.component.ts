import { Component, inject } from '@angular/core';
import { PermissionService } from '../../../services/permission.service';
import { AgendaComponent } from '../agenda/agenda.component';
import { CanDirective } from '../../../directives/can.directive';
import { TranslatePipe } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TodayPaymentComponent } from '../today-payment/today-payment/today-payment.component';
import { CashPositionComponent } from '../cash-position/cash-position.component';
import { DashboardReimbursementComponent } from '../dashboard-reimbursement/dashboard-reimbursement.component';
import { ProjectMarginComponent } from '../project-margin/project-margin.component';

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
    ProjectMarginComponent,
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
  /*
   * Komponen ini TIDAK mengambil data apa pun.
   *
   * Sebelumnya ada `fetchDashboardData()` yang memanggil `GET /dashboard` —
   * rute yang tidak pernah ada di server. Metode itu juga tidak pernah
   * dipanggil dan tidak berlangganan hasilnya, sehingga permintaannya tidak
   * pernah terkirim sama sekali.
   *
   * Setiap kartu mengambil datanya masing-masing: pembayaran hari ini dari
   * `calendar/daily`, agenda dari `agenda`, posisi kas dari
   * `dashboard/cash-position`, dan reimbursement dari `reimbursements`.
   * Pembagian itu disengaja — satu kartu yang gagal tidak menjatuhkan
   * seluruh halaman.
   */
}
