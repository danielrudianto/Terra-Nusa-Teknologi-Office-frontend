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
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { SupplierComponent } from './pages/supplier/supplier.component';
import { PurchaseComponent } from './pages/purchase/purchase.component';
import { DashboardTopComponent } from './pages/dashboard/dashboard-top/dashboard-top.component';
import { DashboardBodyComponent } from './pages/dashboard/dashboard-body/dashboard-body.component';
import { ReimbursementComponent } from './pages/reimbursement/reimbursement.component';
import { ReimbursementCreateItemDialogComponent } from './pages/reimbursement/reimbursement-create/reimbursement-create-item-dialog/reimbursement-create-item-dialog.component';
import { PurchaseReportSelectComponent } from './pages/purchase/purchase-list/purchase-report-select/purchase-report-select.component';
import { BankUpdateComponent } from './pages/bank/bank-update/bank-update.component';
import { BankComponent } from './pages/bank/bank.component';
import { PurchasePaymentCreateComponent } from './components/payment-create/purchase-payment-create/purchase-payment-create.component';
import { ExpenseComponent } from './pages/expense/expense.component';
import { PurchaseReportProjectComponent } from './pages/purchase/purchase-list/purchase-report-project/purchase-report-project.component';
import { EmployeeComponent } from './pages/employee/employee.component';
import { EmployeeCreateComponent } from './pages/employee/employee-create/employee-create.component';
import { ExpenseOpponentComponent } from './pages/expense/expense-opponent/expense-opponent.component';
import { ExpenseOpponentListComponent } from './pages/expense/expense-opponent/expense-opponent-list/expense-opponent-list.component';
import { ExpenseOpponentCreateComponent } from './pages/expense/expense-opponent/expense-opponent-create/expense-opponent-create.component';
import { SalesInvoiceComponent } from './pages/sales-invoice/sales-invoice.component';
import { SalesInvoiceCreateComponent } from './pages/sales-invoice/sales-invoice-create/sales-invoice-create.component';
import { ClientComponent } from './pages/client/client.component';
import { SalarySlipComponent } from './pages/salary-slip/salary-slip.component';
import { CalendarDateSelectorComponent } from './pages/calendar/calendar-date-selector/calendar-date-selector.component';
import { CashPositionComponent } from './pages/dashboard/cash-position/cash-position.component';
import { TodayPaymentComponent } from './pages/dashboard/today-payment/today-payment/today-payment.component';

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
import { BankSelectorComponent } from './components/bank-selector/bank-selector.component';

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
import { CalendarDayViewComponent } from './pages/calendar/calendar-day-view/calendar-day-view.component';
import { PaymentComponent } from './pages/payment/payment.component';
import { PaymentHistoryComponent } from './pages/payment/payment-history/payment-history.component';
import { TaxingComponent } from './pages/taxing/taxing.component';
import { TaxListComponent } from './pages/taxing/tax-list/tax-list.component';
import { DatePipe, DecimalPipe } from '@angular/common';
import { PaymentCreateComponent } from './components/payment-create/payment-create.component';
import { InterpaymentComponent } from './pages/interpayment/interpayment.component';
import { IncomeComponent } from './pages/income/income.component';
import { ExpensePaymentCreateComponent } from './components/payment-create/expense-payment-create/expense-payment-create.component';
import { AssetComponent } from './pages/asset/asset.component';
import { SalarySlipViewComponent } from './pages/salary-slip/salary-slip-list/salary-slip-view/salary-slip-view.component';
import { SalaryPaymentCreateComponent } from './components/payment-create/salary-payment-create/salary-payment-create.component';
import { PurchaseUpdateComponent } from './pages/purchase/purchase-update/purchase-update.component';
import { PurchaseDraftComponent } from './pages/purchase-draft/purchase-draft.component';
import { MatGridListModule } from '@angular/material/grid-list';
import { SalesInvoicePaymentCreateComponent } from './components/payment-create/sales-invoice-payment-create/sales-invoice-payment-create.component';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { LoansComponent } from './pages/loans/loans.component';
import { PurchaseDraftConvertComponent } from './pages/purchase-draft/purchase-draft-convert/purchase-draft-convert.component';
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
    BankSelectorComponent,
    ReimbursementComponent,
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
    SalarySlipComponent,
    CalendarDateSelectorComponent,
    CalendarDayViewComponent,
    PaymentComponent,
    PaymentHistoryComponent,
    TaxingComponent,
    TaxListComponent,
    PaymentCreateComponent,
    InterpaymentComponent,
    IncomeComponent,
    ExpensePaymentCreateComponent,
    AssetComponent,
    SalarySlipViewComponent,
    SalaryPaymentCreateComponent,
    PurchaseUpdateComponent,
    PurchaseDraftComponent,
    SalesInvoicePaymentCreateComponent,
    PdfMainComponent,
    LoansComponent,
    PurchaseDraftConvertComponent,
    FileDropComponent,
    CashPositionComponent,
    TodayPaymentComponent,
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
