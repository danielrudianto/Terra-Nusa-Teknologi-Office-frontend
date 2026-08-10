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
  constructor(
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  isSidenavigationOpened: boolean = true;
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
        }),
      )
      .subscribe((route: ActivatedRoute) => {
        this.label = route.snapshot.data['title'];
      });
  }

  sideNavItems = [
    {
      name: 'nav.menu',
      children: [
        {
          name: 'nav.purchaseDraft',
          icon: 'purchase-invoice.svg',
          route: '/Purchase-draft',
        },
        {
          name: 'nav.purchaseOrder',
          icon: 'purchase-order.svg',
          route: '/Purchase-order',
        },
        {
          name: 'nav.income',
          icon: 'income.svg',
          route: '/Income',
        },
        {
          name: 'nav.salesInvoice',
          icon: 'sales-invoice.svg',
          route: '/Sales-invoice',
        },
        {
          name: 'nav.interPayment',
          icon: 'transfer.svg',
          route: '/Interpayment',
        },
        {
          name: 'nav.salarySlip',
          icon: 'salary-slip.svg',
          route: '/Salary-slip',
        },
      ],
    },
    {
      name: 'nav.master',
      children: [
        {
          name: 'nav.masterData',
          icon: 'package.svg',
          route: '/Master',
        },
        {
          name: 'nav.asset',
          icon: 'asset.svg',
          route: '/Asset',
        },
      ],
    },
    {
      name: 'nav.administrator',
      children: [
        {
          name: 'nav.loans',
          icon: 'loan.svg',
          route: '/Loans',
        },
        {
          name: 'nav.taxing',
          icon: 'tax.svg',
          route: '/Taxing',
        },
        {
          name: 'nav.user',
          icon: 'user.svg',
          route: '/User',
        },
      ],
    },

    {
      name: 'nav.implementations',
      children: [
        {
          name: 'nav.bank',
          icon: 'payment-method.svg',
          route: '/Bank',
        },
        {
          name: 'nav.calendar',
          icon: 'calendar.svg',
          route: '/Calendar',
        },
        {
          name: 'nav.payment',
          icon: 'payment-method.svg',
          route: '/Payment',
        },
        {
          name: 'nav.purchase',
          icon: 'purchase-invoice.svg',
          route: '/Purchase',
        },
        {
          name: 'nav.reimbursement',
          icon: 'reimbursement.svg',
          route: '/Reimbursement',
        },
        {
          name: 'nav.expense',
          icon: 'expense.svg',
          route: '/Expense',
        },
      ],
    },
    {
      name: 'nav.general',
      children: [
        {
          name: 'nav.settings',
          icon: 'setting.svg',
          route: '/Settings',
        },
        {
          name: 'nav.activity',
          icon: 'activity.svg',
          route: '/Activity',
        },
        {
          name: 'nav.logout',
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
