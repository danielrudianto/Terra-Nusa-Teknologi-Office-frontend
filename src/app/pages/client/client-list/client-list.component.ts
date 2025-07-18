import { Component, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ClientUpdateComponent } from '../client-update/client-update.component';
import { ApiService } from '../../../services/api.service';
import { MatTable } from '@angular/material/table';

@Component({
  selector: 'app-client-list',
  standalone: false,
  templateUrl: './client-list.component.html',
  styleUrl: './client-list.component.scss',
})
export class ClientListComponent {
  constructor(private dialog: MatDialog, private apiService: ApiService) {}

  @ViewChild('table') table: MatTable<any> | undefined;

  formControl: FormControl = new FormControl('');
  page: number = 1;
  isLoading: boolean = false;
  clients: any[] = [];
  count: number = 0;

  displayedColumns: string[] = ['name', 'address', 'city', 'npwp', 'action'];

  ngOnInit(): void {
    this.fetchClients();
  }

  changePage(event: any) {
    const targetPage = event.pageIndex + 1;
    this.fetchClients(targetPage);
  }

  openUpdateClient(id: number) {
    this.dialog
      .open(ClientUpdateComponent, {
        data: {
          id: id,
        },
      })
      .afterClosed()
      .subscribe((data) => {
        if (data) {
          const index = this.clients.findIndex((x) => x.id == id);
          if (index != -1) {
            this.clients[index] = data;
            this.table?.renderRows();
          }
        }
      });
  }

  fetchClients(targetPage: number = 1) {
    this.isLoading = true;

    this.page = targetPage;
    this.apiService
      .get('clients', {
        page: this.page,
        keyword: this.formControl.value,
      })
      .subscribe({
        next: (res: any) => {
          this.clients = res.data;
          this.count = res.count;
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
