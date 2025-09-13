import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { provideRouter, withViewTransitions } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';

// Pages
import { SupplierCreateComponent } from './pages/supplier/supplier-create/supplier-create.component';
import { PurchaseCreateComponent } from './pages/purchase/purchase-create/purchase-create.component';
import { PurchaseListComponent } from './pages/purchase/purchase-list/purchase-list.component';
import { SupplierListComponent } from './pages/supplier/supplier-list/supplier-list.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { SupplierComponent } from './pages/supplier/supplier.component';
import { PurchaseComponent } from './pages/purchase/purchase.component';
import { LoginComponent } from './pages/login/login.component';
import { DashboardTopComponent } from './pages/dashboard/dashboard-top/dashboard-top.component';
import { DashboardBodyComponent } from './pages/dashboard/dashboard-body/dashboard-body.component';
import { ReimbursementComponent } from './pages/reimbursement/reimbursement.component';
import { ReimbursementListComponent } from './pages/reimbursement/reimbursement-list/reimbursement-list.component';
import { ReimbursementCreateComponent } from './pages/reimbursement/reimbursement-create/reimbursement-create.component';
import { ReimbursementCreateItemDialogComponent } from './pages/reimbursement/reimbursement-create/reimbursement-create-item-dialog/reimbursement-create-item-dialog.component';
import { PurchaseReportSelectComponent } from './pages/purchase/purchase-list/purchase-report-select/purchase-report-select.component';
import { SupplierViewComponent } from './pages/supplier/supplier-list/supplier-view/supplier-view.component';
import { BankListComponent } from './pages/bank/bank-list/bank-list.component';
import { BankCreateComponent } from './pages/bank/bank-create/bank-create.component';
import { BankUpdateComponent } from './pages/bank/bank-update/bank-update.component';
import { SupplierUpdateComponent } from './pages/supplier/supplier-update/supplier-update.component';
import { BankComponent } from './pages/bank/bank.component';
import { PurchasePaymentCreateComponent } from './components/payment-create/purchase-payment-create/purchase-payment-create.component';
import { PurchaseUpdateStatusComponent } from './pages/purchase/purchase-update-status/purchase-update-status.component';
import { ExpenseComponent } from './pages/expense/expense.component';
import { ExpenseListComponent } from './pages/expense/expense-list/expense-list.component';
import { ExpenseCreateComponent } from './pages/expense/expense-create/expense-create.component';
import { MainComponent } from './pages/main/main.component';
import { PurchaseReportProjectComponent } from './pages/purchase/purchase-list/purchase-report-project/purchase-report-project.component';
import { EmployeeComponent } from './pages/employee/employee.component';
import { EmployeeCreateComponent } from './pages/employee/employee-create/employee-create.component';
import { EmployeeListComponent } from './pages/employee/employee-list/employee-list.component';
import { ExpenseOpponentComponent } from './pages/expense/expense-opponent/expense-opponent.component';
import { ExpenseOpponentListComponent } from './pages/expense/expense-opponent/expense-opponent-list/expense-opponent-list.component';
import { ExpenseOpponentCreateComponent } from './pages/expense/expense-opponent/expense-opponent-create/expense-opponent-create.component';
import { SalesInvoiceComponent } from './pages/sales-invoice/sales-invoice.component';
import { SalesInvoiceListComponent } from './pages/sales-invoice/sales-invoice-list/sales-invoice-list.component';
import { SalesInvoiceCreateComponent } from './pages/sales-invoice/sales-invoice-create/sales-invoice-create.component';
import { ClientListComponent } from './pages/client/client-list/client-list.component';
import { ClientCreateComponent } from './pages/client/client-create/client-create.component';
import { ClientComponent } from './pages/client/client.component';
import { EmployeeUpdateComponent } from './pages/employee/employee-update/employee-update.component';
import { SalarySlipComponent } from './pages/salary-slip/salary-slip.component';
import { SalarySlipCreateComponent } from './pages/salary-slip/salary-slip-create/salary-slip-create.component';
import { SalarySlipListComponent } from './pages/salary-slip/salary-slip-list/salary-slip-list.component';
import { CalendarComponent } from './pages/calendar/calendar.component';
import { CalendarDateSelectorComponent } from './pages/calendar/calendar-date-selector/calendar-date-selector.component';

