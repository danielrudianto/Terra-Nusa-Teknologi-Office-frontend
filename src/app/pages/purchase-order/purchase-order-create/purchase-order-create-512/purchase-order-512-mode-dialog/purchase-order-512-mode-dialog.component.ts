import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * Asked once when opening the 5.1.2 form: is this a parts purchase or a
 * repair/maintenance service? The answer decides which line editor is shown.
 * Returns 'barang' | 'jasa' | undefined (dismissed).
 */
@Component({
  selector: 'app-purchase-order-512-mode-dialog',
  standalone: true,
  imports: [
    TranslatePipe,CommonModule, MatDialogModule],
  templateUrl: './purchase-order-512-mode-dialog.component.html',
  styleUrl: './purchase-order-512-mode-dialog.component.scss',
})
export class PurchaseOrder512ModeDialogComponent {
  constructor(private dialogRef: MatDialogRef<PurchaseOrder512ModeDialogComponent>) {}

  pick(mode: 'barang' | 'jasa') {
    this.dialogRef.close(mode);
  }
}