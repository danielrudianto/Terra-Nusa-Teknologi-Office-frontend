import { CommonModule } from '@angular/common';
import { Component, Inject, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { purchaseTypeLabel } from 'src/app/constants/purchase-type-label.constant';
import { AuditTrailComponent } from '../../../../components/audit-trail/audit-trail.component';
import { DialogGeserDirective } from '../../../../directives/dialog-geser.directive';

@Component({
  selector: 'app-master-item-view',
  standalone: true,
  imports: [
    AuditTrailComponent,
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    TranslatePipe,
    DialogGeserDirective,
  ],
  templateUrl: './master-item-view.component.html',
  styleUrl: './master-item-view.component.scss',
})
export class MasterItemViewComponent {
  private readonly translateSvc = inject(TranslateService);

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { item: any },
    private dialog: MatDialogRef<MasterItemViewComponent>,
  ) {}

  get item(): any {
    return this.data?.item ?? {};
  }

  typeChips(): string[] {
    const v = this.item?.availablePurchaseType;
    if (!v) return [];
    if (Array.isArray(v)) return v;
    return String(v)
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
  }

  typeLabel(code: string): string {
    return purchaseTypeLabel(this.translateSvc, code);
  }

  onEdit(): void {
    this.dialog.close({ action: 'edit', item: this.item });
  }

  onClose(): void {
    this.dialog.close();
  }
}
