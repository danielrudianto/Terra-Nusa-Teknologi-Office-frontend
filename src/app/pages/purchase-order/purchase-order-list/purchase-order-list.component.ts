import { Component } from '@angular/core';
import { HeaderTitleComponent } from '../../../components/header-title/header-title.component';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-purchase-order-list',
  imports: [HeaderTitleComponent],
  templateUrl: './purchase-order-list.component.html',
  styleUrl: './purchase-order-list.component.scss',
})
export class PurchaseOrderListComponent {
  constructor(private router: Router, private route: ActivatedRoute) {}
  createNewPurchaseOrder() {
    this.router.navigate(['Create'], {
      relativeTo: this.route,
    });
  }
}
