import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { debounceTime } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-equipment-selector',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatProgressBarModule,
  ],
  templateUrl: './equipment-selector.component.html',
  styleUrl: './equipment-selector.component.scss',
})
export class EquipmentSelectorComponent {
  constructor(
    private apiService: ApiService,
    private dialogRef: MatDialogRef<EquipmentSelectorComponent>,
  ) {}

  searchControl = new FormControl('');
  items: any[] = [];
  isLoading = false;

  ngOnInit(): void {
    this.fetch();
    this.searchControl.valueChanges.pipe(debounceTime(350)).subscribe(() => this.fetch());
  }

  fetch() {
    this.isLoading = true;
    this.apiService
      .get('master-equipment', { keyword: this.searchControl.value || '', page: 1, page_size: 25 })
      .subscribe({
        next: (res: any) => (this.items = res.data || []),
        error: () => (this.items = []),
      })
      .add(() => (this.isLoading = false));
  }

  select(item: any) { this.dialogRef.close(item); }
  onCancel() { this.dialogRef.close(); }
}