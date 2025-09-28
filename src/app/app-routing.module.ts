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
import { SalarySlipComponent } from './pages/salary-slip/salary-slip.component';
import { SalarySlipListComponent } from './pages/salary-slip/salary-slip-list/salary-slip-list.component';
import { SalarySlipCreateComponent } from './pages/salary-slip/salary-slip-create/salary-slip-create.component';
import { CalendarComponent } from './pages/calendar/calendar.component';
import { PaymentComponent } from './pages/payment/payment.component';
import { PaymentListComponent } from './pages/payment/payment-list/payment-list.component';
import { PaymentHistoryComponent } from './pages/payment/payment-history/payment-history.component';
import { TaxingComponent } from './pages/taxing/taxing.component';
import { TaxListComponent } from './pages/taxing/tax-list/tax-list.component';
import { PpnRecapComponent } from './pages/taxing/ppn-recap/ppn-recap.component';
import { PphRecapComponent } from './pages/taxing/pph-recap/pph-recap.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { PaymentUpdateComponent } from './pages/payment/payment-update/payment-update.component';
import { InterpaymentComponent } from './pages/interpayment/interpayment.component';
import { IncomeComponent } from './pages/income/income.component';
import { IncomeListComponent } from './pages/income/income-list/income-list.component';
import { IncomeCreateComponent } from './pages/income/income-create/income-create.component';
import { InterpaymentListComponent } from './pages/interpayment/interpayment-list/interpayment-list.component';
import { InterpaymentCreateComponent } from './pages/interpayment/interpayment-create/interpayment-create.component';
import { BankMutationComponent } from './pages/bank/bank-mutation/bank-mutation.component';
import { AssetCreateComponent } from './pages/asset/asset-create/asset-create.component';
import { AssetComponent } from './pages/asset/asset.component';
import { AssetListComponent } from './pages/asset/asset-list/asset-list.component';
import { PurchaseDraftComponent } from './pages/purchase-draft/purchase-draft.component';
import { PurchaseDraftListComponent } from './pages/purchase-draft/purchase-draft-list/purchase-draft-list.component';
import { PurchaseDraftCreateComponent } from './pages/purchase-draft/purchase-draft-create/purchase-draft-create.component';
// import { PdfMainComponent } from './pages/pdf-main/pdf-main.component';
import { PurchaseDraftConvertComponent } from './pages/purchase-draft/purchase-draft-convert/purchase-draft-convert.component';

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
      // {
      //   path: 'PDF',
      //   component: PdfMainComponent,
      // },
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
        path: 'Purchase-draft',
        component: PurchaseDraftComponent,
        children: [
          {
            path: '',
            component: PurchaseDraftListComponent,
            pathMatch: 'full',
          },
          {
            path: 'Create',
            component: PurchaseDraftCreateComponent,
          },
          {
            path: 'Update/:id',
            component: PurchaseDraftConvertComponent,
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
          {
            path: 'Mutation/:id',
            component: BankMutationComponent,
          },
        ],
      },
      {
        path: 'Asset',
        component: AssetComponent,
        children: [
          {
            path: '',
            component: AssetListComponent,
          },
          {
            path: 'Create',
            component: AssetCreateComponent,
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
        path: 'Income',
        component: IncomeComponent,
        children: [
          {
            path: '',
            component: IncomeListComponent,
          },
          {
            path: 'Create',
            component: IncomeCreateComponent,
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
        path: 'Salary-slip',
        component: SalarySlipComponent,
        children: [
          {
            path: '',
            component: SalarySlipListComponent,
          },
          {
            path: 'Create',
            component: SalarySlipCreateComponent,
          },
          {
            path: 'Create',
            redirectTo: '',
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
      {
        path: 'Calendar',
        component: CalendarComponent,
      },
      {
        path: 'Interpayment',
        component: InterpaymentComponent,
        children: [
          {
            path: '',
            component: InterpaymentListComponent,
          },
          {
            path: 'Create',
            component: InterpaymentCreateComponent,
          },
        ],
      },
      {
        path: 'Payment',
        component: PaymentComponent,
        children: [
          {
            path: '',
            component: PaymentListComponent,
          },
          {
            path: 'History',
            component: PaymentHistoryComponent,
          },
          {
            path: 'Approval/:id',
            component: PaymentUpdateComponent,
          },
          {
            path: 'Approval',
            redirectTo: '',
          },
        ],
      },
      {
        path: 'Taxing',
        component: TaxingComponent,
        children: [
          {
            path: '',
            component: TaxListComponent,
          },
          {
            path: 'PPN',
            component: PpnRecapComponent,
          },
          {
            path: 'PPH',
            component: PphRecapComponent,
          },
        ],
      },
      {
        path: 'Settings',
        component: SettingsComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
