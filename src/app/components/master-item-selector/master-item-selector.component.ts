import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { debounceTime } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { DialogGeserDirective } from '../../directives/dialog-geser.directive';

@Component({
  selector: 'app-master-item-selector',
  standalone: true,
  imports: [
    TranslatePipe,
    MatProgressSpinnerModule,
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    MatIconModule,
    DialogGeserDirective,
  ],
  templateUrl: './master-item-selector.component.html',
  styleUrl: './master-item-selector.component.scss',
})
export class MasterItemSelectorComponent {
  constructor(
    private apiService: ApiService,
    private dialogRef: MatDialogRef<MasterItemSelectorComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { purchaseType?: string },
  ) {}

  searchControl: FormControl = new FormControl('');
  items: any[] = [];
  isLoading: boolean = false;

  get purchaseType(): string {
    return this.data?.purchaseType || 'G';
  }

  ngOnInit(): void {
    this.fetch();
    this.searchControl.valueChanges.pipe(debounceTime(350)).subscribe(() => {
      this.fetch();
    });
  }

  fetch() {
    this.isLoading = true;
    this.apiService
      .get('master-items', {
        keyword: this.searchControl.value || '',
        purchase_type: this.purchaseType,
        page: 1,
        page_size: 25,
        /*
         * Barang favorit didahulukan — HANYA di sini.
         *
         * Katalognya seribu baris lebih; yang benar-benar dipakai sehari-hari
         * jauh lebih sedikit. Tanpa ini, barang yang sama dicari ulang setiap
         * kali, dan yang tidak menemukannya membuat entri kembar.
         *
         * Daftar Master Barang sengaja TIDAK memakainya: di sana yang dicari
         * justru barang yang jarang dipakai.
         */
        favoritDulu: true,
      })
      .subscribe({
        next: (res: any) => {
          this.items = res.data || [];
        },
        error: () => {
          this.items = [];
        },
      })
      .add(() => {
        this.isLoading = false;
      });
  }

  select(item: any) {
    this.dialogRef.close(item);
  }

  onCancel() {
    this.dialogRef.close();
  }
}
