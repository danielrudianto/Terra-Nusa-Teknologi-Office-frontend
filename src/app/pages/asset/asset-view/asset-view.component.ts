import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-asset-view',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
  ],
  templateUrl: './asset-view.component.html',
  styleUrl: './asset-view.component.scss',
})
export class AssetViewComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { asset: any },
    private dialog: MatDialogRef<AssetViewComponent>,
  ) {}

  get asset(): any {
    return this.data?.asset ?? {};
  }

  onEdit(): void {
    this.dialog.close({ action: 'edit', asset: this.asset });
  }

  onViewPurchase(): void {
    this.dialog.close({ action: 'purchase', asset: this.asset });
  }

  onClose(): void {
    this.dialog.close();
  }
}
