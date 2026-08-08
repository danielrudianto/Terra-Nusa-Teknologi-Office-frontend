import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime } from 'rxjs';
import { DeleteConfirmationComponent } from '../../../components/delete-confirmation/delete-confirmation.component';
import { HeaderTitleComponent } from '../../../components/header-title/header-title.component';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ApiService } from '../../../services/api.service';
import { PURCHASE_TYPE_LABELS } from '../../../constants/purchase-type-label';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { printPurchaseOrderG } from '../../../helpers/purchase-order-g.helper';

@Component({
  selector: 'app-purchase-order-list',
  standalone: true,
  imports: [
    MatProgressSpinnerModule,
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatMenuModule,
    MatPaginatorModule,
    MatButtonModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatTooltipModule,
    HeaderTitleComponent,
    TranslatePipe,
  ],
  templateUrl: './purchase-order-list.component.html',
  styleUrl: './purchase-order-list.component.scss',
})
export class PurchaseOrderListComponent {
  /** i18n key untuk status PO. */
  statusKey(status: string): string {
    switch (status) {
      case 'approved':
        return 'status.approved';
      case 'cancelled':
        return 'status.cancelled';
      case 'pending':
        return 'status.pending';
      case 'draft':
      default:
        return 'status.draft';
    }
  }

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private apiService: ApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private translate: TranslateService,
  ) {}

  isLoading: boolean = false;
  isReprinting: number | null = null;
  searchControl: FormControl = new FormControl('');
  orders: any[] = [];
  page: number = 1;
  pageSize: number = 10;
  count: number = 0;
  displayedColumns: string[] = [
    'name',
    'date',
    'supplier',
    'project',
    'type',
    'total',
    'status',
    'action',
  ];

  ngOnInit(): void {
    this.fetch();
    this.searchControl.valueChanges.pipe(debounceTime(400)).subscribe(() => {
      this.fetch(1);
    });
  }

  fetch(targetPage: number = 1) {
    this.isLoading = true;
    this.page = targetPage;
    this.apiService
      .get('purchase-orders', {
        keyword: this.searchControl.value || '',
        page: this.page,
        page_size: this.pageSize,
      })
      .subscribe({
        next: (res: any) => {
          this.orders = res.data || [];
          this.count = res.count || 0;
        },
        error: (err) => {
          this.snackBar.open(
            err?.error?.detail || 'Gagal memuat purchase order',
            'Close',
            { duration: 3000 },
          );
        },
      })
      .add(() => {
        this.isLoading = false;
      });
  }

  changePage(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.fetch(event.pageIndex + 1);
  }

  supplierLabel(po: any): string {
    return (
      [po.supplier_prefix, po.supplier_name].filter(Boolean).join(' ') || '—'
    );
  }

  typeLabel(code: string): string {
    return PURCHASE_TYPE_LABELS[code] || code;
  }

  total(po: any): number {
    const dpp = Number(po.dpp) || 0;
    const ppn = Number(po.ppn) || 0;
    return dpp + (dpp * ppn) / 100;
  }

  createNewPurchaseOrder() {
    this.router.navigate(['Create'], { relativeTo: this.route });
  }

  /** Tipe PO yang sudah punya template cetak. */
  private readonly printableTypes = ['G'];

  canReprint(po: any): boolean {
    return this.printableTypes.includes(po?.purchaseType);
  }

  /**
   * Cetak ulang dokumen PO. Data diambil ulang dari server, dan poin
   * perjanjian dirakit dari template + templateVersion PO tersebut —
   * bukan dari teks tersimpan — sehingga hasilnya konsisten dengan datanya.
   */
  reprint(po: any) {
    if (!this.canReprint(po)) return;
    this.isReprinting = po.id;

    this.apiService
      .get(`purchase-orders/${po.id}`, {})
      .subscribe({
        next: (data: any) => {
          const custom = data.customData || {};
          try {
            printPurchaseOrderG({
              purchaseOrderName: data.name,
              date: data.date,
              projectName: data.projectName,
              supplierName: data.supplierName ?? '',
              supplierAddress: data.supplierAddress ?? '',
              supplierCity: data.supplierCity ?? '',
              supplierNpwp: data.supplierNpwp ?? '',
              items: (data.items || []).map((it: any) => ({
                // Nama barang berasal dari join master_item
                // (item_description); `task` dipakai PO jasa/tenaga kerja.
                // item_description = barang katalog, equipment_name = alat
                // sewa (PO B), task = PO jasa/tenaga kerja.
                name:
                  it.item_description ||
                  it.equipment_name ||
                  it.task ||
                  it.sku ||
                  '',
                quantity: Number(it.quantity) || 0,
                unit: it.unit,
                price: Number(it.price) || 0,
              })),
              includePpn: Number(data.ppn) > 0,
              templateVersion: data.templateVersion,
              clauseContext: {
                paymentTerm: custom.paymentTerm ?? data.payment_term,
                creditTerm: custom.creditTerm,
                prepaidTerm: custom.prepaidTerm,
                deliveryMethod: custom.deliveryMethod,
                deliveryAddress: custom.deliveryAddress,
                supplierPICName: custom.supplierPICName,
                supplierPICPhoneNumber: custom.supplierPICPhoneNumber,
                officePICName: custom.officePICName,
                officePICPhoneNumber: custom.officePICPhoneNumber,
                fuelReportRequired: custom.fuelReportRequired,
              },
              additionalClauses: custom.additionalClauses || [],
            });
          } catch (e) {
            console.error('Gagal membuat PDF purchase order:', e);
            this.snackBar.open(
              this.translate.instant('purchaseOrder.reprintFailed'),
              'Close',
              { duration: 3000 },
            );
          }
        },
        error: () => {
          this.snackBar.open(
            this.translate.instant('purchaseOrder.reprintFailed'),
            'Close',
            { duration: 3000 },
          );
        },
      })
      .add(() => {
        this.isReprinting = null;
      });
  }

  approve(po: any) {
    this.apiService.post(`purchase-orders/${po.id}/approve`, {}).subscribe({
      next: () => {
        this.snackBar.open('Purchase order disetujui', 'Close', {
          duration: 2000,
        });
        this.fetch(this.page);
      },
      error: (err) => {
        this.snackBar.open(err?.error?.detail || 'Gagal menyetujui', 'Close', {
          duration: 3000,
        });
      },
    });
  }

  deleteOrder(po: any) {
    this.dialog
      .open(DeleteConfirmationComponent, {
        data: {
          title: 'Hapus purchase order',
          prompt: `Yakin mau menghapus "${po.name}"?`,
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.apiService.delete(`purchase-orders/${po.id}`).subscribe({
          next: () => {
            this.snackBar.open('Purchase order dihapus', 'Close', {
              duration: 2000,
            });
            this.fetch(this.page);
          },
          error: (err) => {
            this.snackBar.open(
              err?.error?.detail || 'Gagal menghapus',
              'Close',
              { duration: 3000 },
            );
          },
        });
      });
  }
}
