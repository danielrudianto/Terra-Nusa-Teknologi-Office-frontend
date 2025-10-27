import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { debounceTime } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';

@Component({
  templateUrl: './client-selector.component.html',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  styleUrl: './client-selector.component.scss',
  standalone: true,
})
export class ClientSelectorComponent {
  constructor(
    private dialog: MatDialogRef<ClientSelectorComponent>,
    private apiService: ApiService,
    private snackBar: MatSnackBar
  ) {}

  isLoading: boolean = false;
  clients: any[] = [];
  count: number = 0;
  page: number = 1;

  searchBar: FormControl = new FormControl('');

  ngOnInit(): void {
    this.fetchClients();

    this.searchBar.valueChanges.pipe(debounceTime(500)).subscribe(() => {
      this.fetchClients(1);
    });
  }

  selectClient(client: any) {
    this.dialog.close(client);
  }

  fetchClients(targetPage: number = 1) {
    this.isLoading = true;
    this.page = targetPage;

    this.apiService
      .get('clients', {
        keyword: this.searchBar.value,
        page: this.page,
        pageSize: 10,
        sortBy: 'name',
        sortByDirection: 'asc',
      })
      .subscribe({
        next: (data: any) => {
          this.clients = data.data;
          this.count = data.count;
        },
        error: (error) => {
          console.error('Error fetching clients:', error);
          this.snackBar.open(
            'Error fetching clients: ' + error.detail,
            'Close',
            {}
          );
        },
      })
      .add(() => {
        this.isLoading = false;
      });
  }
}
