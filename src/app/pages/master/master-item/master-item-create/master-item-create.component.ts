import { CommonModule } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { Component, inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from 'src/app/services/api.service';

import { TranslatePipe } from '@ngx-translate/core';
import {
  PURCHASE_TYPE_LABELS,
  MASTER_ITEM_PURCHASE_TYPES,
} from 'src/app/constants/purchase-type-label.constant';

@Component({
  selector: 'app-master-item-create',
  standalone: true,
  imports: [
    TranslatePipe,
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
  ],
  templateUrl: './master-item-create.component.html',
  styleUrl: './master-item-create.component.scss',
})
export class MasterItemCreateComponent {
  private readonly translate = inject(TranslateService);
  constructor(
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialogRef<MasterItemCreateComponent>,
  ) {}

  isSubmitting: boolean = false;

  units: string[] = [
    'pcs',
    'set',
    'Kg',
    'gram',
    'ton',
    'm',
    'm2',
    'm3',
    'batang',
    'lembar',
    'roll',
    'dus',
    'sak',
    'pasang',
    'lusin',
    'unit',
    'liter',
    'box',
    'kaleng',
  ];

  // curated purchase types a catalog item can belong to (with labels)
  purchaseTypes: { code: string; label: string }[] =
    MASTER_ITEM_PURCHASE_TYPES.map((code) => ({
      code,
      label: PURCHASE_TYPE_LABELS[code] || code,
    }));
  selectedTypes: string[] = ['G'];

  formGroup: FormGroup = new FormGroup({
    sku: new FormControl('', [Validators.required, Validators.maxLength(45)]),
    description: new FormControl('', Validators.required),
    brand: new FormControl('', [Validators.required, Validators.maxLength(45)]),
    type: new FormControl('', [Validators.required, Validators.maxLength(45)]),
    unit: new FormControl('', Validators.required),
  });

  isTypeSelected(code: string): boolean {
    return this.selectedTypes.includes(code);
  }

  toggleType(code: string) {
    if (this.isTypeSelected(code)) {
      this.selectedTypes = this.selectedTypes.filter((c) => c !== code);
    } else {
      this.selectedTypes = [...this.selectedTypes, code];
    }
  }

  get canSubmit(): boolean {
    return this.formGroup.valid && this.selectedTypes.length > 0;
  }

  onCancel() {
    this.dialog.close();
  }

  uppercaseSku() {
    const value = this.formGroup.get('sku')?.value;
    if (value && value.toUpperCase() !== value) {
      this.formGroup.patchValue({ sku: value.toUpperCase() });
    }
  }

  onSubmit() {
    this.isSubmitting = true;
    this.apiService
      .post('master-items', {
        sku: this.formGroup.value.sku,
        description: this.formGroup.value.description,
        brand: this.formGroup.value.brand,
        type: this.formGroup.value.type,
        unit: this.formGroup.value.unit,
        availablePurchaseType: this.selectedTypes.join(',') || null,
      })
      .subscribe({
        next: () => {
          this.snackBar.open(
      this.translate.instant('notify.createSuccess'), 'Close', {
            duration: 3000,
          });
          this.dialog.close(true);
        },
        error: (err) => {
          this.snackBar.open(
            err?.error?.detail || 'Gagal membuat master item',
            'Close',
            { duration: 3000 },
          );
        },
      })
      .add(() => {
        this.isSubmitting = false;
      });
  }
}
