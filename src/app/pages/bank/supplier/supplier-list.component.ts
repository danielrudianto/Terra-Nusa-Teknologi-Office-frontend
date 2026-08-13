import { Component, inject } from '@angular/core';
import { ServerMessageService } from 'src/app/services/server-message.service';
import { TranslateService } from '@ngx-translate/core';
import { CanDirective } from '../../../directives/can.directive';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from 'src/app/services/api.service';
import { debounceTime } from 'rxjs';
import { DeleteConfirmationComponent } from 'src/app/components/delete-confirmation/delete-confirmation.component';
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
import { Router, RouterModule } from '@angular/router';
import { SupplierUpdateComponent } from '../supplier-update/supplier-update.component';
import { SupplierBlacklistDialogComponent } from '../supplier-blacklist-dialog/supplier-blacklist-dialog.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SupplierCreateComponent } from '../supplier-create/supplier-create.component';

@Component({
  selector: 'app-supplier-list',
  imports: [
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
  ],
  templateUrl: './supplier-list.component.html',
  styleUrls: ['./supplier-list.component.scss'],
  standalone: true,
})
export class SupplierListComponent {
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
    this.dialog
      .open(DeleteConfirmationComponent, {
        data: {
          title: 'Delete supplier',
          prompt: 'Are you sure you want to delete this supplier?',
        },
      })
      .afterClosed()
      .subscribe((data) => {
        if (data == true) {
          this.apiService.delete(`suppliers/${id}`).subscribe({
            next: () => {
              this.snackBar.open(
      this.translate.instant('notify.deleteSuccess'), 'Close', {
                duration: 3000,
              });
              const index = this.suppliers.findIndex((x) => x.id == id);
              if (index != -1) {
                this.suppliers.splice(index, 1);
              }
            },
            error: (err) => {
              console.error('Error deleting supplier:', err);
            },
          });
        }
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
