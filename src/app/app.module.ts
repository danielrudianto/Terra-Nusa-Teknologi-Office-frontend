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
import { SupplierComponent } from './pages/supplier/supplier.component';
import { PurchaseComponent } from './pages/purchase/purchase.component';
import { DashboardTopComponent } from './pages/dashboard/dashboard-top/dashboard-top.component';
import { DashboardBodyComponent } from './pages/dashboard/dashboard-body/dashboard-body.component';
import { BankComponent } from './pages/bank/bank.component';
import { ExpenseComponent } from './pages/expense/expense.component';
import { EmployeeComponent } from './pages/employee/employee.component';
import { ExpenseOpponentComponent } from './pages/expense/expense-opponent/expense-opponent.component';
import { SalesInvoiceComponent } from './pages/sales-invoice/sales-invoice.component';
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
import { TaxingComponent } from './pages/taxing/taxing.component';
import { TaxListComponent } from './pages/taxing/tax-list/tax-list.component';
import { DatePipe, DecimalPipe } from '@angular/common';
import { PaymentCreateComponent } from './components/payment-create/payment-create.component';
import { InterpaymentComponent } from './pages/interpayment/interpayment.component';
import { IncomeComponent } from './pages/income/income.component';
import { AssetComponent } from './pages/asset/asset.component';
import { PurchaseDraftComponent } from './pages/purchase-draft/purchase-draft.component';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { LoansComponent } from './pages/loans/loans.component';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MatToolbarModule } from '@angular/material/toolbar';
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
  declarations: [AppComponent, DashboardCardComponent, BankSelectorComponent],
  bootstrap: [AppComponent],
  imports: [
    PaymentCreateComponent,
    LoansComponent,
    AssetComponent,
    SalarySlipComponent,
    SupplierComponent,
    InterpaymentComponent,
    BankComponent,
    EmployeeComponent,
    PurchaseComponent,
    IncomeComponent,
    ClientComponent,
    ExpenseComponent,
    ExpenseOpponentComponent,
    TaxingComponent,
    PurchaseDraftComponent,
    SalesInvoiceComponent,
    DashboardTopComponent,
    CalendarDateSelectorComponent,
    DashboardBodyComponent,
    TodayPaymentComponent,
    CashPositionComponent,
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
