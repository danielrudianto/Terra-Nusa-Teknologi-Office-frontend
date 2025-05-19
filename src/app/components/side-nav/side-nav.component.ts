import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-side-nav',
  templateUrl: './side-nav.component.html',
  styleUrls: ['./side-nav.component.scss'],
})
export class SideNavComponent {
  constructor(
    private router: Router
  ){}

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
        },
        {
          name: 'Calendar',
          icon: 'calendar_today',
          route: '/Calendar',
        },
        {
          name: 'Purchase',
          icon: 'shopping_cart',
          route: '/Purchase',
        },
        {
          name: 'Reimbursement',
          icon: 'shopping_cart',
          route: '/Reimbursement',
        },
        {
          name: 'Supplier',
          icon: 'people',
          route: '/Supplier',
        },
      ],
    },
    {
      name: "General",
      children: [
        {
          name: 'Settings',
          icon: 'settings',
          route: '/Settings',
        },
      ],
    }
  ];

  onItemClick(item: any){
    console.log(item);
    if(item.hasOwnProperty('route')){
      // navigate to route
      this.router.navigate([item.route]);
    }
  }
}
