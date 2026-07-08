import { Component, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from '../../../services/api.service';
import { MatTable, MatTableModule } from '@angular/material/table';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { HeaderTitleComponent } from 'src/app/components/header-title/header-title.component';
import { ActivatedRoute, Router } from '@angular/router';
import { PurchaseViewComponent } from '../../purchase/purchase-view/purchase-view.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AssetListPurchaseOrderSelectorComponent } from './asset-list-purchase-order-selector/asset-list-purchase-order-selector.component';
import { debounceTime } from 'rxjs';

@Component({
  selector: 'app-asset-list',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    HeaderTitleComponent,
  ],
  templateUrl: './asset-list.component.html',
  styleUrl: './asset-list.component.scss',
  standalone: true,
})
export class AssetListComponent {
  constructor(
    private dialog: MatDialog,
    private apiService: ApiService,
    private router: Router,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute,
  ) {}

  @ViewChild('table') table: MatTable<any> | undefined;

  formControl: FormControl = new FormControl('');
  page: number = 0;
  pageSize: number = 10;
  isLoading: boolean = false;
  clients: any[] = [];
  count: number = 0;
  sortBy: string = 'purchaseDate';
  sortByDirection: string = 'desc';

  displayedColumns: string[] = [
    'date',
    'name',
    'description',
    'brand',
    'type',
    'purchaseOrderName',
    'value',
    'action',
  ];

  ngOnInit(): void {
    this.fetchClients();

    this.formControl.valueChanges.pipe(debounceTime(500)).subscribe(() => {
      this.fetchClients(0);
    });
  }

  changePage(event: PageEvent) {
    if (this.page == event.pageIndex) {
      this.pageSize = event.pageSize;
      this.fetchClients(0);
    } else {
      this.fetchClients(event.pageIndex);
    }
  }

  changeSortBy(field: string) {
    if (this.sortBy == field) {
      this.sortByDirection = this.sortByDirection == 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = field;
      this.sortByDirection = 'asc';
    }

    this.fetchClients(0);
  }

  fetchClients(targetPage: number = 0) {
    this.isLoading = true;

    this.page = targetPage;
    this.apiService
      .get('assets', {
        page: this.page,
        pageSize: this.pageSize,
        keyword: this.formControl.value,
        sortBy: this.sortBy,
        sortByDirection: this.sortByDirection,
      })
      .subscribe({
        next: (res: any) => {
          this.clients = res.data;
          this.count = res.total_count;
        },
        error: (err) => {
          console.error(err);
        },
      })
      .add(() => {
        this.isLoading = false;
      });
  }

  onAddAsset() {
    this.router.navigate(['Create'], {
      relativeTo: this.route,
    });
  }

  onEditAsset() {}

  openPurchase(purchaseOrderName: string) {
    this.apiService
      .get(`purchases/purchase-order/${purchaseOrderName}`, {})
      .subscribe({
        next: (data: any) => {
          this.dialog.open(AssetListPurchaseOrderSelectorComponent, {
            data: data.data,
          });
        },
        error: (error) => {
          this.snackBar.open(error.error.detail, 'Close', {
            duration: 3000,
          });
        },
      });
  }
}
