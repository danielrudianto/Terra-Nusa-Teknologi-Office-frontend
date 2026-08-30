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

  /**
   * Divisi yang berasal dari LUAR perusahaan.
   *
   * Ditulis sebagai daftar, bukan perbandingan tunggal: bila kelak ada
   * pihak luar kedua — auditor, misalnya — ia cukup ditambahkan di sini dan
   * seluruh yang bergantung padanya ikut berlaku. Satu perbandingan yang
   * disebar di beberapa tempat akan tertinggal di salah satunya.
   */
  private static readonly DIVISI_LUAR = ['konsultan'];

  /** Pengguna ini pihak luar perusahaan. */
  get pihakLuar(): boolean {
    return this.permission.inDepartment(
      ...DashboardBodyComponent.DIVISI_LUAR,
    );
  }

  /**
   * Boleh memakai alat dokumen (gabung & pisah PDF).
   *
   * Alat kerja internal, bukan bagian dari pekerjaan pihak luar. Ia tidak
   * membocorkan apa pun — tetapi menawarkan alat kantor kepada tamu membuat
   * dashboard-nya terbaca sebagai ruang kerjanya sendiri, padahal ia datang
   * untuk memeriksa beberapa angka lalu pergi.
   */
  get bolehPakaiAlatDokumen(): boolean {
    return !this.pihakLuar;
  }

  /**
   * Boleh melihat ikhtisar MARGIN proyek.
   *
   * Level 4 ke atas, dan sengaja BUKAN `project:read`: modul proyek terbuka
   * pada level 1 karena kodenya dipakai hampir setiap layar, sehingga izin
   * itu praktis berarti "semua orang". Yang dinyatakan kartu ini adalah
   * berapa yang diperoleh perusahaan atas tiap pekerjaan — angka pemilik
   * dan general manager, bukan angka yang dilewati sambil lalu.
   *
   * Rutenya di server menegakkan batas yang sama. Yang di sini hanya
   * menghindarkan kartu yang pasti gagal memuat.
   */
  get bolehLihatMargin(): boolean {
    return this.permission.level() >= 4;
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
