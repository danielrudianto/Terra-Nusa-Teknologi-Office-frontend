import { Component, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from '../../../services/api.service';
import { MatTable, MatTableModule } from '@angular/material/table';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { HeaderTitleComponent } from 'src/app/components/header-title/header-title.component';
import { ActivatedRoute, Router } from '@angular/router';

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
  constructor(private dialog: MatDialog, private apiService: ApiService, private router: Router, private route: ActivatedRoute,) {}

  @ViewChild('table') table: MatTable<any> | undefined;

  formControl: FormControl = new FormControl('');
  page: number = 1;
  isLoading: boolean = false;
  clients: any[] = [];
  count: number = 0;

  displayedColumns: string[] = [
    'name',
    'description',
    'brand',
    'type',
    'action',
  ];

  ngOnInit(): void {
    this.fetchClients();
  }

  changePage(event: any) {
    const targetPage = event.pageIndex + 1;
    this.fetchClients(targetPage);
  }

  fetchClients(targetPage: number = 1) {
    this.isLoading = true;

    this.page = targetPage;
    this.apiService
      .get('assets', {
        page: this.page,
        pageSize: 10,
        keyword: this.formControl.value,
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

  onAddAsset(){
    this.router.navigate(['Create'], {
      relativeTo: this.route
    })
  }

  onEditAsset(){

  }
}
