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

@Component({
  selector: 'app-master-item-selector',
  standalone: true,
  imports: [
    MatProgressSpinnerModule,
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
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
