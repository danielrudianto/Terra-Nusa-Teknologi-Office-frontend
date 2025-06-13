import { Component } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from 'src/app/services/api.service';
import { SupplierViewComponent } from './supplier-view/supplier-view.component';
import { debounceTime } from 'rxjs';
import { DeleteConfirmationComponent } from 'src/app/components/delete-confirmation/delete-confirmation.component';

@Component({
  selector: 'app-supplier-list',
  templateUrl: './supplier-list.component.html',
  styleUrls: ['./supplier-list.component.scss'],
  standalone: false,
})
export class SupplierListComponent {
  constructor(private apiService: ApiService, private dialog: MatDialog) {}

  isLoading: boolean = false;

  formControl: FormControl = new FormControl('');

  suppliers: any[] = [];
  page: number = 1;
  pageSize: number = 10;
  count: number = 0;
  displayedColumns: string[] = ['name', 'address', 'phone', 'email', 'action'];

  ngOnInit(): void {
    this.fetchSuppliers();

    this.formControl.valueChanges.pipe(debounceTime(500)).subscribe((_) => {
      this.fetchSuppliers(1);
    });
  }

  fetchSuppliers(targetPage: number = 1) {
    this.isLoading = true;

    this.page = targetPage;
    this.apiService
      .get('suppliers', {
        page: this.page,
        pageSize: this.pageSize,
        keyword: this.formControl.value,
      })
      .subscribe({
        next: (res: any) => {
          this.suppliers = res.data;
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

  changePage(event: any) {
    if (event.pageSize == this.pageSize) {
      const targetPage = event.pageIndex + 1;
      this.fetchSuppliers(targetPage);
    } else {
      this.pageSize = event.pageSize;
      this.page = 1;
      this.fetchSuppliers(1);
    }
  }

  onConfirmDelete(id: number) {
    this.dialog.open(DeleteConfirmationComponent, {
      data: {
        title: 'Delete supplier',
        prompt: 'Are you sure you want to delete this supplier?',
      },
    });
  }

  onViewDetail(id: number) {
    this.dialog.open(SupplierViewComponent, {
      data: {
        id: id,
      },
      maxWidth: '600px',
    });
  }
}
