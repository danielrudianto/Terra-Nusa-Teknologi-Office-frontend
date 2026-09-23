import { panelSamping } from '../../../../helpers/panel-samping';
import { HapusTundaService } from 'src/app/services/hapus-tunda.service';
import { CommonModule } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { CanDirective } from '../../../../directives/can.directive';
import { ServerMessageService } from 'src/app/services/server-message.service';
import { Component, inject } from '@angular/core';
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
import { debounceTime } from 'rxjs';
import { HeaderTitleComponent } from 'src/app/components/header-title/header-title.component';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiService } from 'src/app/services/api.service';
import { MasterEquipmentCreateComponent } from '../master-equipment-create/master-equipment-create.component';
import { MasterEquipmentViewComponent } from '../master-equipment-view/master-equipment-view.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RefreshButtonComponent } from '../../../../components/refresh-button/refresh-button.component';
import { KerangkaTabelDirective } from '../../../../directives/kerangka-tabel.directive';
import { PILIHAN_BARIS } from 'src/app/constants/paginasi.constant';

@Component({
  selector: 'app-master-equipment-list',
  standalone: true,
  imports: [
    KerangkaTabelDirective,
    CanDirective,
    TranslatePipe,
    MatProgressSpinnerModule,
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatPaginatorModule,
    MatButtonModule,
    MatMenuModule,
    MatSnackBarModule,
    MatProgressBarModule,
    HeaderTitleComponent,
    RefreshButtonComponent,
  ],
  templateUrl: './master-equipment-list.component.html',
  styleUrl: './master-equipment-list.component.scss',
})
export class MasterEquipmentListComponent {
  /** Pilihan baris per halaman — satu daftar untuk seluruh aplikasi. */
  readonly pilihanBaris = PILIHAN_BARIS;

  private readonly hapusTunda = inject(HapusTundaService);
  private readonly serverMessage = inject(ServerMessageService);

  private readonly translate = inject(TranslateService);
  constructor(
    private apiService: ApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
  ) {}

  isLoading = false;
  searchControl = new FormControl('');
  items: any[] = [];
  page = 1;
  pageSize = 10;
  count = 0;
  displayedColumns = [
    'name',
    'category',
    'capacity',
    'brand',
    'unit',
    'action',
  ];

  ngOnInit(): void {
    this.fetch();
    this.searchControl.valueChanges
      .pipe(debounceTime(400))
      .subscribe(() => this.fetch(1));
  }

  fetch(targetPage: number = 1) {
    this.isLoading = true;
    this.page = targetPage;
    this.apiService
      .get('master-equipment', {
        keyword: this.searchControl.value || '',
        page: this.page,
        page_size: this.pageSize,
      })
      .subscribe({
        next: (res: any) => {
          this.items = res.data || [];
          this.count = res.count || 0;
        },
        error: (err) =>
          this.snackBar.open(
            this.serverMessage.terjemahkan(err, 'notify.loadFailed'),
            'Close',
            { duration: 3000 },
          ),
      })
      .add(() => (this.isLoading = false));
  }

  changePage(e: PageEvent) {
    this.pageSize = e.pageSize;
    this.fetch(e.pageIndex + 1);
  }

  createItem() {
    this.dialog
      .open(MasterEquipmentCreateComponent, {
        width: '640px',
        maxWidth: '94vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((created) => {
        if (created) this.fetch(1);
      });
  }

  /**
   * Buka dialog pembuatan dalam mode ubah.
   *
   * Alat DIKIRIM UTUH, bukan hanya idnya. Dialog karena itu terisi seketika
   * tanpa permintaan tambahan — datanya sudah ada di daftar, dan memuat
   * ulang hanya menambah jeda yang terlihat sebagai kedipan.
   */
  ubahItem(item: any) {
    this.dialog
      .open(MasterEquipmentCreateComponent, {
        width: '640px',
        maxWidth: '94vw',
        autoFocus: false,
        data: item,
      })
      .afterClosed()
      .subscribe((berubah) => {
        // Halaman yang sedang dibuka dimuat ulang, bukan kembali ke halaman
        // satu: yang baru saja mengubah alat di halaman tiga tidak perlu
        // mencarinya lagi dari awal.
        if (berubah) this.fetch(this.page);
      });
  }

  viewItem(item: any) {
    this.dialog.open(MasterEquipmentViewComponent, panelSamping({
      width: '560px',
      maxWidth: '94vw',
      autoFocus: false,
      data: { equipment: item },
    }));
  }

  deleteItem(baris: any) {
    // Tanpa dialog konfirmasi: barisnya hilang seketika dan bisa diurungkan
    // selama beberapa detik — lihat HapusTundaService.
    const item = baris;
    if (!item) return;
    const posisi = this.items.findIndex((x: any) => x.id === item.id);
    this.hapusTunda.hapus({
      label: item.name,
      kirim: () => this.apiService.delete('master-equipment/' + item.id),
      sembunyikan: () => {
        this.items = this.items.filter((x: any) => x.id !== item.id);
        this.count = Math.max(0, (this.count || 0) - 1);
      },
      pulihkan: () => {
        if (this.items.some((x: any) => x.id === item.id)) return;
        const a = [...this.items];
        a.splice(Math.min(Math.max(posisi, 0), a.length), 0, item);
        this.items = a;
        this.count = (this.count || 0) + 1;
      },
      berhasil: () => this.fetch(this.page),
    });
  }
}
