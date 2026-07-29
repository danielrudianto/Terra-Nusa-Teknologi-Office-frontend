import { Component } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { trigger, transition, style, animate } from '@angular/animations';

interface MasterNavItem {
  name: string;
  route: string;
  icon: string;
  description: string;
}

@Component({
  selector: 'app-master',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
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
  navItems: MasterNavItem[] = [
    {
      name: 'Equipment',
      route: 'Equipment',
      icon: 'construction',
      description: 'Alat & mesin',
    },
    {
      name: 'Item',
      route: 'Item',
      icon: 'inventory_2',
      description: 'Katalog barang',
    },
    {
      name: 'Expense Opponent',
      route: 'Expense-opponent',
      icon: 'groups',
      description: 'Lawan transaksi biaya',
    },
    {
      name: 'Bank',
      route: 'Bank',
      icon: 'account_balance',
      description: 'Rekening bank',
    },
  ];

  // key unik per route -> animasi ter-trigger tiap ganti halaman
  getRouteState(outlet: RouterOutlet): string {
    return outlet?.isActivated
      ? outlet.activatedRoute?.snapshot?.routeConfig?.path || 'root'
      : 'empty';
  }
}
