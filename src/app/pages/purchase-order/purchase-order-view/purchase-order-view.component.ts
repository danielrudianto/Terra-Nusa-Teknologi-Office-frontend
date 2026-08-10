import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Clipboard } from '@angular/cdk/clipboard';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ApiService } from '../../../services/api.service';
import { PURCHASE_TYPE_LABELS } from '../../../constants/purchase-type-label.constant';
import { buildClauseLines } from '../../../constants/clause-templates';
import { AuditTrailComponent } from '../../../components/audit-trail/audit-trail.component';

type ViewMode = 'formatted' | 'raw';

@Component({
  selector: 'app-purchase-order-view',
  standalone: true,
  imports: [
    AuditTrailComponent,
    CommonModule,
    MatDialogModule,
    MatIconModule,
    MatButtonToggleModule,
    MatProgressSpinnerModule,
    TranslatePipe,
  ],
  templateUrl: './purchase-order-view.component.html',
  styleUrl: './purchase-order-view.component.scss',
})
export class PurchaseOrderViewComponent {
  mode: ViewMode = 'formatted';
  isLoading = true;
  data: any = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public input: { id: number },
    private dialogRef: MatDialogRef<PurchaseOrderViewComponent>,
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private clipboard: Clipboard,
    private translate: TranslateService,
  ) {
    this.fetch();
  }

  private fetch() {
    this.isLoading = true;
    this.apiService
      .get(`purchase-orders/${this.input.id}`, {})
      .subscribe({
        next: (res: any) => {
          this.data = res;
        },
        error: (error: any) => {
          this.snackBar.open(
            error?.error?.detail ??
              this.translate.instant('purchaseOrder.viewFailed'),
            'Close',
            { duration: 3000 },
          );
          this.dialogRef.close();
        },
      })
      .add(() => {
        this.isLoading = false;
      });
  }

  typeLabel(code: string): string {
    return PURCHASE_TYPE_LABELS[code] || code || '—';
  }

  get items(): any[] {
    return this.data?.items || [];
  }

  /** Nama barang bisa datang dari katalog barang, alat sewa, atau diketik. */
  itemName(item: any): string {
    return (
      item?.item_description ||
      item?.equipment_name ||
      item?.task ||
      item?.sku ||
      '—'
    );
  }

  lineTotal(item: any): number {
    return (Number(item?.quantity) || 0) * (Number(item?.price) || 0);
  }

  get subTotal(): number {
    return this.items.reduce((acc, x) => acc + this.lineTotal(x), 0);
  }

  /**
   * Poin perjanjian dirakit ulang dari template + data PO, bukan diambil
   * dari teks tersimpan — sama seperti saat dokumen dicetak.
   */
  get clauses(): string[] {
    if (!this.data) return [];
    const custom = this.data.customData || {};
    return buildClauseLines(
      this.data.purchaseType,
      {
        paymentTerm: custom.paymentTerm ?? this.data.payment_term,
        creditTerm: custom.creditTerm,
        prepaidTerm: custom.prepaidTerm,
        deliveryMethod: custom.deliveryMethod,
        deliveryAddress: custom.deliveryAddress,
        supplierPICName: custom.supplierPICName,
        supplierPICPhoneNumber: custom.supplierPICPhoneNumber,
        officePICName: custom.officePICName,
        officePICPhoneNumber: custom.officePICPhoneNumber,
        fuelReportRequired: custom.fuelReportRequired,
        paymentTermText: custom.paymentTerm,
        overtimeRate: custom.overtimeRate,
        shiftHours: custom.shiftHours,
        includeSundayPolicy: custom.includeSundayPolicy,
      },
      this.data.templateVersion,
      custom.additionalClauses || [],
    );
  }

  get rawJson(): string {
    return JSON.stringify(this.data ?? {}, null, 2);
  }

  copyRaw() {
    this.clipboard.copy(this.rawJson);
    this.snackBar.open(
      this.translate.instant('purchaseOrder.rawCopied'),
      'Close',
      {
        duration: 2000,
      },
    );
  }
}