// Material
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatStepperModule } from '@angular/material/stepper';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { provideMomentDateAdapter } from '@angular/material-moment-adapter';
import { MatTableModule } from '@angular/material/table';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ClipboardModule } from '@angular/cdk/clipboard';
import {
  MatNativeDateModule,
  MAT_DATE_LOCALE,
  MAT_DATE_FORMATS,
} from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCardModule } from '@angular/material/card';

// Components
import { SideNavComponent } from './components/side-nav/side-nav.component';
import { DashboardCardComponent } from './components/dashboard-card/dashboard-card.component';
import { AutocompleteResultComponent } from './components/autocomplete-result/autocomplete-result.component';
import { PphSelectorComponent } from './components/pph-selector/pph-selector.component';
import { BankSelectorComponent } from './components/bank-selector/bank-selector.component';
import { PdfViewerComponent } from './components/pdf-viewer/pdf-viewer.component';
import { SupplierSelectorComponent } from './components/supplier-selector/supplier-selector.component';
import { ExpenseOpponentSelectorComponent } from './components/expense-opponent-selector/expense-opponent-selector.component';
import { ClientSelectorComponent } from './components/client-selector/client-selector.component';

// Interceptors
import { AuthInterceptor } from './services/auth.interceptor';

// Third Parties
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';
import * as _moment from 'moment';
import { default as _rollupMoment } from 'moment';

// App
import { AppRoutingModule, routes } from './app-routing.module';
import { AppComponent } from './app.component';
import { NgxMaskDirective, NgxMaskPipe, provideNgxMask } from 'ngx-mask';
import { CalendarTableComponent } from './pages/calendar/calendar-table/calendar-table.component';
import { ShortCurrencyPipe } from './pipes/short-currency.pipe';
import { CalendarDayViewComponent } from './pages/calendar/calendar-day-view/calendar-day-view.component';
import { CalendarMonthSelectorComponent } from './pages/calendar/calendar-month-selector/calendar-month-selector.component';
import { PaymentComponent } from './pages/payment/payment.component';
import { PaymentListComponent } from './pages/payment/payment-list/payment-list.component';
import { PaymentHistoryComponent } from './pages/payment/payment-history/payment-history.component';
import { PaymentUpdateComponent } from './pages/payment/payment-update/payment-update.component';
import { TaxingComponent } from './pages/taxing/taxing.component';
import { PpnRecapComponent } from './pages/taxing/ppn-recap/ppn-recap.component';
import { PphRecapComponent } from './pages/taxing/pph-recap/pph-recap.component';
import { TaxListComponent } from './pages/taxing/tax-list/tax-list.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { DatePipe, DecimalPipe } from '@angular/common';
import { CalendarAccountSelectorComponent } from './pages/calendar/calendar-account-selector/calendar-account-selector.component';
import { PaymentCreateComponent } from './components/payment-create/payment-create.component';
import { ReimbursementPaymentCreateComponent } from './components/payment-create/reimbursement-payment-create/reimbursement-payment-create.component';
import { InterpaymentComponent } from './pages/interpayment/interpayment.component';
import { InterpaymentCreateComponent } from './pages/interpayment/interpayment-create/interpayment-create.component';
import { InterpaymentListComponent } from './pages/interpayment/interpayment-list/interpayment-list.component';
import { IncomeComponent } from './pages/income/income.component';
import { IncomeListComponent } from './pages/income/income-list/income-list.component';
import { IncomeCreateComponent } from './pages/income/income-create/income-create.component';
import { ExpensePaymentCreateComponent } from './components/payment-create/expense-payment-create/expense-payment-create.component';
import { AssetComponent } from './pages/asset/asset.component';
import { AssetListComponent } from './pages/asset/asset-list/asset-list.component';
import { AssetCreateComponent } from './pages/asset/asset-create/asset-create.component';
import { SalarySlipViewComponent } from './pages/salary-slip/salary-slip-list/salary-slip-view/salary-slip-view.component';
import { SalaryPaymentCreateComponent } from './components/payment-create/salary-payment-create/salary-payment-create.component';
import { PurchaseUpdateComponent } from './pages/purchase/purchase-update/purchase-update.component';
import { PurchaseDraftComponent } from './pages/purchase-draft/purchase-draft.component';
import { PurchaseDraftCreateComponent } from './pages/purchase-draft/purchase-draft-create/purchase-draft-create.component';
import { PurchaseDraftListComponent } from './pages/purchase-draft/purchase-draft-list/purchase-draft-list.component';
import { PurchaseDraftViewComponent } from './pages/purchase-draft/purchase-draft-view/purchase-draft-view.component';
import { MatGridListModule } from '@angular/material/grid-list';
import { ExpenseViewComponent } from './pages/expense/expense-view/expense-view.component';

