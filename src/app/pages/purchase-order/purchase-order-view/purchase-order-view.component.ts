import { CommonModule } from '@angular/common';
import { ClauseLineComponent } from '../../../components/clause-line/clause-line.component';
import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ApiService } from '../../../services/api.service';
import { PURCHASE_TYPE_LABELS } from '../../../constants/purchase-type-label.constant';
import {
  ClauseSection,
  buildClauseLines,
  buildLegalServiceClauses,
  buildManpowerClauses,
  buildTransportClauses,
} from '../../../constants/clause-templates';
import { AuditTrailComponent } from '../../../components/audit-trail/audit-trail.component';


@Component({
  selector: 'app-purchase-order-view',
  standalone: true,
  imports: [
    ClauseLineComponent,
    AuditTrailComponent,
    CommonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe,
  ],
  templateUrl: './purchase-order-view.component.html',
  styleUrl: './purchase-order-view.component.scss',
})
export class PurchaseOrderViewComponent {
  isLoading = true;
  data: any = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public input: { id: number },
    private dialogRef: MatDialogRef<PurchaseOrderViewComponent>,
    private apiService: ApiService,
    private snackBar: MatSnackBar,
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
  /**
   * Poin perjanjian, terbagi seksi.
   *
   * Sebagian jenis PO merakit klausulnya lewat pembangun tersendiri yang
   * mengembalikan seksi, bukan lewat CLAUSE_TEMPLATES — PO-A, PO-D, dan
   * 6.4.1. Ketiganya tidak terdaftar di CLAUSE_TEMPLATES, sehingga
   * buildClauseLines mengembalikan daftar kosong dan poinnya tidak pernah
   * tampil di halaman ini.
   */
  /**
   * Jenis yang menentukan bentuk ketentuannya.
   *
   * Tidak selalu sama dengan kolom `purchaseType`: PO-B dapat diterbitkan
   * sebagai tipe A ketika alatnya dipakai mengangkut, dan yang tersimpan
   * adalah 'A'. Membaca kolom itu apa adanya membuat dokumen sewa alat
   * ditampilkan dengan ketentuan jasa transportasi — isian, tabel, dan
   * ketentuannya jadi tidak saling cocok.
   *
   * PO lama yang belum menyimpan penanda dikenali dari kolom yang hanya ada
   * pada formulir sewa.
   */
  get jenisEfektif(): string {
    const custom = this.data?.customData || {};
    if (custom.formOrigin) return custom.formOrigin;
    if (
      this.data?.purchaseType === 'A' &&
      (custom.equipmentRiskBearer !== undefined ||
        custom.operatorByVendor !== undefined ||
        custom.quotaPeriodDays !== undefined)
    ) {
      return 'B';
    }
    return this.data?.purchaseType;
  }

  get clauseSections(): ClauseSection[] {
    if (!this.data) return [];
    const custom = this.data.customData || {};
    const tambahan: string[] = custom.additionalClauses || [];

    switch (this.jenisEfektif) {
      case 'A':
        return buildTransportClauses(
          {
            ...custom,
            paymentTerm: custom.paymentTerm ?? this.data.payment_term,
          },
          tambahan,
        );
      case 'D':
        return buildManpowerClauses(
          {
            ...custom,
            paymentTerm: custom.paymentTerm ?? this.data.payment_term,
          },
          tambahan,
        );
      case '6.4.1':
        return buildLegalServiceClauses(
          {
            ...custom,
            paymentTerm: custom.paymentTerm ?? this.data.payment_term,
            hasOfficialFee: (custom.officialFees || []).length > 0,
          },
          tambahan,
        );
      default: {
        const lines = this.clauses;
        return lines.length ? [{ items: lines }] : [];
      }
    }
  }

  isSubList(x: string | string[]): boolean {
    return Array.isArray(x);
  }
  asList(x: string | string[]): string[] {
    return Array.isArray(x) ? x : [];
  }
  asText(x: string | string[]): string {
    return Array.isArray(x) ? '' : String(x ?? '');
  }

  get clauses(): (string | string[])[] {
    if (!this.data) return [];
    const custom = this.data.customData || {};
    return buildClauseLines(
      // Bukan kolom `purchaseType`: lihat keterangan pada `jenisEfektif`.
      this.jenisEfektif,
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

}
