import { Component, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from '../../../services/api.service';
import { MatTable } from '@angular/material/table';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'app-asset-list',
  standalone: false,
  templateUrl: './asset-list.component.html',
  styleUrl: './asset-list.component.scss',
})
export class AssetListComponent {
  constructor(private dialog: MatDialog, private apiService: ApiService) {}

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
}
