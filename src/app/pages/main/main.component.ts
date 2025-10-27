import { Component } from '@angular/core';
import { SideNavComponent } from '../../components/side-nav/side-nav.component';
import { MatSidenavModule } from '@angular/material/sidenav';
import { TopNavigationComponent } from '../../components/top-navigation/top-navigation.component';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterModule,
} from '@angular/router';
import { filter, map } from 'rxjs';

@Component({
  selector: 'app-main',
  imports: [
    MatSidenavModule,
    TopNavigationComponent,
    SideNavComponent,
    RouterModule,
  ],
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
  standalone: true,
})
export class MainComponent {
  constructor(private router: Router, private route: ActivatedRoute) {}

  label: string = '';

  ngOnInit(): void {
    this.label = this.route.snapshot.firstChild!.data['title'];
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        map(() => {
          // Get the activated route
          let child = this.route.firstChild;
          while (child) {
            if (child.firstChild) {
              child = child.firstChild;
            } else {
              return child;
            }
          }
          return child || this.route;
        })
      )
      .subscribe((route: ActivatedRoute) => {
        this.label = route.snapshot.data['title'];
      });
  }

  sideNavItems = [
    {
      name: 'Menu',
      children: [
        {
          name: 'Dashboard',
          icon: 'dashboard.svg',
          route: '/',
        },
        {
          name: 'Calendar',
          icon: 'calendar.svg',
          route: '/Calendar',
        },
        {
          name: 'Payment',
          icon: 'payment-method.svg',
          route: '/Payment',
        },
        {
          name: 'Purchase',
          icon: 'purchase-invoice.svg',
          route: '/Purchase',
        },
        {
          name: 'Purchase Draft',
          icon: 'purchase-invoice.svg',
          route: '/Purchase-draft',
        },
        {
          name: 'Purchase Order',
          icon: 'purchase-order.svg',
          route: '/Purchase-order',
        },
        {
          name: 'Reimbursement',
          icon: 'reimbursement.svg',
          route: '/Reimbursement',
        },
        {
          name: 'Expense',
          icon: 'expense.svg',
          route: '/Expense',
        },
        {
          name: 'Income',
          icon: 'income.svg',
          route: '/Income',
        },
        {
          name: 'Sales invoice',
          icon: 'sales-invoice.svg',
          route: '/Sales-invoice',
        },
        {
          name: 'Inter-payment',
          icon: 'transfer.svg',
          route: '/Interpayment',
        },
        {
          name: 'Salary Slip',
          icon: 'salary-slip.svg',
          route: '/Salary-slip',
        },
      ],
    },
    {
      name: 'Master',
      children: [
        {
          name: 'Supplier',
          icon: 'supplier.svg',
          route: '/Supplier',
        },
        {
          name: 'Bank',
          icon: 'company.svg',
          route: '/Bank',
        },
        {
          name: 'Employee',
          icon: 'user.svg',
          route: '/Employee',
        },
        {
          name: 'Client',
          icon: 'customer.svg',
          route: '/Client',
        },
        {
          name: 'Asset',
          icon: 'asset.svg',
          route: '/Asset',
        },
      ],
    },
    {
      name: 'Administrator',
      children: [
        {
          name: 'Loans',
          icon: 'loan.svg',
          route: '/Loans',
        },
        {
          name: 'Taxing',
          icon: 'tax.svg',
          route: '/Taxing',
        },
      ],
    },
    {
      name: 'General',
      children: [
        {
          name: 'Settings',
          icon: 'setting.svg',
          route: '/Settings',
        },
        {
          name: 'Logout',
          icon: 'logout.svg',
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
}
