import { Component, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ClientUpdateComponent } from '../client-update/client-update.component';
import { ApiService } from '../../../services/api.service';
import { MatTable } from '@angular/material/table';
import { debounceTime } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ClientCreateComponent } from '../client-create/client-create.component';
import { TranslatePipe } from '@ngx-translate/core';
import { HeaderTitleComponent } from '../../../components/header-title/header-title.component';
import { RefreshButtonComponent } from '../../../components/refresh-button/refresh-button.component';

@Component({
  selector: 'app-client-list',
  standalone: true,
  templateUrl: './client-list.component.html',
  styleUrl: './client-list.component.scss',
  imports: [
    HeaderTitleComponent,
    CommonModule,
    MatTableModule,
    MatInputModule,
    MatFormFieldModule,
    FormsModule,
    ReactiveFormsModule,
    MatPaginatorModule,
    MatIconModule,
    MatButtonModule,
    TranslatePipe,
    RefreshButtonComponent,
  ],
})
export class ClientListComponent {
  constructor(
    private dialog: MatDialog,
    private apiService: ApiService,
  ) {}

  @ViewChild('table') table: MatTable<any> | undefined;

  formControl: FormControl = new FormControl('');
  page: number = 1;
  isLoading: boolean = false;
  clients: any[] = [];
  count: number = 0;

  displayedColumns: string[] = ['name', 'address', 'city', 'npwp', 'action'];

  ngOnInit(): void {
    this.fetchClients();

    this.formControl.valueChanges.pipe(debounceTime(500)).subscribe(() => {
      this.fetchClients(1);
    });
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

  onAddClient() {
    this.dialog
      .open(ClientCreateComponent, {
        width: '640px',
        maxWidth: '94vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((created) => {
        if (created) this.fetchClients(1);
      });
  }
}
