import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AccountService } from '../../../services/account.service';
import { HitungNaikDirective } from '../../../directives/hitung-naik.directive';
import { MejaAntreanComponent } from '../meja/meja-antrean.component';
import { MejaTenggatComponent } from '../meja/meja-tenggat.component';
import { DIVISI, RUTE_TAHAP, RUTE_TENGGAT, RingkasanAntrean } from '../meja/meja';
import { MunculGulirDirective } from '../../../directives/muncul-gulir.directive';
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
    MatIconModule,
    HitungNaikDirective,
    MejaAntreanComponent,
    MejaTenggatComponent,
    MunculGulirDirective,
  ],
})
export class DashboardBodyComponent {

  private readonly permission = inject(PermissionService);
  private readonly akun = inject(AccountService);

  readonly hariIni = new Date();

  /** Ringkasan dari kartu antrean & tenggat, untuk petak angka di puncak. */
  readonly ringkasAntrean = signal<RingkasanAntrean | null>(null);
  readonly ringkasTenggat = signal<{ jumlah: number; lewat: number; lewatJenis: string | null } | null>(null);

  /** Halaman tahap yang memegang dokumen tertua; papan lengkap bila tidak ada. */
  readonly ruteTertahan = computed(() => {
    const k = this.ringkasAntrean()?.tertuaKode;
    return (k && RUTE_TAHAP[k]) || '/Laporan/Status-keuangan';
  });

  /** Halaman jenis tenggat terlewat yang tertua; kalender bila tidak ada. */
  readonly ruteTerlewat = computed(() => {
    const j = this.ringkasTenggat()?.lewatJenis;
    return (j && RUTE_TENGGAT[j]) || '/Calendar';
  });

  /** Gulir ke kartu di halaman ini, lalu sorot sebentar supaya terlihat. */
  gulirKe(el: HTMLElement): void {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.classList.remove('db-sorot');
    void el.offsetWidth;
    el.classList.add('db-sorot');
    setTimeout(() => el.classList.remove('db-sorot'), 1600);
  }

  get namaDepan(): string {
    return String(this.akun.displayName || '').trim().split(/\s+/)[0] || '';
  }

  /** Salam menurut jam setempat. */
  get salam(): string {
    const jam = new Date().getHours();
    if (jam < 11) return 'meja.salamPagi';
    if (jam < 15) return 'meja.salamSiang';
    if (jam < 18) return 'meja.salamSore';
    return 'meja.salamMalam';
  }

  get level(): number {
    return this.permission.level();
  }

  /** Divisi pengguna yang dikenal dasbor (konsultan tidak punya meja sendiri). */
  // `computed`, bukan getter: larik baru tiap putaran deteksi perubahan
  // pernah membekukan menu samping (lihat side-nav `hasilMaster`).
  readonly divisiSayaSig = computed(() => {
    const dikenal = new Set(DIVISI.map((d) => d.kode as string));
    return (this.permission.departments() ?? [])
      .map((d) => String(d).toLowerCase())
      .filter((d) => dikenal.has(d));
  });


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
