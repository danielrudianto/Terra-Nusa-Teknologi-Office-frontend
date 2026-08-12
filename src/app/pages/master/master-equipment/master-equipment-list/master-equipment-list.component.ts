import { CommonModule } from '@angular/common';
import { CanDirective } from '../../../../directives/can.directive';
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
import { debounceTime } from 'rxjs';
import { DeleteConfirmationComponent } from 'src/app/components/delete-confirmation/delete-confirmation.component';
import { HeaderTitleComponent } from 'src/app/components/header-title/header-title.component';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiService } from 'src/app/services/api.service';
import { MasterEquipmentCreateComponent } from '../master-equipment-create/master-equipment-create.component';
import { MasterEquipmentViewComponent } from '../master-equipment-view/master-equipment-view.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-master-equipment-list',
  standalone: true,
  imports: [
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
  ],
  templateUrl: './master-equipment-list.component.html',
  styleUrl: './master-equipment-list.component.scss',
})
export class MasterEquipmentListComponent {
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
            err?.error?.detail || 'Gagal memuat data',
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

  viewItem(item: any) {
    this.dialog.open(MasterEquipmentViewComponent, {
      width: '560px',
      maxWidth: '94vw',
      autoFocus: false,
      data: { equipment: item },
    });
  }

  deleteItem(item: any) {
    this.dialog
      .open(DeleteConfirmationComponent, {
        data: {
          title: 'Hapus equipment',
          prompt: `Yakin mau menghapus "${item.name}"?`,
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.apiService.delete('master-equipment/' + item.id).subscribe({
          next: () => {
            this.snackBar.open('Equipment dihapus', 'Close', {
              duration: 2000,
            });
            this.fetch(this.page);
          },
          error: (err) =>
            this.snackBar.open(
              err?.error?.detail || 'Gagal menghapus',
              'Close',
              { duration: 3000 },
            ),
        });
      });
  }
}
