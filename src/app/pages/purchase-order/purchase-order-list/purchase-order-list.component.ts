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
import {
  PURCHASE_TYPE_LABELS,
  purchaseTypeKey,
} from '../../../constants/purchase-type-label.constant';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { printPurchaseOrderG } from '../../../helpers/purchase-order-g.helper';
import { printPurchaseOrderC } from '../../../helpers/purchase-order-c.helper';
import { printPurchaseOrderD } from '../../../helpers/purchase-order-d.helper';
import { printPurchaseOrderB } from '../../../helpers/purchase-order-b.helper';
import { printPurchaseOrderH } from '../../../helpers/purchase-order-h.helper';
import { PurchaseOrderViewComponent } from '../purchase-order-view/purchase-order-view.component';
import { PurchaseOrderTypeSelectorComponent } from '../purchase-order-type-selector/purchase-order-type-selector.component';
import {
  buildBuangLumpurClauses,
  buildClauseLines,
  buildGroutingClauses,
  buildMandorClauses,
  buildPasal5,
} from '../../../constants/clause-templates';
import { SettingsService } from '../../../services/setting.service';

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
  /**
   * Status yang ditampilkan. PO terhapus ditandai lewat `isDelete`,
   * bukan kolom status, sehingga perlu diperiksa terpisah.
   */
  displayStatus(po: any): string {
    if (po?.isDelete) return 'deleted';
    if (po?.isApproved) return 'approved';
    return po?.status || 'draft';
  }

  /** i18n key untuk status PO. */
  statusKey(status: string): string {
    switch (status) {
      case 'approved':
        return 'status.approved';
      case 'cancelled':
        return 'status.cancelled';
      case 'pending':
        return 'status.pending';
      case 'published':
        return 'status.published';
      case 'deleted':
        return 'status.deleted';
      case 'draft':
      default:
        return 'status.draft';
    }
  }

  constructor(
    public settings: SettingsService,
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
  /** Kolom & arah pengurutan; penamaannya mengikuti halaman Pembelian. */
  sortBy: string = 'date';
  sortByDirection: 'asc' | 'desc' = 'desc';
  page: number = 1;
  /** Nilai awal dari pengaturan pengguna; tetap bisa diubah per halaman. */
  pageSize: number = this.settings.pageSize;
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

  /**
   * Ganti kolom pengurut; mengklik kolom yang sama membalik arahnya.
   * Pengurutan dilakukan di server supaya mencakup seluruh data.
   */
  changeSortBy(sortBy: string) {
    if (this.sortBy === sortBy) {
      this.sortByDirection = this.sortByDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = sortBy;
      this.sortByDirection = 'asc';
    }

    this.fetch(1);
  }

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
        sortBy: this.sortBy,
        sortByDirection: this.sortByDirection,
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

  /**
   * Nama jenis PO diambil dari berkas terjemahan; peta lama dipakai sebagai
   * cadangan bila kodenya belum punya terjemahan.
   */
  typeLabel(code: string): string {
    const key = purchaseTypeKey(code);
    const label = this.translate.instant(key);
    return label === key ? PURCHASE_TYPE_LABELS[code] || code : label;
  }

  total(po: any): number {
    const dpp = Number(po.dpp) || 0;
    const ppn = Number(po.ppn) || 0;
    return dpp + (dpp * ppn) / 100;
  }

  createNewPurchaseOrder() {
    this.openTypeSelector();
  }

  /** Tipe PO yang sudah punya template cetak. */
  // PO-H disimpan sebagai 'H1' (badan usaha) atau 'H2' (perorangan),
  // bukan 'H' — keduanya memakai dokumen dan helper yang sama.
  private readonly printableTypes = [
    'G',
    'C',
    'D',
    'F',
    'B',
    'H',
    'H1',
    'H2',
    '5.1.6',
  ];

  canReprint(po: any): boolean {
    return this.printableTypes.includes(po?.purchaseType);
  }

  /**
   * Cetak ulang dokumen PO. Data diambil ulang dari server, dan poin
   * perjanjian dirakit dari template + templateVersion PO tersebut —
   * bukan dari teks tersimpan — sehingga hasilnya konsisten dengan datanya.
   */

  /** Buka detail PO: tampilan rapi atau data mentah. */
  viewOrder(po: any) {
    this.dialog.open(PurchaseOrderViewComponent, {
      data: { id: po.id },
      maxWidth: '94vw',
      autoFocus: false,
    });
  }

  reprint(po: any) {
    if (!this.canReprint(po)) return;
    this.isReprinting = po.id;

    this.apiService
      .get(`purchase-orders/${po.id}`, {})
      .subscribe({
        next: (data: any) => {
          const custom = data.customData || {};
          try {
            const printData = {
              poType: po.purchaseType,
              purchaseOrderName: data.name,
              date: data.date,
              projectName: data.projectName,
              supplierName: data.supplierName ?? '',
              supplierPrefix: data.supplierPrefix ?? '',
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
                // Catatan per baris disimpan pada kolom remarks_1.
                remarks: it.remarks_1 || '',
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
                materialType: custom.materialType,
                deliveryDate: custom.deliveryDate,
              },
              additionalClauses: custom.additionalClauses || [],
            };

            if (String(po.purchaseType || '').startsWith('H')) {
              // SPK pekerjaan: bentuk dokumen mengikuti jenis pekerjaannya.
              const scope = custom.workScope || 'borongan';
              const ringkas = scope !== 'borongan';
              printPurchaseOrderH({
                purchaseOrderName: data.name,
                date: data.date,
                projectName: data.projectName,
                supplierName: data.supplierName ?? '',
                supplierPrefix: data.supplierPrefix ?? '',
                supplierAddress: data.supplierAddress ?? '',
                supplierCity: data.supplierCity ?? '',
                supplierNpwp: data.supplierNpwp ?? '',
                supplierPIC: custom.supplierPIC ?? '',
                pasal1: buildClauseLines('H', custom, data.templateVersion),
                scopes: (data.items || []).map((it: any) => ({
                  task: it.task || it.item_description || '',
                  quantity: Number(it.quantity) || 0,
                  unit: it.unit,
                  price: Number(it.price) || 0,
                })),
                isLumpSum: custom.rateType === 'lumpsum',
                lumpSumPrice: Number(custom.lumpSumPrice) || 0,
                includePpn: Number(data.ppn) > 0,
                kewajiban: custom.kewajiban || [],
                keterangan: custom.keterangan || [],
                pasal5: buildPasal5(custom, custom.billingDocuments),
                mode: ringkas ? 'ringkas' : 'lengkap',
                sections:
                  scope === 'grouting'
                    ? buildGroutingClauses(custom)
                    : scope.startsWith('mandor-')
                      ? buildMandorClauses(custom, scope)
                      : undefined,
                catatan:
                  scope === 'buang-lumpur'
                    ? buildBuangLumpurClauses(custom)
                    : undefined,
                closingText:
                  scope === 'buang-lumpur'
                    ? undefined
                    : ringkas
                      ? 'Demikian PERJANJIAN KERJA SAMA ini dibuat sesuai dengan kesepakatan bersama dan akan digunakan sebagai dasar pekerjaan dan penagihan.'
                      : undefined,
              });
            } else if (po.purchaseType === 'B') {
              // SPK sewa alat: nama alat dari katalog equipment
              printPurchaseOrderB({
                purchaseOrderName: data.name,
                date: data.date,
                projectName: data.projectName,
                supplierName: data.supplierName ?? '',
                supplierPrefix: data.supplierPrefix ?? '',
                supplierAddress: data.supplierAddress ?? '',
                supplierCity: data.supplierCity ?? '',
                supplierNpwp: data.supplierNpwp ?? '',
                items: (data.items || []).map((it: any) => ({
                  name:
                    it.equipment_name || it.item_description || it.task || '',
                  quantity: Number(it.quantity) || 0,
                  unit: it.unit,
                  price: Number(it.price) || 0,
                })),
                includePpn: Number(data.ppn) > 0,
                templateVersion: data.templateVersion,
                clauseContext: { paymentTermText: custom.paymentTerm },
                additionalClauses: printData.additionalClauses,
              });
            } else if (po.purchaseType === 'D') {
              // SPK tenaga kerja: satu baris item = satu komponen upah
              printPurchaseOrderD({
                purchaseOrderName: data.name,
                date: data.date,
                projectName: data.projectName,
                workerName: data.supplierName ?? '',
                workerPrefix: data.supplierPrefix ?? '',
                workerAddress: data.supplierAddress ?? '',
                workerCity: data.supplierCity ?? '',
                workerNpwp: data.supplierNpwp ?? '',
                task: (data.items || [])[0]?.task,
                items: (data.items || []).map((it: any) => ({
                  label: it.remarks_3 || it.task || '',
                  amount: Number(it.price) || 0,
                  unit: it.unit,
                })),
                templateVersion: data.templateVersion,
                clauseContext: printData.clauseContext,
                additionalClauses: printData.additionalClauses,
              });
            } else if (
              po.purchaseType === 'F' &&
              custom.materialType === 'ujitekan'
            ) {
              // jasa uji: dokumennya SPK
              printPurchaseOrderB({
                ...printData,
                includePpn: Number(data.ppn) > 0,
              });
            } else if (po.purchaseType === 'C') {
              printPurchaseOrderC({
                ...printData,
                // komponen pajak khas PO-C (pembelian BBM)
                pbbkbPercent: Number(custom.pbbkbPercent) || 0,
                pph22: Number(custom.pph22) || 0,
              });
            } else {
              printPurchaseOrderG(printData);
            }
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
          title: this.translate.instant('confirm.deleteTitle'),
          prompt: this.translate.instant('confirm.deleteNamed', {
            name: po.name,
          }),
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

  /** Kode jenis PO -> segmen rute pembuatannya. */
  private readonly createRoutes: Record<string, string> = {
    A: 'A',
    B: 'B',
    C: 'C',
    D: 'D',
    F: 'F',
    G: 'G',
    H: 'H',
    '5.1.1': '511',
    '5.1.2': '512',
    '5.1.6': '516',
    '5.1.12': '5112',
    '6.3.1': '631',
    '6.3.2': '632',
    '6.4.1': '641',
  };

  /**
   * Pemilih jenis PO dibuka sebagai dialog, bukan halaman tersendiri, agar
   * daftar PO tetap terlihat dan menutupnya tidak perlu navigasi balik.
   */
  openTypeSelector() {
    this.dialog
      .open(PurchaseOrderTypeSelectorComponent, {
        maxWidth: '94vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((type: string) => {
        if (!type) return;
        const segment = this.createRoutes[type];
        if (!segment) {
          this.snackBar.open(`Jenis PO ${type} belum tersedia`, 'Close', {
            duration: 3000,
          });
          return;
        }
        this.router.navigate(['Create', segment], { relativeTo: this.route });
      });
  }
}
