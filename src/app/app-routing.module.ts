import { NgModule } from '@angular/core';
import { authGuard } from './guards/auth.guard';
import { permissionGuard } from './guards/permission.guard';
import { RouterModule, Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'Login',
    loadComponent: () =>
      import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    /*
     * Seluruh halaman di dalam kerangka utama mensyaratkan sudah masuk.
     *
     * Dipasang di rute induk, bukan satu per satu: halaman baru otomatis
     * ikut terlindungi, sehingga tidak ada yang terlewat karena lupa
     * menambahkan penjaganya.
     */
    canActivate: [authGuard],
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
        canActivate: [permissionGuard],
        loadComponent: () =>
          import('./pages/invoice/invoice.component').then(
            (m) => m.InvoiceComponent,
          ),
        data: { title: 'Invoice Generator', permission: 'sales_invoice:read' },
      },
      {
        path: 'Purchase',
        canActivate: [permissionGuard],
        loadComponent: () =>
          import('./pages/purchase/purchase.component').then(
            (m) => m.PurchaseComponent,
          ),
        data: { title: 'Purchase', permission: 'purchase:read' , panduan: 'pembelian' },
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
        canActivate: [permissionGuard],
        loadComponent: () =>
          import('./pages/purchase-draft/purchase-draft.component').then(
            (m) => m.PurchaseDraftComponent,
          ),
        data: { title: 'Purchase draft', permission: 'purchase_draft:read' , panduan: 'draft-pembelian' },
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
        path: 'Activity',
        canActivate: [permissionGuard],
        loadComponent: () =>
          import('./pages/activity/activity.component').then(
            (m) => m.ActivityComponent,
          ),
        data: { title: 'Activity', permission: 'audit_log:read' },
      },
      {
        path: 'Purchase-order',
        canActivate: [permissionGuard],
        loadComponent: () =>
          import('./pages/purchase-order/purchase-order.component').then(
            (m) => m.PurchaseOrderComponent,
          ),
        data: { title: 'Purchase order', permission: 'purchase_order:read' },
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/purchase-order/purchase-order-list/purchase-order-list.component').then(
                (m) => m.PurchaseOrderListComponent,
              ),
            data: { title: 'Purchase order', panduan: 'purchase-order' },
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
            data: { title: 'Purchase order', panduan: 'purchase-order', panduanBagian: 'bagian-yang-sama-di-semua-jenis' },
          },
          {
            path: 'Create/H',
            loadComponent: () =>
              import('./pages/purchase-order/purchase-order-create/purchase-order-create-h/purchase-order-create-h.component').then(
                (m) => m.PurchaseOrderCreateHComponent,
              ),
            data: { title: 'Purchase order' },
          },
          {
            path: 'Create/511',
            loadComponent: () =>
              import('./pages/purchase-order/purchase-order-create/purchase-order-create-511/purchase-order-create-511.component').then(
                (m) => m.PurchaseOrderCreate511Component,
              ),
            data: { title: 'Purchase order', panduan: 'purchase-order', panduanBagian: 'bagian-yang-sama-di-semua-jenis' },
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
            data: { title: 'Purchase order', panduan: 'purchase-order', panduanBagian: 'bagian-yang-sama-di-semua-jenis' },
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
            path: 'Create/642',
            loadComponent: () =>
              import('./pages/purchase-order/purchase-order-create/purchase-order-create-642/purchase-order-create-642.component').then(
                (m) => m.PurchaseOrderCreate642Component,
              ),
            data: { title: 'Purchase order', purchaseType: '6.4.2' },
          },
          {
            path: 'Create/652',
            loadComponent: () =>
              import('./pages/purchase-order/purchase-order-create/purchase-order-create-652/purchase-order-create-652.component').then(
                (m) => m.PurchaseOrderCreate652Component,
              ),
            data: { title: 'Purchase order', purchaseType: '6.5.2' },
          },
          {
            path: 'Create/651',
            loadComponent: () =>
              import('./pages/purchase-order/purchase-order-create/purchase-order-create-651/purchase-order-create-651.component').then(
                (m) => m.PurchaseOrderCreate651Component,
              ),
            data: { title: 'Purchase order', purchaseType: '6.5.1' },
          },
          {
            path: 'Create/641',
            loadComponent: () =>
              import('./pages/purchase-order/purchase-order-create/purchase-order-create-641/purchase-order-create-641.component').then(
                (m) => m.PurchaseOrderCreate641Component,
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
            data: { title: 'Purchase order', panduan: 'purchase-order', panduanBagian: 'khusus-c-bahan-bakar' },
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
            data: { title: 'Purchase order', panduan: 'purchase-order', panduanBagian: 'khusus-f-material' },
          },
        ],
      },
      {
        path: 'Reimbursement',
        canActivate: [permissionGuard],
        loadComponent: () =>
          import('./pages/reimbursement/reimbursement.component').then(
            (m) => m.ReimbursementComponent,
          ),
        data: { title: 'Reimbursement', permission: 'reimbursement:read' , panduan: 'reimbursement' },
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
        path: 'Bank',
        canActivate: [permissionGuard],
        loadComponent: () =>
          import('./pages/bank/bank.component').then((m) => m.BankComponent),
        data: { title: 'Bank', permission: 'bank:read' },
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
        canActivate: [permissionGuard],
        loadComponent: () =>
          import('./pages/asset/asset.component').then((m) => m.AssetComponent),
        data: { title: 'Asset', permission: 'asset:read' },
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
        canActivate: [permissionGuard],
        loadComponent: () =>
          import('./pages/expense/expense.component').then(
            (m) => m.ExpenseComponent,
          ),
        data: { title: 'Expense', permission: 'expenses:read' , panduan: 'beban' },
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
            ],
          },
        ],
      },
      {
        path: 'Income',
        canActivate: [permissionGuard],
        loadComponent: () =>
          import('./pages/income/income.component').then(
            (m) => m.IncomeComponent,
          ),
        data: { title: 'Income', permission: 'income:read' , panduan: 'pendapatan-lain' },
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
        canActivate: [permissionGuard],
        loadComponent: () =>
          import('./pages/loans/loans.component').then((m) => m.LoansComponent),
        data: { title: 'Loans', permission: 'loan:read', panduan: 'pinjaman' },
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
        canActivate: [permissionGuard],
        loadComponent: () =>
          import('./pages/sales-invoice/sales-invoice.component').then(
            (m) => m.SalesInvoiceComponent,
          ),
        data: { title: 'Sales invoice', permission: 'sales_invoice:read' , panduan: 'faktur-penjualan' },
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
        path: 'User',
        canActivate: [permissionGuard],
        loadComponent: () =>
          import('./pages/user/user.component').then((m) => m.UserComponent),
        data: { title: 'User', permission: 'user:read' },
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
        canActivate: [permissionGuard],
        loadComponent: () =>
          import('./pages/salary-slip/salary-slip.component').then(
            (m) => m.SalarySlipComponent,
          ),
        data: { title: 'Salary slip', permission: 'salary_slip:read' },
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
        path: 'Calendar',
        // Kalender memuat jadwal pembayaran, bukan sekadar agenda — jadi
        // wilayahnya mengikuti pembayaran keluar, bukan dibiarkan terbuka.
        canActivate: [permissionGuard],
        loadComponent: () =>
          import('./pages/calendar/calendar.component').then(
            (m) => m.CalendarComponent,
          ),
        data: { title: 'Calendar', permission: 'payment_outgoing:read' },
      },
      {
        path: 'Interpayment',
        canActivate: [permissionGuard],
        loadComponent: () =>
          import('./pages/interpayment/interpayment.component').then(
            (m) => m.InterpaymentComponent,
          ),
        data: { title: 'Interpayment', permission: 'interpayment:read' , panduan: 'transfer-antar-rekening' },
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
        canActivate: [permissionGuard],
        loadComponent: () =>
          import('./pages/payment/payment.component').then(
            (m) => m.PaymentComponent,
          ),
        data: { title: 'Payment', permission: 'payment_outgoing:read' },
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
        canActivate: [permissionGuard],
        loadComponent: () =>
          import('./pages/taxing/taxing.component').then(
            (m) => m.TaxingComponent,
          ),
        data: { title: 'Taxing', permission: 'tax:read' },
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
        path: 'Project',
        canActivate: [permissionGuard],
        loadComponent: () =>
          import('./pages/project/project.component').then(
            (m) => m.ProjectComponent,
          ),
        data: { title: 'Project', permission: 'project:read' },
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/project/project-list/project-list.component').then(
                (m) => m.ProjectListComponent,
              ),
            pathMatch: 'full',
            data: { title: 'Project' },
          },
          {
            path: 'Report',
            loadComponent: () =>
              import(
                './pages/project/project-report/project-report.component'
              ).then((m) => m.ProjectReportComponent),
            data: { title: 'Project' },
          },
          {
            path: 'Report/:code',
            loadComponent: () =>
              import(
                './pages/project/project-report/project-report.component'
              ).then((m) => m.ProjectReportComponent),
            data: { title: 'Project' },
          },
          {
            path: ':id',
            loadComponent: () =>
              import('./pages/project/project-view/project-view.component').then(
                (m) => m.ProjectViewComponent,
              ),
            data: { title: 'Project' },
          },
        ],
      },
      {
        path: 'Master',
        canActivate: [permissionGuard],
        loadComponent: () =>
          import('./pages/master/master.component').then(
            (m) => m.MasterComponent,
          ),
        data: { title: 'Master Data', permission: 'master_item:read' },
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
        canActivate: [permissionGuard],
        loadComponent: () =>
          import('./pages/settings/settings.component').then(
            (m) => m.SettingsComponent,
          ),
        data: { title: 'Settings', permission: 'user:read' },
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
