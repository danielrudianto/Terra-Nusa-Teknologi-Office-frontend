import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { SideNavComponent } from './components/side-nav/side-nav.component';
import { DashboardCardComponent } from './components/dashboard-card/dashboard-card.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { SupplierComponent } from './pages/supplier/supplier.component';
import { PurchaseComponent } from './pages/purchase/purchase.component';
import { LoginComponent } from './pages/login/login.component';
import { DashboardTopComponent } from './pages/dashboard/dashboard-top/dashboard-top.component';
import { DashboardBodyComponent } from './pages/dashboard/dashboard-body/dashboard-body.component';
import { AutocompleteResultComponent } from './components/autocomplete-result/autocomplete-result.component';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { NgxMaskDirective, NgxMaskPipe, provideNgxMask } from 'ngx-mask';
import { SupplierSelectorComponent } from './components/supplier-selector/supplier-selector.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { PphSelectorComponent } from './components/pph-selector/pph-selector.component';
import { MainComponent } from './pages/main/main.component';
import { MatStepperModule } from '@angular/material/stepper';
import { SupplierCreateComponent } from './pages/supplier/supplier-create/supplier-create.component';
import { PurchaseCreateComponent } from './pages/purchase/purchase-create/purchase-create.component';
import { PurchaseListComponent } from './pages/purchase/purchase-list/purchase-list.component';
import { SupplierListComponent } from './pages/supplier/supplier-list/supplier-list.component';
import { BankSelectorComponent } from './components/bank-selector/bank-selector.component';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from './services/auth.interceptor';
import { ReimbursementComponent } from './pages/reimbursement/reimbursement.component';
import { ReimbursementListComponent } from './pages/reimbursement/reimbursement-list/reimbursement-list.component';
import { ReimbursementCreateComponent } from './pages/reimbursement/reimbursement-create/reimbursement-create.component';
import { ReimbursementCreateItemDialogComponent } from './pages/reimbursement/reimbursement-create/reimbursement-create-item-dialog/reimbursement-create-item-dialog.component';

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
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule,
    HttpClientModule,
    NgxMaskDirective,
    NgxMaskPipe,
    BrowserAnimationsModule,
    MatDialogModule,
    MatDividerModule,
    MatStepperModule,
    MatSnackBarModule,
    MatChipsModule,
    MatProgressSpinnerModule,
  ],
  providers: [
    provideNgxMask(),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
