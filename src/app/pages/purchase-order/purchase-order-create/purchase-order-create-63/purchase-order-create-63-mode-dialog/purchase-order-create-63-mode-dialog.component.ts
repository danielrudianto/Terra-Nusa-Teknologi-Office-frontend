import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';

@Component({
  selector: 'app-purchase-order-create-63-mode-dialog',
  imports: [MatDialogModule],
  templateUrl: './purchase-order-create-63-mode-dialog.component.html',
  styleUrl: './purchase-order-create-63-mode-dialog.component.scss',
})
export class PurchaseOrderCreate63ModeDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<PurchaseOrderCreate63ModeDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {}

  pick(mode: 'barang' | 'jasa') {
    this.dialogRef.close(mode);
  }
}
