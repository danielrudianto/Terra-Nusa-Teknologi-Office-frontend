import { Component } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { debounceTime } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';

@Component({
    selector: 'app-supplier-selector',
    templateUrl: './supplier-selector.component.html',
    styleUrls: ['./supplier-selector.component.scss'],
    standalone: false
})
export class SupplierSelectorComponent {
  constructor(
    private apiService: ApiService,
    private dialog: MatDialogRef<SupplierSelectorComponent>
  ) {}

  searchBar: FormControl = new FormControl('');
  page: number = 1;
  isLoading: boolean = false;
  suppliers: any[] = [];
  supplierCount: number = 0;

  ngOnInit(): void {
    this.searchBar.valueChanges.pipe(debounceTime(500)).subscribe((value) => {
      const keyword = value.trim();
      this.search(1);
    });
  }

  search(targetPage: number) {
    this.page = targetPage;
    const keyword = this.searchBar.value.trim();
    this.isLoading = true;
    this.apiService
      .get('suppliers', {
        keyword: keyword,
        page: targetPage,
      })
      .subscribe({
        next: (response: any) => {
          this.suppliers = response.data;
          this.supplierCount = response.count;
        },
        error: (error) => {
          console.error('Error fetching suppliers:', error);
          this.suppliers = [];
          this.supplierCount = 0;
        },
      })
      .add(() => {
        this.isLoading = false;
      });
  }

  selectSupplier(supplier: any) {
    // Handle the selection of a supplier
    console.log('Selected supplier:', supplier);
    // You can emit an event or perform any action you need with the selected supplier
    this.dialog.close(supplier);
  }
}
