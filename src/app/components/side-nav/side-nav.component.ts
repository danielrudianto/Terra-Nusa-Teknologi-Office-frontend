import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-side-nav',
  templateUrl: './side-nav.component.html',
  styleUrls: ['./side-nav.component.scss'],
  standalone: false,
})
export class SideNavComponent {
  constructor(private router: Router) {}

  // get version from appVersion
  buildStatus: string = 'Alpha';
  version: string = '1.0.0';
  releaseDate: Date = new Date('2025-05-15');

  sideNavItems = [
    {
      name: 'Menu',
      children: [
        {
          name: 'Dashboard',
          icon: 'dashboard',
          route: '/',
          routerLinkOptions: {
            exact: true,
          },
        },
        {
          name: 'Calendar',
          icon: 'calendar_month',
          route: '/Calendar',
          routerLinkOptions: {
            exact: false,
          },
        },
        {
          name: 'Purchase',
          icon: 'description',
          route: '/Purchase',
          routerLinkOptions: {
            exact: false,
          },
        },
        {
          name: 'Reimbursement',
          icon: 'receipt_long',
          route: '/Reimbursement',
          routerLinkOptions: {
            exact: false,
          },
        },
        {
          name: 'Expense',
          icon: 'credit_card',
          route: '/Expense',
          routerLinkOptions: {
            exact: false,
          },
        },
        {
          name: 'Loans',
          icon: 'credit_score',
          route: '/Loans',
          routerLinkOptions: {
            exact: false,
          },
        },
        {
          name: 'Sales invoice',
          icon: 'receipt',
          route: '/Sales-invoice',
          routerLinkOptions: {
            exact: false,
          },
        },
      ],
    },
    {
      name: 'Master',
      children: [
        {
          name: 'Supplier',
          icon: 'people',
          route: '/Supplier',
          routerLinkOptions: {
            exact: false,
          },
        },
        {
          name: 'Bank',
          icon: 'people',
          route: '/Bank',
          routerLinkOptions: {
            exact: false,
          },
        },
        {
          name: 'Employee',
          icon: 'people',
          route: '/Employee',
          routerLinkOptions: {
            exact: false,
          },
        },
        {
          name: 'Client',
          icon: 'people',
          route: '/Client',
          routerLinkOptions: {
            exact: false,
          },
        },
      ],
    },
    {
      name: 'General',
      children: [
        {
          name: 'Settings',
          icon: 'settings',
          route: '/Settings',
          routerLinkOptions: {
            exact: true,
          },
        },
        {
          name: 'Logout',
          icon: 'logout',
          click: () => {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');

            this.router.navigate(['/Login']);
          },
          routerLinkOptions: {
            exact: true,
          },
        },
      ],
    },
  ];

  onItemClick(item: any) {
    if (item.hasOwnProperty('route')) {
      // navigate to route
      this.router.navigate([item.route]);
    } else {
      item.click();
    }
  }
}
