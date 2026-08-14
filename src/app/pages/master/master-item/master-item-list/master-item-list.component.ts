import { CommonModule } from '@angular/common';
import { CanDirective } from '../../../../directives/can.directive';
import { Component } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
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
import { debounceTime } from 'rxjs';
import { DeleteConfirmationComponent } from 'src/app/components/delete-confirmation/delete-confirmation.component';
import { HeaderTitleComponent } from 'src/app/components/header-title/header-title.component';
import { TranslatePipe } from '@ngx-translate/core';
import { MasterItemCreateComponent } from '../master-item-create/master-item-create.component';
import { MasterItemUpdateComponent } from '../master-item-update/master-item-update.component';
import { MasterItemViewComponent } from '../master-item-view/master-item-view.component';
import { MasterItemFilterComponent } from './master-item-filter/master-item-filter.component';
import { ApiService } from 'src/app/services/api.service';
import { purchaseTypeLabel } from 'src/app/constants/purchase-type-label.constant';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateService } from '@ngx-translate/core';
import { SettingsService } from '../../../../services/setting.service';

@Component({
  selector: 'app-master-item-list',
  standalone: true,
  imports: [
    CanDirective,
    TranslatePipe,
    MatProgressSpinnerModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatPaginatorModule,
    MatButtonModule,
    MatMenuModule,
    MatSnackBarModule,
    MatProgressBarModule,
    MatTooltipModule,
    HeaderTitleComponent,
  ],
  templateUrl: './master-item-list.component.html',
  styleUrl: './master-item-list.component.scss',
})
export class MasterItemListComponent {
  constructor(
    public settings: SettingsService,
    private translate: TranslateService,
    private apiService: ApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
  ) {}

  isLoading: boolean = false;
  isImporting: boolean = false;

  searchControl: FormControl = new FormControl('');
  brandControl: FormControl = new FormControl('');
  typeControl: FormControl = new FormControl('');
  purchaseTypeControl: FormControl = new FormControl('');

  brands: string[] = [];
  types: string[] = [];
  // opsi purchaseType yang relevan untuk master item
  /*
   * Labelnya disusun dari `purchaseTypeLabel`, bukan ditulis di sini.
   *
   * Nama jenis PO sudah punya satu sumber yang mengikuti bahasa aplikasi;
   * menuliskannya lagi membuat penyaring ini menampilkan "G — General"
   * sementara layar lain menampilkan "Alat bantu dan perlengkapan proyek".
   */
  private readonly KODE_MASTER_ITEM = ['G', 'C', 'F', '5.1.1', '5.1.2'];

  get purchaseTypeOptions(): { code: string; label: string }[] {
    return this.KODE_MASTER_ITEM.map((code) => ({
      code,
      label: `${code} — ${purchaseTypeLabel(this.translate, code)}`,
    }));
  }
  items: any[] = [];
  page: number = 1;
  /** Nilai awal dari pengaturan pengguna; tetap bisa diubah per halaman. */
  pageSize: number = this.settings.pageSize;
  count: number = 0;
  displayedColumns: string[] = [
    'sku',
    'description',
    'brand',
    'type',
    'unit',
    'availablePurchaseType',
    'action',
  ];

  ngOnInit(): void {
    this.fetchItems();
    this.fetchFacets();

    this.searchControl.valueChanges.pipe(debounceTime(400)).subscribe(() => {
      this.fetchItems(1);
    });
  }

  /** Kolom & arah pengurutan; dikirim ke server agar mencakup seluruh data. */
  sortBy: string = 'sku';
  sortByDirection: 'asc' | 'desc' = 'asc';

  /** Mengklik kolom yang sama membalik arahnya. */
  changeSortBy(sortBy: string) {
    if (this.sortBy === sortBy) {
      this.sortByDirection = this.sortByDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = sortBy;
      this.sortByDirection = 'asc';
    }

    this.fetchItems();
  }

  fetchItems(targetPage: number = 1) {
    this.isLoading = true;
    this.page = targetPage;
    this.apiService
      .get('master-items', {
        sortBy: this.sortBy,
        sortByDirection: this.sortByDirection,
        keyword: this.searchControl.value || '',
        page: this.page,
        page_size: this.pageSize,
        purchase_type: this.purchaseTypeControl.value || '',
        brand: this.brandControl.value || '',
        item_type: this.typeControl.value || '',
      })
      .subscribe({
        next: (res: any) => {
          this.items = res.data || [];
          this.count = res.count || 0;
        },
        error: (err) => {
          this.snackBar.open(
            err?.error?.detail || 'Gagal memuat data',
            'Close',
            { duration: 3000 },
          );
        },
      })
      .add(() => {
        this.isLoading = false;
      });
  }

