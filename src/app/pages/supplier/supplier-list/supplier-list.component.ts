import { Component } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from 'src/app/services/api.service';
import { SupplierViewComponent } from './supplier-view/supplier-view.component';
import { debounceTime } from 'rxjs';

@Component({
    selector: 'app-supplier-list',
    templateUrl: './supplier-list.component.html',
    styleUrls: ['./supplier-list.component.scss'],
    standalone: false
})
export class SupplierListComponent {
  constructor(private apiService: ApiService, private dialog: MatDialog) {}

  isLoading: boolean = false;

  formControl: FormControl = new FormControl('');

  suppliers: any[] = [];
  page: number = 1;
  count: number = 0;

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
    const targetPage = event.pageIndex + 1;
    this.fetchSuppliers(targetPage);
  }

  onEdit(id: number) {}

  onViewDetail(id: number) {
    this.dialog.open(SupplierViewComponent, {
      data: {
        id: id,
      },
      maxWidth: '600px',
    });
  }
}
