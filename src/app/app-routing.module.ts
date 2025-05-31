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
import { PurchaseUpdateStatusComponent } from './pages/purchase/purchase-update-status/purchase-update-status.component';
import { ExpenseComponent } from './pages/expense/expense.component';
import { ExpenseListComponent } from './pages/expense/expense-list/expense-list.component';
import { ExpenseCreateComponent } from './pages/expense/expense-create/expense-create.component';
import { LoansComponent } from './pages/loans/loans.component';
import { LoansListComponent } from './pages/loans/loans-list/loans-list.component';
import { LoansCreateComponent } from './pages/loans/loans-create/loans-create.component';
import { EmployeeComponent } from './pages/employee/employee.component';
import { EmployeeListComponent } from './pages/employee/employee-list/employee-list.component';
import { EmployeeCreateComponent } from './pages/employee/employee-create/employee-create.component';
import { ExpenseOpponentComponent } from './pages/expense/expense-opponent/expense-opponent.component';
import { ExpenseOpponentListComponent } from './pages/expense/expense-opponent/expense-opponent-list/expense-opponent-list.component';
import { ExpenseOpponentCreateComponent } from './pages/expense/expense-opponent/expense-opponent-create/expense-opponent-create.component';
import { authGuard } from './guards/auth.guard';
import { SalesInvoiceComponent } from './pages/sales-invoice/sales-invoice.component';
import { SalesInvoiceListComponent } from './pages/sales-invoice/sales-invoice-list/sales-invoice-list.component';
import { SalesInvoiceCreateComponent } from './pages/sales-invoice/sales-invoice-create/sales-invoice-create.component';
import { ClientComponent } from './pages/client/client.component';
import { ClientListComponent } from './pages/client/client-list/client-list.component';
import { ClientCreateComponent } from './pages/client/client-create/client-create.component';
import { SupplierUpdateComponent } from './pages/supplier/supplier-update/supplier-update.component';

export const routes: Routes = [
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
          {
            path: 'Status/:id',
            component: PurchaseUpdateStatusComponent,
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
          {
            path: 'Update/:id',
            component: SupplierUpdateComponent,
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
      {
        path: 'Expense',
        component: ExpenseComponent,
        children: [
          {
            path: '',
            component: ExpenseListComponent,
          },
          {
            path: 'Create',
            component: ExpenseCreateComponent,
          },
          {
            path: 'Opponent',
            component: ExpenseOpponentComponent,
            children: [
              {
                path: '',
                component: ExpenseOpponentListComponent,
              },
              {
                path: 'Create',
                component: ExpenseOpponentCreateComponent,
              },
            ],
          },
        ],
      },
      {
        path: 'Loans',
        component: LoansComponent,
        children: [
          {
            path: '',
            component: LoansListComponent,
          },
          {
            path: 'Create',
            component: LoansCreateComponent,
          },
        ],
      },
      {
        path: 'Sales-invoice',
        component: SalesInvoiceComponent,
        children: [
          {
            path: '',
            component: SalesInvoiceListComponent,
          },
          {
            path: 'Create',
            component: SalesInvoiceCreateComponent,
          },
        ],
      },
      {
        path: 'Employee',
        component: EmployeeComponent,
        children: [
          {
            path: '',
            component: EmployeeListComponent,
          },
          {
            path: 'Create',
            component: EmployeeCreateComponent,
          },
        ],
      },
      {
        path: 'Client',
        component: ClientComponent,
        children: [
          {
            path: '',
            component: ClientListComponent,
          },
          {
            path: 'Create',
            component: ClientCreateComponent,
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
