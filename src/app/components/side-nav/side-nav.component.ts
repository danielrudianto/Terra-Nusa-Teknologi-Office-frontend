import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-side-nav',
  templateUrl: './side-nav.component.html',
  styleUrls: ['./side-nav.component.scss'],
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
          icon: 'calendar_today',
          route: '/Calendar',
          routerLinkOptions: {
            exact: false,
          },
        },
        {
          name: 'Purchase',
          icon: 'shopping_cart',
          route: '/Purchase',
          routerLinkOptions: {
            exact: false,
          },
        },
        {
          name: 'Reimbursement',
          icon: 'shopping_cart',
          route: '/Reimbursement',
          routerLinkOptions: {
            exact: false,
          },
        },
        {
          name: 'Supplier',
          icon: 'people',
          route: '/Supplier',
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
      ],
    },
  ];

  onItemClick(item: any) {
    if (item.hasOwnProperty('route')) {
      // navigate to route
      this.router.navigate([item.route]);
    }
  }
}
