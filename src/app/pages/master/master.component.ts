import { Component, computed, inject } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TransisiHalamanDirective } from '../../animations/transisi-halaman.directive';
import { SettingsService } from '../../services/setting.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { PermissionService } from '../../services/permission.service';

interface MasterNavItem {
  /**
   * Modul izin yang menentukan boleh tidaknya menu ini dibuka.
   *
   * Dipakai untuk MENONAKTIFKAN, bukan menyembunyikan: yang tidak punya
   * akses tetap perlu tahu bahwa halamannya ada — supaya ia meminta akses
   * kepada yang berwenang alih-alih mengira sistemnya kurang lengkap.
   */
  modul: string;
  name: string;
  route: string;
  icon: string;
  description: string;
}

@Component({
  selector: 'app-master',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    TranslatePipe,
    TransisiHalamanDirective,
  ],
  templateUrl: './master.component.html',
  styleUrl: './master.component.scss',
  /*
   * TIDAK ada `animations: [...]` lagi.
   *
   * Pemicu animasi Angular yang terpasang pada INDUK `<router-outlet>`
   * menunda pembuangan simpul halaman lama selama animasinya berjalan —
   * itulah halaman yang terlihat bertumpuk, dan itu pula yang membuat
   * komponennya tidak pernah dihancurkan. Gerakannya sekarang dijalankan
   * `TransisiHalamanDirective` lewat Web Animations API, yang tidak tahu
   * apa-apa tentang penyisipan maupun pembuangan simpul.
   */
})
export class MasterComponent {
  constructor(private translate: TranslateService) {}

  private readonly settings = inject(SettingsService);

  /**
   * Setelan transisi yang BERLAKU.
   *
   * Dulu halaman ini hanya meminjam DURASINYA dan memakai gerakan tetap
   * `translateY(10px)`. Akibatnya jenis yang dipilih pengguna di Pengaturan —
   * morph, geser kiri, dan seterusnya — berlaku di seluruh aplikasi KECUALI
   * di dalam Data Master, tanpa ada yang menjelaskan kenapa.
   */
  readonly setelan = computed(() => this.settings.transisiParams());

  /**
   * Menu samping halaman master.
   *
   * `name` dan `description` berisi kunci terjemahan, bukan teks jadi —
   * templatenya sudah memakai pipe translate.
   */
  private readonly izin = inject(PermissionService);

  /**
   * Menu ini boleh dibuka oleh pengguna yang sedang masuk.
   *
   * Menu yang tidak boleh TETAP DITAMPILKAN, hanya dinonaktifkan. Kartu yang
   * hilang membuat orang mengira halamannya memang tidak ada; kartu yang
   * kelabu memberi tahu bahwa halamannya ada dan aksesnya yang kurang.
   */
  bolehBuka(item: MasterNavItem): boolean {
    return this.izin.canRead(item.modul);
  }

  navItems: MasterNavItem[] = [
    {
      name: 'masterNav.equipment',
      route: 'Equipment',
      modul: 'master_equipment',
      icon: 'construction',
      description: 'masterNav.equipmentDesc',
    },
    {
      name: 'masterNav.item',
      route: 'Item',
      modul: 'master_item',
      icon: 'inventory_2',
      description: 'masterNav.itemDesc',
    },
    {
      name: 'masterNav.expenseOpponent',
      route: 'Expense-opponent',
      modul: 'expense_opponent',
      icon: 'groups',
      description: 'masterNav.expenseOpponentDesc',
    },
    {
      name: 'masterNav.supplier',
      route: 'Supplier',
      modul: 'supplier',
      icon: 'local_shipping',
      description: 'masterNav.supplierDesc',
    },
    {
      name: 'masterNav.client',
      route: 'Client',
      modul: 'client',
      icon: 'handshake',
      description: 'masterNav.clientDesc',
    },
    {
      name: 'masterNav.employee',
      route: 'Employee',
      modul: 'employees',
      icon: 'badge',
      description: 'masterNav.employeeDesc',
    },
  ];

  // key unik per route -> animasi ter-trigger tiap ganti halaman
  getRouteState(outlet: RouterOutlet): string {
    return outlet?.isActivated
      ? outlet.activatedRoute?.snapshot?.routeConfig?.path || 'root'
      : 'empty';
  }
}