  fetchFacets() {
    this.apiService.get('master-items/facets', {}).subscribe({
      next: (res: any) => {
        this.brands = res.brands || [];
        this.types = res.types || [];
      },
    });
  }

  hasActiveFilter(): boolean {
    return !!(
      this.brandControl.value ||
      this.typeControl.value ||
      this.purchaseTypeControl.value
    );
  }

  resetFilters() {
    this.brandControl.setValue('', { emitEvent: false });
    this.typeControl.setValue('', { emitEvent: false });
    this.purchaseTypeControl.setValue('', { emitEvent: false });
    this.fetchItems(1);
  }

  activeFilterCount(): number {
    let n = 0;
    if (this.brandControl.value) n++;
    if (this.typeControl.value) n++;
    if (this.purchaseTypeControl.value) n++;
    return n;
  }

  openFilter() {
    this.dialog
      .open(MasterItemFilterComponent, {
        width: '440px',
        maxWidth: '92vw',
        autoFocus: false,
        data: {
          brands: this.brands,
          types: this.types,
          purchaseTypeOptions: this.purchaseTypeOptions,
          brand: this.brandControl.value || '',
          type: this.typeControl.value || '',
          purchaseType: this.purchaseTypeControl.value || '',
        },
      })
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          this.brandControl.setValue(result.brand, { emitEvent: false });
          this.typeControl.setValue(result.type, { emitEvent: false });
          this.purchaseTypeControl.setValue(result.purchaseType, {
            emitEvent: false,
          });
          this.fetchItems(1);
        }
      });
  }

  changePage(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.fetchItems(event.pageIndex + 1);
  }

  /** availablePurchaseType can be a string ("G,B") from DB or an array from Meilisearch */
  typeChips(item: any): string[] {
    const v = item?.availablePurchaseType;
    if (!v) return [];
    if (Array.isArray(v)) return v;
    return String(v)
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
  }

  typeLabel(code: string): string {
    return purchaseTypeLabel(this.translate, code);
  }

  // ---- CSV import ----
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    this.isImporting = true;
    this.apiService
      .post('master-items/import', formData)
      .subscribe({
        next: (res: any) => {
          const msg = `Import selesai — ${res.inserted} ditambah, ${res.skipped_duplicates} dilewati, ${res.failed} gagal`;
          this.snackBar.open(msg, 'Close', { duration: 6000 });
          this.fetchItems(1);
        },
        error: (err) => {
          this.snackBar.open(
            err?.error?.detail || 'Gagal import CSV',
            'Close',
            { duration: 4000 },
          );
        },
      })
      .add(() => {
        this.isImporting = false;
        input.value = ''; // allow re-selecting the same file
      });
  }

  createItem() {
    this.dialog
      .open(MasterItemCreateComponent, {
        width: '640px',
        maxWidth: '94vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((created) => {
        if (created) this.fetchItems(1);
      });
  }

  viewItem(item: any) {
    this.dialog
      .open(MasterItemViewComponent, {
        data: { item },
        width: '560px',
        maxWidth: '94vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((result) => {
        if (result?.action === 'edit') {
          this.editItem(result.item);
        }
      });
  }

  editItem(item: any) {
    this.dialog
      .open(MasterItemUpdateComponent, {
        data: { item },
        width: '640px',
        maxWidth: '94vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((updated) => {
        if (updated) this.fetchItems(this.page);
      });
  }

  deleteItem(item: any) {
    const ref = this.dialog.open(DeleteConfirmationComponent, {
      data: {
        title: this.translate.instant('confirm.deleteTitle'),
        prompt: this.translate.instant('confirm.deleteNamed', {
          name: item.sku,
        }),
      },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.apiService.delete('master-items/' + item.id).subscribe({
        next: () => {
          this.snackBar.open(
      this.translate.instant('notify.deleteSuccess'), 'Close', { duration: 2000 });
          this.fetchItems(this.page);
        },
        error: (err) => {
          this.snackBar.open(
            err?.error?.detail || 'Gagal menghapus item',
            'Close',
            { duration: 3000 },
          );
        },
      });
    });
  }
}
