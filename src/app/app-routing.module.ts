import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { PurchaseComponent } from './pages/purchase/purchase.component';
import { SupplierComponent } from './pages/supplier/supplier.component';

const routes: Routes = [
  {
    path: 'Login',
    component: LoginComponent,
  },
  {
    path: '',
    component: DashboardComponent,
  },
  {
    path: 'Purchase',
    component: PurchaseComponent,
  },
  {
    path: 'Supplier',
    component: SupplierComponent,
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
