import { HapusTundaService } from 'src/app/services/hapus-tunda.service';
import { Component, inject } from '@angular/core';
import { ServerMessageService } from 'src/app/services/server-message.service';
import { TranslateService } from '@ngx-translate/core';
import { CanDirective } from '../../../directives/can.directive';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from 'src/app/services/api.service';
import { debounceTime } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { HeaderTitleComponent } from '../../../components/header-title/header-title.component';
import { TranslatePipe } from '@ngx-translate/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { SupplierUpdateComponent } from '../supplier-update/supplier-update.component';
import { SupplierBlacklistDialogComponent } from '../supplier-blacklist-dialog/supplier-blacklist-dialog.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SupplierCreateComponent } from '../supplier-create/supplier-create.component';
import { RefreshButtonComponent } from '../../../components/refresh-button/refresh-button.component';
import { SupplierReportComponent } from '../supplier-report/supplier-report.component';
import { KerangkaTabelDirective } from '../../../directives/kerangka-tabel.directive';
import { NamaBadanComponent, inisialBadan } from '../../../components/nama-badan/nama-badan.component';

@Component({
  selector: 'app-supplier-list',
  imports: [
    NamaBadanComponent,
    KerangkaTabelDirective,
    CanDirective,
    CommonModule,
    MatTableModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    HeaderTitleComponent,
    MatIconModule,
    MatPaginatorModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    RouterModule,
    TranslatePipe,
    MatChipsModule,
    RefreshButtonComponent,
  ],
  templateUrl: './supplier-list.component.html',
  styleUrls: ['./supplier-list.component.scss'],
  standalone: true,
})
export class SupplierListComponent {
  /** Huruf lencana dari NAMA pemasok, bukan dari bentuk badan usahanya. */
  readonly inisialBadan = inisialBadan;

  private readonly hapusTunda = inject(HapusTundaService);
  private readonly ruteCari = inject(ActivatedRoute, { optional: true });
  private readonly serverMessage = inject(ServerMessageService);
  private readonly translate = inject(TranslateService);
  constructor(
    private apiService: ApiService,
    private dialog: MatDialog,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {}

  isLoading: boolean = false;

  formControl: FormControl = new FormControl('');

  suppliers: any[] = [];
  page: number = 0;
  pageSize: number = 10;
  count: number = 0;
  displayedColumns: string[] = ['name', 'address', 'phone', 'email', 'action'];

  /** Filter blacklist: 'all' | 'active' | 'blacklist' */
  activeFilter: 'all' | 'active' | 'blacklist' = 'all';

  ngOnInit(): void {
    // Dibuka dari pencarian global (Ctrl+K) dengan `?search=` — kotaknya
    // terisi lebih dulu, jadi pemuatan pertama sudah tersaring.
    const dariAlamat = this.ruteCari?.snapshot?.queryParamMap?.get('search');
    if (dariAlamat) this.formControl.setValue(dariAlamat, { emitEvent: false });
    this.fetchSuppliers();

    this.formControl.valueChanges.pipe(debounceTime(500)).subscribe((_) => {
      this.fetchSuppliers(0);
    });
  }

  setFilter(filter: 'all' | 'active' | 'blacklist') {
    if (this.activeFilter === filter) return;
    this.activeFilter = filter;
    this.fetchSuppliers(0);
  }

  fetchSuppliers(targetPage: number = 1) {
    this.isLoading = true;

    this.page = targetPage;
    this.apiService
      .get('suppliers', {
        page: this.page,
        pageSize: this.pageSize,
        keyword: this.formControl.value,
        ...(this.activeFilter !== 'all'
          ? { isBlacklist: this.activeFilter === 'blacklist' }
          : {}),
      })
      .subscribe({
        next: (res: any) => {
          this.suppliers = res.data;
          this.count = res.count;
        },
        error: (err) => {
          this.snackBar.open(
          this.serverMessage.terjemahkan(err), 'Close', {
            duration: 3000,
          });
        },
      })
      .add(() => {
        this.isLoading = false;
      });
  }

  changePage(event: any) {
    if (event.pageSize == this.pageSize) {
      const targetPage = event.pageIndex;
      this.fetchSuppliers(targetPage);
    } else {
      this.pageSize = event.pageSize;
      this.fetchSuppliers(0);
    }
  }

  openBlacklist(element: any) {
    this.dialog
      .open(SupplierBlacklistDialogComponent, {
        width: '460px',
        maxWidth: '94vw',
        autoFocus: false,
        data: {
          id: element.id,
          name: element.name,
          isBlacklist: element.isBlacklist,
          blacklistReason: element.blacklistReason,
        },
      })
      .afterClosed()
      .subscribe((changed) => {
        if (changed) this.fetchSuppliers(this.page);
      });
  }

  onConfirmDelete(id: number) {
    // Tanpa dialog konfirmasi: barisnya hilang seketika dan bisa diurungkan
    // selama beberapa detik — lihat HapusTundaService.
    const item = this.suppliers.find((x: any) => x.id == id);
    if (!item) return;
    const posisi = this.suppliers.findIndex((x: any) => x.id === item.id);
    this.hapusTunda.hapus({
      label: item.name,
      kirim: () => this.apiService.delete(`suppliers/${item.id}`),
      sembunyikan: () => {
        this.suppliers = this.suppliers.filter((x: any) => x.id !== item.id);
        this.count = Math.max(0, (this.count || 0) - 1);
      },
      pulihkan: () => {
        if (this.suppliers.some((x: any) => x.id === item.id)) return;
        const a = [...this.suppliers];
        a.splice(Math.min(Math.max(posisi, 0), a.length), 0, item);
        this.suppliers = a;
        this.count = (this.count || 0) + 1;
      },
    });
  }

  onUpdateSupplier(id: number) {
    this.dialog.open(SupplierUpdateComponent, {
      data: {
        id: id,
        readOnly: false,
      },
    });
  }

  /**
   * Buka laporan pemasok.
   *
   * Barisnya DIKIRIM UTUH, bukan hanya idnya: nama, kota, dan status daftar
   * hitam sudah ada di daftar, dan memuat ulang hanya menambah jeda yang
   * terlihat sebagai kedipan pada kepala dialog.
   */
  bukaLaporan(supplier: any): void {
    this.dialog.open(SupplierReportComponent, {
      maxWidth: '96vw',
      autoFocus: false,
      data: { supplier },
    });
  }

  onViewDetail(id: number) {
    this.dialog.open(SupplierUpdateComponent, {
      data: {
        id: id,
        readOnly: true,
      },
    });
  }

  createNewSupplier() {
    this.dialog
      .open(SupplierCreateComponent, {
        width: '640px',
        maxWidth: '94vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((created) => {
        if (created) this.fetchSuppliers(0);
      });
  }
}
