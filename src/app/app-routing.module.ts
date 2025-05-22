import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { PurchaseComponent } from './pages/purchase/purchase.component';
import { SupplierComponent } from './pages/supplier/supplier.component';
import { MainComponent } from './pages/main/main.component';
import { PurchaseListComponent } from './pages/purchase/purchase-list/purchase-list.component';
import { PurchaseCreateComponent } from './pages/purchase/purchase-create/purchase-create.component';
import { SupplierListComponent } from './pages/supplier/supplier-list/supplier-list.component';
import { SupplierCreateComponent } from './pages/supplier/supplier-create/supplier-create.component';
import { ReimbursementComponent } from './pages/reimbursement/reimbursement.component';
import { ReimbursementListComponent } from './pages/reimbursement/reimbursement-list/reimbursement-list.component';
import { ReimbursementCreateComponent } from './pages/reimbursement/reimbursement-create/reimbursement-create.component';
import { BankComponent } from './pages/bank/bank.component';
import { BankListComponent } from './pages/bank/bank-list/bank-list.component';
import { BankCreateComponent } from './pages/bank/bank-create/bank-create.component';

const routes: Routes = [
  {
    path: 'Login',
    component: LoginComponent,
  },
  {
    path: '',
    component: MainComponent,
    children: [
      {
        path: '',
        component: DashboardComponent,
      },
      {
        path: 'Purchase',
        component: PurchaseComponent,
        children: [
          {
            path: '',
            component: PurchaseListComponent,
            pathMatch: 'full',
          },
          {
            path: 'Create',
            component: PurchaseCreateComponent,
          },
        ],
      },
      {
        path: 'Reimbursement',
        component: ReimbursementComponent,
        children: [
          {
            path: '',
            component: ReimbursementListComponent,
          },
          {
            path: 'Create',
            component: ReimbursementCreateComponent,
          },
        ],
      },
      {
        path: 'Supplier',
        component: SupplierComponent,
        children: [
          {
            path: '',
            component: SupplierListComponent,
          },
          {
            path: 'Create',
            component: SupplierCreateComponent,
          },
        ],
      },
      {
        path: 'Bank',
        component: BankComponent,
        children: [
          {
            path: '',
            component: BankListComponent,
          },
          {
            path: 'Create',
            component: BankCreateComponent,
          },
        ],
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
