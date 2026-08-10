import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

interface FilterDialogData {
  brands: string[];
  types: string[];
  purchaseTypeOptions: { code: string; label: string }[];
  brand: string;
  type: string;
  purchaseType: string;
}

@Component({
  selector: 'app-master-item-filter',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
  ],
  templateUrl: './master-item-filter.component.html',
  styleUrl: './master-item-filter.component.scss',
})
export class MasterItemFilterComponent {
  brandControl: FormControl;
  typeControl: FormControl;
  purchaseTypeControl: FormControl;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: FilterDialogData,
    private dialogRef: MatDialogRef<MasterItemFilterComponent>,
  ) {
    this.brandControl = new FormControl(data.brand || '');
    this.typeControl = new FormControl(data.type || '');
    this.purchaseTypeControl = new FormControl(data.purchaseType || '');
  }

  hasActiveFilter(): boolean {
    return !!(
      this.brandControl.value ||
      this.typeControl.value ||
      this.purchaseTypeControl.value
    );
  }

  reset(): void {
    this.brandControl.setValue('');
    this.typeControl.setValue('');
    this.purchaseTypeControl.setValue('');
  }

  apply(): void {
    this.dialogRef.close({
      brand: this.brandControl.value || '',
      type: this.typeControl.value || '',
      purchaseType: this.purchaseTypeControl.value || '',
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
