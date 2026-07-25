import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { PurchaseViewComponent } from 'src/app/pages/purchase/purchase-view/purchase-view.component';

@Component({
  selector: 'app-asset-list-purchase-order-selector',
  imports: [CommonModule, MatListModule, MatDialogModule, MatIconModule],
  templateUrl: './asset-list-purchase-order-selector.component.html',
  styleUrl: './asset-list-purchase-order-selector.component.scss',
})
export class AssetListPurchaseOrderSelectorComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any[],
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {}

  openData(id: number) {
    this.dialog.open(PurchaseViewComponent, {
      data: {
        id: id,
      },
    });
  }
}
