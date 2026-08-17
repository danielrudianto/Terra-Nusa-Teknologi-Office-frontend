import { Component, inject } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { trigger, transition, style, animate } from '@angular/animations';
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
  imports: [CommonModule, RouterModule, MatIconModule, TranslatePipe],
  templateUrl: './master.component.html',
  styleUrl: './master.component.scss',
  animations: [
    trigger('routeFade', [
      transition('* => *', [
        style({ opacity: 0, transform: 'translateY(8px)' }),
        animate(
          '260ms cubic-bezier(0.22, 1, 0.36, 1)',
          style({ opacity: 1, transform: 'translateY(0)' }),
        ),
      ]),
    ]),
  ],
})
export class MasterComponent {
  constructor(private translate: TranslateService) {}

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
    {
      // Bank soal ujian rekrutmen.
      //
      // Ditaruh di sini bersama data karyawan, bukan di menu tersendiri:
      // yang membukanya orang yang sama, dan modulnya sama-sama hanya
      // terbuka bagi HRD.
      name: 'masterNav.hrQuestion',
      route: 'HrQuestion',
      modul: 'hr_recruitment',
      icon: 'quiz',
      description: 'masterNav.hrQuestionDesc',
    },
    {
      name: 'masterNav.hrCandidate',
      route: 'HrCandidate',
      modul: 'hr_recruitment',
      icon: 'how_to_reg',
      description: 'masterNav.hrCandidateDesc',
    },
  ];

  // key unik per route -> animasi ter-trigger tiap ganti halaman
  getRouteState(outlet: RouterOutlet): string {
    return outlet?.isActivated
      ? outlet.activatedRoute?.snapshot?.routeConfig?.path || 'root'
      : 'empty';
  }
}
