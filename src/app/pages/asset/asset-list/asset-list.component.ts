import { Component, ViewChild, inject } from '@angular/core';
import { ServerMessageService } from 'src/app/services/server-message.service';
import { CanDirective } from '../../../directives/can.directive';
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
import { TranslatePipe } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PurchaseViewComponent } from '../../purchase/purchase-view/purchase-view.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AssetListPurchaseOrderSelectorComponent } from './asset-list-purchase-order-selector/asset-list-purchase-order-selector.component';
import { debounceTime } from 'rxjs';
import { MatMenuModule } from '@angular/material/menu';
import { AssetCreateComponent } from '../asset-create/asset-create.component';
import { AssetUpdateComponent } from '../asset-update/asset-update.component';
import { AssetViewComponent } from '../asset-view/asset-view.component';
import { RefreshButtonComponent } from '../../../components/refresh-button/refresh-button.component';

@Component({
  selector: 'app-asset-list',
  imports: [
    CanDirective,
    TranslatePipe,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    HeaderTitleComponent,
    RefreshButtonComponent,
  ],
  templateUrl: './asset-list.component.html',
  styleUrl: './asset-list.component.scss',
  standalone: true,
})
export class AssetListComponent {
  private readonly serverMessage = inject(ServerMessageService);
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
    this.fetchAssets();

    this.formControl.valueChanges.pipe(debounceTime(500)).subscribe(() => {
      this.fetchAssets(0);
    });
  }

  changePage(event: PageEvent) {
    if (this.page == event.pageIndex) {
      this.pageSize = event.pageSize;
      this.fetchAssets(0);
    } else {
      this.fetchAssets(event.pageIndex);
    }
  }

  changeSortBy(field: string) {
    if (this.sortBy == field) {
      this.sortByDirection = this.sortByDirection == 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = field;
      this.sortByDirection = 'asc';
    }

    this.fetchAssets(0);
  }

  fetchAssets(targetPage: number = 0) {
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
    this.dialog
      .open(AssetCreateComponent)
      .afterClosed()
      .subscribe((result) => {
        if (result) this.fetchAssets(0);
      });
  }

  onViewAsset(asset: any) {
    this.dialog
      .open(AssetViewComponent, {
        data: { asset },
        width: '600px',
        maxWidth: '94vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((result) => {
        if (result?.action === 'edit') {
          this.onEditAsset(result.asset);
        } else if (result?.action === 'purchase') {
          this.openPurchase(result.asset.purchaseOrderName);
        }
      });
  }

  onEditAsset(asset: any) {
    this.dialog
      .open(AssetUpdateComponent, {
        data: { id: asset.id },
        width: '720px',
        maxWidth: '94vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((result) => {
        if (result) this.fetchAssets(0);
      });
  }

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
          this.snackBar.open(
          this.serverMessage.terjemahkan(error), 'Close', {
            duration: 3000,
          });
        },
      });
  }
}
