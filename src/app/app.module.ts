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
    AutocompleteResultComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