export const MY_FORMATS = {
  parse: {
    dateInput: 'LL',
  },
  display: {
    dateInput: 'DD MMMM yyyy',
    monthYearLabel: 'MMMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

@NgModule({
  declarations: [
    AppComponent,
    SideNavComponent,
    DashboardCardComponent,
    DashboardComponent,
    SupplierComponent,
    PurchaseComponent,
    LoginComponent,
    DashboardTopComponent,
    DashboardBodyComponent,
    AutocompleteResultComponent,
    SupplierSelectorComponent,
    PphSelectorComponent,
    MainComponent,
    SupplierCreateComponent,
    PurchaseCreateComponent,
    PurchaseListComponent,
    SupplierListComponent,
    BankSelectorComponent,
    ReimbursementComponent,
    ReimbursementListComponent,
    ReimbursementCreateComponent,
    ReimbursementCreateItemDialogComponent,
    PurchaseReportSelectComponent,
    SupplierViewComponent,
    BankComponent,
    PurchasePaymentCreateComponent,
    PdfViewerComponent,
    BankListComponent,
    BankCreateComponent,
    BankUpdateComponent,
    PurchaseUpdateStatusComponent,
    SupplierUpdateComponent,
    ExpenseComponent,
    ExpenseListComponent,
    ExpenseCreateComponent,
    PurchaseReportProjectComponent,
    EmployeeComponent,
    EmployeeCreateComponent,
    EmployeeListComponent,
    ExpenseOpponentComponent,
    ExpenseOpponentListComponent,
    ExpenseOpponentCreateComponent,
    ExpenseOpponentSelectorComponent,
    SalesInvoiceComponent,
    SalesInvoiceListComponent,
    SalesInvoiceCreateComponent,
    ClientComponent,
    ClientListComponent,
    ClientCreateComponent,
    ClientSelectorComponent,
    EmployeeUpdateComponent,
    SalarySlipComponent,
    SalarySlipCreateComponent,
    SalarySlipListComponent,
    CalendarComponent,
    CalendarDateSelectorComponent,
    CalendarTableComponent,
    ShortCurrencyPipe,
    CalendarDayViewComponent,
    CalendarMonthSelectorComponent,
    PaymentComponent,
    PaymentListComponent,
    PaymentHistoryComponent,
    PaymentUpdateComponent,
    TaxingComponent,
    PpnRecapComponent,
    PphRecapComponent,
    TaxListComponent,
    SettingsComponent,
    CalendarAccountSelectorComponent,
    PaymentCreateComponent,
    ReimbursementPaymentCreateComponent,
    InterpaymentComponent,
    InterpaymentCreateComponent,
    InterpaymentListComponent,
    IncomeComponent,
    IncomeListComponent,
    IncomeCreateComponent,
    ExpensePaymentCreateComponent,
    AssetComponent,
    AssetListComponent,
    AssetCreateComponent,
    SalarySlipViewComponent,
    SalaryPaymentCreateComponent,
    PurchaseUpdateComponent,
    PurchaseDraftComponent,
    PurchaseDraftCreateComponent,
    PurchaseDraftListComponent,
    PurchaseDraftViewComponent,
    ExpenseViewComponent,
  ],
  bootstrap: [AppComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
    MatDialogModule,
    MatDividerModule,
    MatStepperModule,
    MatSnackBarModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatAutocompleteModule,
    MatCardModule,
    NgxExtendedPdfViewerModule,
    NgxMaskDirective,
    NgxMaskPipe,
    MatTableModule,
    MatListModule,
    MatMenuModule,
    MatRadioModule,
    MatCheckboxModule,
    MatTooltipModule,
    ClipboardModule,
    MatGridListModule,
  ],
  providers: [
    provideNgxMask(),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
    provideMomentDateAdapter(MY_FORMATS),
    provideHttpClient(withInterceptorsFromDi()),
    provideRouter(routes, withViewTransitions()),
    DatePipe,
    DecimalPipe,
  ],
})
export class AppModule {}
