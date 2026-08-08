import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'Login',
    loadComponent: () =>
      import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    loadComponent: () =>
      import('./pages/main/main.component').then((m) => m.MainComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
        data: { title: 'Dashboard' },
      },
      {
        path: 'Engineering',
        loadComponent: () =>
          import('./pages/engineering/engineering.component').then(
            (m) => m.EngineeringComponent,
          ),
        data: { title: 'Engineering' },
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/engineering/engineering-dashboard/engineering-dashboard.component').then(
                (m) => m.EngineeringDashboardComponent,
              ),
          },
          {
            path: ':projectName',
            loadComponent: () =>
              import('./pages/engineering/engineering-project-view/engineering-project-view.component').then(
                (m) => m.EngineeringProjectViewComponent,
              ),
          },
        ],
      },
      {
        path: 'PDF',
        loadComponent: () =>
          import('./pages/pdf-main/pdf-main.component').then(
            (m) => m.PdfMainComponent,
          ),
        data: { title: 'PDF' },
      },
      {
        path: 'Invoice',
        loadComponent: () =>
          import('./pages/invoice/invoice.component').then(
            (m) => m.InvoiceComponent,
          ),
        data: { title: 'Invoice Generator' },
      },
      {
        path: 'Purchase',
        loadComponent: () =>
          import('./pages/purchase/purchase.component').then(
            (m) => m.PurchaseComponent,
          ),
        data: { title: 'Purchase' },
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/purchase/purchase-list/purchase-list.component').then(
                (m) => m.PurchaseListComponent,
              ),
            pathMatch: 'full',
            data: { title: 'Purchase' },
          },
          {
            path: 'Create',
            loadComponent: () =>
              import('./pages/purchase/purchase-create/purchase-create.component').then(
                (m) => m.PurchaseCreateComponent,
              ),
            data: { title: 'Purchase' },
          },
          {
            path: 'Status/:id',
            loadComponent: () =>
              import('./pages/purchase/purchase-update-status/purchase-update-status.component').then(
                (m) => m.PurchaseUpdateStatusComponent,
              ),
            data: { title: 'Purchase' },
          },
          {
            path: 'Project/:projectName',
            loadComponent: () =>
              import('./pages/purchase/purchase-report-project-report/purchase-report-project-report.component').then(
                (m) => m.PurchaseReportProjectReportComponent,
              ),
            data: { title: 'Purchase' },
          },
        ],
      },
      {
        path: 'Purchase-draft',
        loadComponent: () =>
          import('./pages/purchase-draft/purchase-draft.component').then(
            (m) => m.PurchaseDraftComponent,
          ),
        data: { title: 'Purchase draft' },
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/purchase-draft/purchase-draft-list/purchase-draft-list.component').then(
                (m) => m.PurchaseDraftListComponent,
              ),
            pathMatch: 'full',
            data: { title: 'Purchase draft' },
          },
          {
            path: 'Create',
            loadComponent: () =>
              import('./pages/purchase-draft/purchase-draft-create/purchase-draft-create.component').then(
                (m) => m.PurchaseDraftCreateComponent,
              ),
            data: { title: 'Purchase draft' },
          },
          {
            path: 'Update/:id',
            loadComponent: () =>
              import('./pages/purchase-draft/purchase-draft-convert/purchase-draft-convert.component').then(
                (m) => m.PurchaseDraftConvertComponent,
              ),
            data: { title: 'Purchase draft' },
          },
        ],
      },
      {
        path: 'Purchase-order',
        loadComponent: () =>
          import('./pages/purchase-order/purchase-order.component').then(
            (m) => m.PurchaseOrderComponent,
          ),
        data: { title: 'Purchase order' },
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/purchase-order/purchase-order-list/purchase-order-list.component').then(
                (m) => m.PurchaseOrderListComponent,
              ),
            data: { title: 'Purchase order' },
          },
          {
            path: 'Create',
            loadComponent: () =>
              import('./pages/purchase-order/purchase-order-create/purchase-order-create.component').then(
                (m) => m.PurchaseOrderCreateComponent,
              ),
            data: { title: 'Purchase order' },
          },
          {
            path: 'Create/G',
            loadComponent: () =>
              import('./pages/purchase-order/purchase-order-create/purchase-order-create-g/purchase-order-create-g.component').then(
                (m) => m.PurchaseOrderCreateGComponent,
              ),
            data: { title: 'Purchase order' },
          },
          {
            path: 'Create/511',
            loadComponent: () =>
              import('./pages/purchase-order/purchase-order-create/purchase-order-create-511/purchase-order-create-511.component').then(
                (m) => m.PurchaseOrderCreate511Component,
              ),
            data: { title: 'Purchase order' },
          },
          {
            path: 'Create/512',
            loadComponent: () =>
              import('./pages/purchase-order/purchase-order-create/purchase-order-create-512/purchase-order-create-512.component').then(
                (m) => m.PurchaseOrderCreate512Component,
              ),
            data: { title: 'Purchase order' },
          },
          {
            path: 'Create/516',
            loadComponent: () =>
              import('./pages/purchase-order/purchase-order-create/purchase-order-create-516/purchase-order-create-516.component').then(
                (m) => m.PurchaseOrderCreate516Component,
              ),
            data: { title: 'Purchase order' },
          },
          {
            path: 'Create/5112',
            loadComponent: () =>
              import('./pages/purchase-order/purchase-order-create/purchase-order-create-5112/purchase-order-create-5112.component').then(
                (m) => m.PurchaseOrderCreate5112Component,
              ),
            data: { title: 'Purchase order' },
          },
          {
            path: 'Create/631',
            loadComponent: () =>
              import('./pages/purchase-order/purchase-order-create/purchase-order-create-63/purchase-order-create-63.component').then(
                (m) => m.PurchaseOrderCreate63Component,
              ),
            data: { title: 'Purchase order', purchaseType: '6.3.1' },
          },
          {
            path: 'Create/632',
            loadComponent: () =>
              import('./pages/purchase-order/purchase-order-create/purchase-order-create-63/purchase-order-create-63.component').then(
                (m) => m.PurchaseOrderCreate63Component,
              ),
            data: { title: 'Purchase order', purchaseType: '6.3.2' },
          },
          {
            path: 'Create/641',
            loadComponent: () =>
              import('./pages/purchase-order/purchase-order-create/purchase-order-create-63/purchase-order-create-63.component').then(
                (m) => m.PurchaseOrderCreate63Component,
              ),
            data: { title: 'Purchase order', purchaseType: '6.4.1' },
          },
          {
            path: 'Create/A',
            loadComponent: () =>
              import('./pages/purchase-order/purchase-order-create/purchase-order-create-a/purchase-order-create-a.component').then(
                (m) => m.PurchaseOrderCreateAComponent,
              ),
            data: { title: 'Purchase order' },
          },
          {
            path: 'Create/B',
            loadComponent: () =>
              import('./pages/purchase-order/purchase-order-create/purchase-order-create-b/purchase-order-create-b.component').then(
                (m) => m.PurchaseOrderCreateBComponent,
              ),
            data: { title: 'Purchase order' },
          },
          {
            path: 'Create/C',
            loadComponent: () =>
              import('./pages/purchase-order/purchase-order-create/purchase-order-create-c/purchase-order-create-c.component').then(
                (m) => m.PurchaseOrderCreateCComponent,
              ),
            data: { title: 'Purchase order' },
          },
          {
            path: 'Create/D',
            loadComponent: () =>
              import('./pages/purchase-order/purchase-order-create/purchase-order-create-d/purchase-order-create-d.component').then(
                (m) => m.PurchaseOrderCreateDComponent,
              ),
            data: { title: 'Purchase order' },
          },
          {
            path: 'Create/F',
            loadComponent: () =>
              import('./pages/purchase-order/purchase-order-create/purchase-order-create-f/purchase-order-create-f.component').then(
                (m) => m.PurchaseOrderCreateFComponent,
              ),
            data: { title: 'Purchase order' },
          },
        ],
      },
      {
        path: 'Reimbursement',
        loadComponent: () =>
          import('./pages/reimbursement/reimbursement.component').then(
            (m) => m.ReimbursementComponent,
          ),
        data: { title: 'Reimbursement' },
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/reimbursement/reimbursement-list/reimbursement-list.component').then(
                (m) => m.ReimbursementListComponent,
              ),
            data: { title: 'Reimbursement' },
          },
          {
            path: 'Create',
            loadComponent: () =>
              import('./pages/reimbursement/reimbursement-create/reimbursement-create.component').then(
                (m) => m.ReimbursementCreateComponent,
              ),
            data: { title: 'Reimbursement' },
          },
        ],
      },
      {
        path: 'Supplier',
        loadComponent: () =>
          import('./pages/supplier/supplier.component').then(
            (m) => m.SupplierComponent,
          ),
        data: { title: 'Supplier' },
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/supplier/supplier-list/supplier-list.component').then(
                (m) => m.SupplierListComponent,
              ),
            data: { title: 'Supplier' },
          },
          {
            path: 'Create',
            loadComponent: () =>
              import('./pages/supplier/supplier-create/supplier-create.component').then(
                (m) => m.SupplierCreateComponent,
              ),
            data: { title: 'Supplier' },
          },
          {
            path: 'Update/:id',
            loadComponent: () =>
              import('./pages/supplier/supplier-update/supplier-update.component').then(
                (m) => m.SupplierUpdateComponent,
              ),
            data: { title: 'Supplier' },
          },
        ],
      },
      {
        path: 'Bank',
        loadComponent: () =>
          import('./pages/bank/bank.component').then((m) => m.BankComponent),
        data: { title: 'Bank' },
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/bank/bank-list/bank-list.component').then(
                (m) => m.BankListComponent,
              ),
            data: { title: 'Bank' },
          },
          {
            path: 'Create',
            loadComponent: () =>
              import('./pages/bank/bank-create/bank-create.component').then(
                (m) => m.BankCreateComponent,
              ),
            data: { title: 'Bank' },
          },
          {
            path: 'Mutation/:id',
            loadComponent: () =>
              import('./pages/bank/bank-mutation/bank-mutation.component').then(
                (m) => m.BankMutationComponent,
              ),
            data: { title: 'Bank' },
          },
        ],
      },
      {
        path: 'Asset',
        loadComponent: () =>
          import('./pages/asset/asset.component').then((m) => m.AssetComponent),
        data: { title: 'Asset' },
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/asset/asset-list/asset-list.component').then(
                (m) => m.AssetListComponent,
              ),
            data: { title: 'Asset' },
          },
          {
            path: 'Create',
            loadComponent: () =>
              import('./pages/asset/asset-create/asset-create.component').then(
                (m) => m.AssetCreateComponent,
              ),
            data: { title: 'Asset' },
          },
        ],
      },
      {
        path: 'Expense',
        loadComponent: () =>
          import('./pages/expense/expense.component').then(
            (m) => m.ExpenseComponent,
          ),
        data: { title: 'Expense' },
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/expense/expense-list/expense-list.component').then(
                (m) => m.ExpenseListComponent,
              ),
            data: { title: 'Expense' },
          },
          {
            path: 'Create',
            loadComponent: () =>
              import('./pages/expense/expense-create/expense-create.component').then(
                (m) => m.ExpenseCreateComponent,
              ),
            data: { title: 'Expense' },
          },
          {
            path: 'Opponent',
            loadComponent: () =>
              import('./pages/expense/expense-opponent/expense-opponent.component').then(
                (m) => m.ExpenseOpponentComponent,
              ),
            data: { title: 'Expense' },
            children: [
              {
                path: '',
                loadComponent: () =>
                  import('./pages/expense/expense-opponent/expense-opponent-list/expense-opponent-list.component').then(
                    (m) => m.ExpenseOpponentListComponent,
                  ),
                data: { title: 'Expense' },
              },
              {
                path: 'Create',
                loadComponent: () =>
                  import('./pages/expense/expense-opponent/expense-opponent-create/expense-opponent-create.component').then(
                    (m) => m.ExpenseOpponentCreateComponent,
                  ),
                data: { title: 'Expense' },
              },
            ],
          },
        ],
      },
      {
        path: 'Income',
        loadComponent: () =>
          import('./pages/income/income.component').then(
            (m) => m.IncomeComponent,
          ),
        data: { title: 'Income' },
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/income/income-list/income-list.component').then(
                (m) => m.IncomeListComponent,
              ),
          },
          {
            path: 'Create',
            loadComponent: () =>
              import('./pages/income/income-create/income-create.component').then(
                (m) => m.IncomeCreateComponent,
              ),
          },
        ],
      },
      {
        path: 'Loans',
        loadComponent: () =>
          import('./pages/loans/loans.component').then((m) => m.LoansComponent),
        data: { title: 'Loans' },
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/loans/loans-list/loans-list.component').then(
                (m) => m.LoansListComponent,
              ),
          },
          {
            path: 'Create',
            loadComponent: () =>
              import('./pages/loans/loans-create/loans-create.component').then(
                (m) => m.LoansCreateComponent,
              ),
          },
        ],
      },
      {
        path: 'Sales-invoice',
        loadComponent: () =>
          import('./pages/sales-invoice/sales-invoice.component').then(
            (m) => m.SalesInvoiceComponent,
          ),
        data: { title: 'Sales invoice' },
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/sales-invoice/sales-invoice-list/sales-invoice-list.component').then(
                (m) => m.SalesInvoiceListComponent,
              ),
          },
          {
            path: 'Create',
            loadComponent: () =>
              import('./pages/sales-invoice/sales-invoice-create/sales-invoice-create.component').then(
                (m) => m.SalesInvoiceCreateComponent,
              ),
          },
        ],
      },
      {
        path: 'Employee',
        loadComponent: () =>
          import('./pages/employee/employee.component').then(
            (m) => m.EmployeeComponent,
          ),
        data: { title: 'Employee' },
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/employee/employee-list/employee-list.component').then(
                (m) => m.EmployeeListComponent,
              ),
          },
          {
            path: 'Create',
            loadComponent: () =>
              import('./pages/employee/employee-create/employee-create.component').then(
                (m) => m.EmployeeCreateComponent,
              ),
          },
        ],
      },
      {
        path: 'User',
        loadComponent: () =>
          import('./pages/user/user.component').then((m) => m.UserComponent),
        data: { title: 'User' },
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/user/user-list/user-list.component').then(
                (m) => m.UserListComponent,
              ),
          },
        ],
      },
      {
        path: 'Salary-slip',
        loadComponent: () =>
          import('./pages/salary-slip/salary-slip.component').then(
            (m) => m.SalarySlipComponent,
          ),
        data: { title: 'Salary slip' },
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/salary-slip/salary-slip-list/salary-slip-list.component').then(
                (m) => m.SalarySlipListComponent,
              ),
          },
          {
            path: 'Create',
            loadComponent: () =>
              import('./pages/salary-slip/salary-slip-create/salary-slip-create.component').then(
                (m) => m.SalarySlipCreateComponent,
              ),
          },
          {
            path: 'Create',
            redirectTo: '',
          },
        ],
      },
      {
        path: 'Client',
        loadComponent: () =>
          import('./pages/client/client.component').then(
            (m) => m.ClientComponent,
          ),
        data: { title: 'Client' },
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/client/client-list/client-list.component').then(
                (m) => m.ClientListComponent,
              ),
          },
          {
            path: 'Create',
            loadComponent: () =>
              import('./pages/client/client-create/client-create.component').then(
                (m) => m.ClientCreateComponent,
              ),
          },
        ],
      },
      {
        path: 'Calendar',
        loadComponent: () =>
          import('./pages/calendar/calendar.component').then(
            (m) => m.CalendarComponent,
          ),
        data: { title: 'Calendar' },
      },
      {
        path: 'Interpayment',
        loadComponent: () =>
          import('./pages/interpayment/interpayment.component').then(
            (m) => m.InterpaymentComponent,
          ),
        data: { title: 'Interpayment' },
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/interpayment/interpayment-list/interpayment-list.component').then(
                (m) => m.InterpaymentListComponent,
              ),
          },
          {
            path: 'Create',
            loadComponent: () =>
              import('./pages/interpayment/interpayment-create/interpayment-create.component').then(
                (m) => m.InterpaymentCreateComponent,
              ),
          },
        ],
      },
      {
        path: 'Payment',
        loadComponent: () =>
          import('./pages/payment/payment.component').then(
            (m) => m.PaymentComponent,
          ),
        data: { title: 'Payment' },
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/payment/payment-list/payment-list.component').then(
                (m) => m.PaymentListComponent,
              ),
            data: { title: 'Payment' },
          },
          {
            path: 'History',
            loadComponent: () =>
              import('./pages/payment/payment-history/payment-history.component').then(
                (m) => m.PaymentHistoryComponent,
              ),
            data: { title: 'Payment' },
          },
          {
            path: 'Approval',
            redirectTo: '',
          },
        ],
      },
      {
        path: 'Taxing',
        loadComponent: () =>
          import('./pages/taxing/taxing.component').then(
            (m) => m.TaxingComponent,
          ),
        data: { title: 'Taxing' },
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/taxing/tax-list/tax-list.component').then(
                (m) => m.TaxListComponent,
              ),
          },
          {
            path: 'PPN',
            loadComponent: () =>
              import('./pages/taxing/ppn-recap/ppn-recap.component').then(
                (m) => m.PpnRecapComponent,
              ),
          },
          {
            path: 'PPH',
            loadComponent: () =>
              import('./pages/taxing/pph-recap/pph-recap.component').then(
                (m) => m.PphRecapComponent,
              ),
          },
        ],
      },
      {
        path: 'Master',
        loadComponent: () =>
          import('./pages/master/master.component').then(
            (m) => m.MasterComponent,
          ),
        data: { title: 'Master Data' },
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/master/master-welcome/master-welcome.component').then(
                (m) => m.MasterWelcomeComponent,
              ),
            pathMatch: 'full',
            data: { title: 'Master Data' },
          },
          {
            path: 'Equipment',
            loadComponent: () =>
              import('./pages/master/master-equipment/master-equipment-list/master-equipment-list.component').then(
                (m) => m.MasterEquipmentListComponent,
              ),
            data: { title: 'Master Data' },
          },
          {
            path: 'Item',
            loadComponent: () =>
              import('./pages/master/master-item/master-item-list/master-item-list.component').then(
                (m) => m.MasterItemListComponent,
              ),
            data: { title: 'Master Data' },
          },
          {
            path: 'Expense-opponent',
            loadComponent: () =>
              import('./pages/expense/expense-opponent/expense-opponent-list/expense-opponent-list.component').then(
                (m) => m.ExpenseOpponentListComponent,
              ),
            data: { title: 'Master Data' },
          },
          {
            path: 'Supplier',
            loadComponent: () =>
              import('./pages/supplier/supplier-list/supplier-list.component').then(
                (m) => m.SupplierListComponent,
              ),
            data: { title: 'Master Data' },
          },
          {
            path: 'Client',
            loadComponent: () =>
              import('./pages/client/client-list/client-list.component').then(
                (m) => m.ClientListComponent,
              ),
            data: { title: 'Master Data' },
          },
          {
            path: 'Employee',
            loadComponent: () =>
              import('./pages/employee/employee-list/employee-list.component').then(
                (m) => m.EmployeeListComponent,
              ),
            data: { title: 'Master Data' },
          },
        ],
      },
      {
        path: 'Settings',
        loadComponent: () =>
          import('./pages/settings/settings.component').then(
            (m) => m.SettingsComponent,
          ),
        data: { title: 'Settings' },
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
