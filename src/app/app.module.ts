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
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { SupplierComponent } from './pages/supplier/supplier.component';
import { PurchaseComponent } from './pages/purchase/purchase.component';
import { DashboardTopComponent } from './pages/dashboard/dashboard-top/dashboard-top.component';
import { DashboardBodyComponent } from './pages/dashboard/dashboard-body/dashboard-body.component';
import { ReimbursementComponent } from './pages/reimbursement/reimbursement.component';
import { ReimbursementCreateComponent } from './pages/reimbursement/reimbursement-create/reimbursement-create.component';
import { ReimbursementCreateItemDialogComponent } from './pages/reimbursement/reimbursement-create/reimbursement-create-item-dialog/reimbursement-create-item-dialog.component';
import { PurchaseReportSelectComponent } from './pages/purchase/purchase-list/purchase-report-select/purchase-report-select.component';
import { BankUpdateComponent } from './pages/bank/bank-update/bank-update.component';
import { BankComponent } from './pages/bank/bank.component';
import { PurchasePaymentCreateComponent } from './components/payment-create/purchase-payment-create/purchase-payment-create.component';
import { PurchaseUpdateStatusComponent } from './pages/purchase/purchase-update-status/purchase-update-status.component';
import { ExpenseComponent } from './pages/expense/expense.component';
import { PurchaseReportProjectComponent } from './pages/purchase/purchase-list/purchase-report-project/purchase-report-project.component';
import { EmployeeComponent } from './pages/employee/employee.component';
import { EmployeeCreateComponent } from './pages/employee/employee-create/employee-create.component';
import { EmployeeListComponent } from './pages/employee/employee-list/employee-list.component';
import { ExpenseOpponentComponent } from './pages/expense/expense-opponent/expense-opponent.component';
import { ExpenseOpponentListComponent } from './pages/expense/expense-opponent/expense-opponent-list/expense-opponent-list.component';
import { ExpenseOpponentCreateComponent } from './pages/expense/expense-opponent/expense-opponent-create/expense-opponent-create.component';
import { SalesInvoiceComponent } from './pages/sales-invoice/sales-invoice.component';
import { SalesInvoiceCreateComponent } from './pages/sales-invoice/sales-invoice-create/sales-invoice-create.component';
import { ClientListComponent } from './pages/client/client-list/client-list.component';
import { ClientCreateComponent } from './pages/client/client-create/client-create.component';
import { ClientComponent } from './pages/client/client.component';
import { EmployeeUpdateComponent } from './pages/employee/employee-update/employee-update.component';
import { SalarySlipComponent } from './pages/salary-slip/salary-slip.component';
import { SalarySlipCreateComponent } from './pages/salary-slip/salary-slip-create/salary-slip-create.component';
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
import { MatNativeDateModule } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCardModule } from '@angular/material/card';

// Components
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
import { PaymentHistoryComponent } from './pages/payment/payment-history/payment-history.component';
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
import { IncomeComponent } from './pages/income/income.component';
import { IncomeCreateComponent } from './pages/income/income-create/income-create.component';
import { ExpensePaymentCreateComponent } from './components/payment-create/expense-payment-create/expense-payment-create.component';
import { AssetComponent } from './pages/asset/asset.component';
import { AssetListComponent } from './pages/asset/asset-list/asset-list.component';
import { AssetCreateComponent } from './pages/asset/asset-create/asset-create.component';
import { SalarySlipViewComponent } from './pages/salary-slip/salary-slip-list/salary-slip-view/salary-slip-view.component';
import { SalaryPaymentCreateComponent } from './components/payment-create/salary-payment-create/salary-payment-create.component';
import { PurchaseUpdateComponent } from './pages/purchase/purchase-update/purchase-update.component';
import { PurchaseDraftComponent } from './pages/purchase-draft/purchase-draft.component';
import { PurchaseDraftViewComponent } from './pages/purchase-draft/purchase-draft-view/purchase-draft-view.component';
import { MatGridListModule } from '@angular/material/grid-list';
import { SalesInvoicePaymentCreateComponent } from './components/payment-create/sales-invoice-payment-create/sales-invoice-payment-create.component';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSidenavModule } from '@angular/material/sidenav';
import { CalendarDaySelectorComponent } from './pages/calendar/calendar-day-selector/calendar-day-selector.component';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { LoansComponent } from './pages/loans/loans.component';
import { LoansListComponent } from './pages/loans/loans-list/loans-list.component';
import { LoansCreateComponent } from './pages/loans/loans-create/loans-create.component';
import { PurchaseDraftConvertComponent } from './pages/purchase-draft/purchase-draft-convert/purchase-draft-convert.component';
import { PphSalaryRecapComponent } from './pages/taxing/pph-salary-recap/pph-salary-recap.component';
import { FileDropComponent } from './pages/pdf-main/file-drop/file-drop.component';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MatToolbarModule } from '@angular/material/toolbar';
import { PdfMainComponent } from './pages/pdf-main/pdf-main.component';
import { NumberFormatInputPipe } from './pipes/number-format-input.pipe';
import { MatExpansionModule } from '@angular/material/expansion';

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
    DashboardCardComponent,
    DashboardComponent,
    SupplierComponent,
    PurchaseComponent,
    DashboardTopComponent,
    DashboardBodyComponent,
    AutocompleteResultComponent,
    SupplierCreateComponent,
    BankSelectorComponent,
    ReimbursementComponent,
    ReimbursementCreateComponent,
    ReimbursementCreateItemDialogComponent,
    PurchaseReportSelectComponent,
    BankComponent,
    PurchasePaymentCreateComponent,
    BankUpdateComponent,
    ExpenseComponent,
    PurchaseReportProjectComponent,
    EmployeeComponent,
    EmployeeCreateComponent,
    ExpenseOpponentComponent,
    ExpenseOpponentListComponent,
    ExpenseOpponentCreateComponent,
    SalesInvoiceComponent,
    SalesInvoiceCreateComponent,
    ClientComponent,
    ClientListComponent,
    ClientCreateComponent,
    EmployeeUpdateComponent,
    SalarySlipComponent,
    CalendarDateSelectorComponent,
    CalendarDayViewComponent,
    PaymentComponent,
    PaymentHistoryComponent,
    TaxingComponent,
    PpnRecapComponent,
    PphRecapComponent,
    TaxListComponent,
    SettingsComponent,
    PaymentCreateComponent,
    InterpaymentComponent,
    InterpaymentCreateComponent,
    IncomeComponent,
    IncomeCreateComponent,
    ExpensePaymentCreateComponent,
    AssetComponent,
    AssetCreateComponent,
    SalarySlipViewComponent,
    SalaryPaymentCreateComponent,
    PurchaseUpdateComponent,
    PurchaseDraftComponent,
    PurchaseDraftViewComponent,
    SalesInvoicePaymentCreateComponent,
    PdfMainComponent,
    LoansComponent,
    LoansCreateComponent,
    PurchaseDraftConvertComponent,
    PphSalaryRecapComponent,
    FileDropComponent,
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
    NumberFormatInputPipe,
    MatTableModule,
    MatListModule,
    MatMenuModule,
    MatRadioModule,
    MatCheckboxModule,
    MatTooltipModule,
    ClipboardModule,
    MatGridListModule,
    MatTabsModule,
    MatSidenavModule,
    MatBottomSheetModule,
    DragDropModule,
    MatExpansionModule,
    MatToolbarModule,
    ClipboardModule,
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
