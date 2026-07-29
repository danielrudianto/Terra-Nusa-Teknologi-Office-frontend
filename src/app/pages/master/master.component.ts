import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

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
}
