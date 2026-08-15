import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import {
  DeleteConfirmationComponent,
  DeleteConfirmationData,
} from '../delete-confirmation/delete-confirmation.component';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { debounceTime } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';
import { TranslatePipe } from '@ngx-translate/core';
import { DialogGeserDirective } from '../../directives/dialog-geser.directive';

@Component({
  selector: 'app-supplier-selector',
  imports: [
    TranslatePipe,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    MatDialogModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    DialogGeserDirective,
  ],
  templateUrl: './supplier-selector.component.html',
  styleUrls: ['./supplier-selector.component.scss'],
  standalone: true,
})
export class SupplierSelectorComponent {
  constructor(
    private apiService: ApiService,
    private dialog: MatDialogRef<SupplierSelectorComponent>,
    private confirmDialog: MatDialog,
  ) {}

  searchBar: FormControl = new FormControl('');
  page: number = 0;
  isLoading: boolean = false;
  suppliers: any[] = [];
  supplierCount: number = 0;

  ngOnInit(): void {
    this.searchBar.valueChanges.pipe(debounceTime(500)).subscribe((value) => {
      const keyword = value.trim();
      this.search(0);
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
    // Supplier yang di-blacklist tetap boleh dipilih, tapi wajib konfirmasi dulu.
    if (supplier?.isBlacklist) {
      const reason = (supplier.blacklistReason || '').trim();
      const data: DeleteConfirmationData = {
        title: 'Supplier di-blacklist',
        prompt:
          `${supplier.name} termasuk dalam daftar blacklist` +
          (reason ? ` dengan alasan: "${reason}".` : '.') +
          ' Apakah Anda tetap ingin memilih supplier ini?',
      };
      this.confirmDialog
        .open(DeleteConfirmationComponent, {
          data,
          width: '440px',
          maxWidth: '94vw',
          autoFocus: false,
        })
        .afterClosed()
        .subscribe((confirmed) => {
          if (confirmed) this.dialog.close(supplier);
        });
      return;
    }
    this.dialog.close(supplier);
  }
}
