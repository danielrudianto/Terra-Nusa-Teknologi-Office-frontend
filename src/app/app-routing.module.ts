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
import { PdfMainComponent } from './pages/pdf-main/pdf-main.component';
import { PurchaseDraftConvertComponent } from './pages/purchase-draft/purchase-draft-convert/purchase-draft-convert.component';
import { PurchaseOrderComponent } from './pages/purchase-order/purchase-order.component';
import { PurchaseOrderListComponent } from './pages/purchase-order/purchase-order-list/purchase-order-list.component';
import { PurchaseOrderCreateComponent } from './pages/purchase-order/purchase-order-create/purchase-order-create.component';
import { PurchaseOrderCreateGComponent } from './pages/purchase-order/purchase-order-create/purchase-order-create-g/purchase-order-create-g.component';
import { PurchaseReportProjectComponent } from './pages/purchase/purchase-list/purchase-report-project/purchase-report-project.component';
import { PurchaseReportProjectReportComponent } from './pages/purchase/purchase-report-project-report/purchase-report-project-report.component';
import { InvoiceComponent } from './pages/invoice/invoice.component';
import { EngineeringComponent } from './pages/engineering/engineering.component';
import { EngineeringDashboardComponent } from './pages/engineering/engineering-dashboard/engineering-dashboard.component';
import { EngineeringProjectViewComponent } from './pages/engineering/engineering-project-view/engineering-project-view.component';
import { MasterItemListComponent } from './pages/master/master-item/master-item-list/master-item-list.component';

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
        data: {
          title: 'Dashboard',
        },
      },
      {
        path: 'Engineering',
        component: EngineeringComponent,
        data: {
          title: 'Engineering',
        },
        children: [
          {
            path: '',
            component: EngineeringDashboardComponent,
          },
          {
            path: ':projectName',
            component: EngineeringProjectViewComponent,
          },
        ],
      },
      {
        path: 'PDF',
        component: PdfMainComponent,
        data: {
          title: 'PDF',
        },
      },
      {
        path: 'Invoice',
        component: InvoiceComponent,
        data: {
          title: 'Invoice Generator',
        },
      },
      {
        path: 'Purchase',
        component: PurchaseComponent,
        data: {
          title: 'Purchase',
        },
        children: [
          {
            path: '',
            component: PurchaseListComponent,
            pathMatch: 'full',
            data: {
              title: 'Purchase',
            },
          },
          {
            path: 'Create',
            component: PurchaseCreateComponent,
            data: {
              title: 'Purchase',
            },
          },
          {
            path: 'Status/:id',
            component: PurchaseUpdateStatusComponent,
            data: {
              title: 'Purchase',
            },
          },
          {
            path: 'Project/:projectName',
            component: PurchaseReportProjectReportComponent,
            data: {
              title: 'Purchase',
            },
          },
        ],
      },
      {
        path: 'Purchase-draft',
        component: PurchaseDraftComponent,
        data: {
          title: 'Purchase draft',
        },
        children: [
          {
            path: '',
            component: PurchaseDraftListComponent,
            pathMatch: 'full',
            data: {
              title: 'Purchase draft',
            },
          },
          {
            path: 'Create',
            component: PurchaseDraftCreateComponent,
            data: {
              title: 'Purchase draft',
            },
          },
          {
            path: 'Update/:id',
            component: PurchaseDraftConvertComponent,
            data: {
              title: 'Purchase draft',
            },
          },
        ],
      },
      {
        path: 'Purchase-order',
        component: PurchaseOrderComponent,
        data: {
          title: 'Purchase order',
        },
        children: [
          {
            path: '',
            component: PurchaseOrderListComponent,
            data: {
              title: 'Purchase order',
            },
          },
          {
            path: 'Create',
            component: PurchaseOrderCreateComponent,
            data: {
              title: 'Purchase order',
            },
          },
          {
            path: 'Create/G',
            component: PurchaseOrderCreateGComponent,
            data: {
              title: 'Purchase order',
            },
          },
        ],
      },
      {
        path: 'Reimbursement',
        component: ReimbursementComponent,
        data: {
          title: 'Reimbursement',
        },
        children: [
          {
            path: '',
            component: ReimbursementListComponent,
            data: {
              title: 'Reimbursement',
            },
          },
          {
            path: 'Create',
            component: ReimbursementCreateComponent,
            data: {
              title: 'Reimbursement',
            },
          },
        ],
      },
      {
        path: 'Supplier',
        component: SupplierComponent,
        data: {
          title: 'Supplier',
        },
        children: [
          {
            path: '',
            component: SupplierListComponent,
            data: {
              title: 'Supplier',
            },
          },
          {
            path: 'Create',
            component: SupplierCreateComponent,
            data: {
              title: 'Supplier',
            },
          },
          {
            path: 'Update/:id',
            component: SupplierUpdateComponent,
            data: {
              title: 'Supplier',
            },
          },
        ],
      },
      {
        path: 'Bank',
        component: BankComponent,
        data: {
          title: 'Bank',
        },
        children: [
          {
            path: '',
            component: BankListComponent,
            data: {
              title: 'Bank',
            },
          },
          {
            path: 'Create',
            component: BankCreateComponent,
            data: {
              title: 'Bank',
            },
          },
          {
            path: 'Mutation/:id',
            component: BankMutationComponent,
            data: {
              title: 'Bank',
            },
          },
        ],
      },
      {
        path: 'Asset',
        component: AssetComponent,
        data: {
          title: 'Asset',
        },
        children: [
          {
            path: '',
            component: AssetListComponent,
            data: {
              title: 'Asset',
            },
          },
          {
            path: 'Create',
            component: AssetCreateComponent,
            data: {
              title: 'Asset',
            },
          },
        ],
      },
      {
        path: 'Expense',
        component: ExpenseComponent,
        data: {
          title: 'Expense',
        },
        children: [
          {
            path: '',
            component: ExpenseListComponent,
            data: {
              title: 'Expense',
            },
          },
          {
            path: 'Create',
            component: ExpenseCreateComponent,
            data: {
              title: 'Expense',
            },
          },
          {
            path: 'Opponent',
            component: ExpenseOpponentComponent,
            data: {
              title: 'Expense',
            },
            children: [
              {
                path: '',
                component: ExpenseOpponentListComponent,
                data: {
                  title: 'Expense',
                },
              },
              {
                path: 'Create',
                component: ExpenseOpponentCreateComponent,
                data: {
                  title: 'Expense',
                },
              },
            ],
          },
        ],
      },
      {
        path: 'Income',
        component: IncomeComponent,
        data: {
          title: 'Income',
        },
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
        data: {
          title: 'Loans',
        },
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
        data: {
          title: 'Sales invoice',
        },
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
        data: {
          title: 'Employee',
        },
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
        data: {
          title: 'Salary slip',
        },
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
        data: {
          title: 'Client',
        },
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
        data: {
          title: 'Calendar',
        },
      },
      {
        path: 'Interpayment',
        component: InterpaymentComponent,
        data: {
          title: 'Interpayment',
        },
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
        data: {
          title: 'Payment',
        },
        children: [
          {
            path: '',
            component: PaymentListComponent,
            data: {
              title: 'Payment',
            },
          },
          {
            path: 'History',
            component: PaymentHistoryComponent,
            data: {
              title: 'Payment',
            },
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
        data: {
          title: 'Taxing',
        },
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
        path: 'Item',
        component: MasterItemListComponent,
        data: {
          title: 'Item list',
        },
      },
      {
        path: 'Settings',
        component: SettingsComponent,
        data: {
          title: 'Settings',
        },
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
