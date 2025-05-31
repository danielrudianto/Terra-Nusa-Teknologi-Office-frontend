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
import { PurchasePaymentCreateComponent } from './components/purchase-payment-create/purchase-payment-create.component';
import { PurchaseUpdateStatusComponent } from './pages/purchase/purchase-update-status/purchase-update-status.component';
import { ExpenseComponent } from './pages/expense/expense.component';
import { ExpenseListComponent } from './pages/expense/expense-list/expense-list.component';
import { ExpenseCreateComponent } from './pages/expense/expense-create/expense-create.component';
import { MainComponent } from './pages/main/main.component';

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

export const MY_FORMATS = {
  parse: {
    dateInput: 'LL',
  },
  display: {
    dateInput: 'DD MMMM YYYY',
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
  ],
})
export class AppModule {}
