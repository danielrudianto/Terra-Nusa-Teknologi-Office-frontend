import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from 'src/app/services/api.service';
import {
  PURCHASE_TYPE_LABELS,
  MASTER_ITEM_PURCHASE_TYPES,
} from 'src/app/constants/purchase-type-label.constant';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-master-item-update',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    TranslatePipe,
  ],
  templateUrl: './master-item-update.component.html',
  styleUrl: './master-item-update.component.scss',
})
export class MasterItemUpdateComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialogRef<MasterItemUpdateComponent>,
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

  purchaseTypes: { code: string; label: string }[] =
    MASTER_ITEM_PURCHASE_TYPES.map((code) => ({
      code,
      label: PURCHASE_TYPE_LABELS[code] || code,
    }));
  selectedTypes: string[] = [];

  formGroup: FormGroup = new FormGroup({
    description: new FormControl('', Validators.required),
    brand: new FormControl('', [Validators.required, Validators.maxLength(45)]),
    type: new FormControl('', [Validators.required, Validators.maxLength(45)]),
    unit: new FormControl('', Validators.required),
  });

  ngOnInit(): void {
    const item = this.data?.item ?? this.data ?? {};
    this.formGroup.patchValue({
      description: item.description || '',
      brand: item.brand || '',
      type: item.type || '',
      unit: item.unit || '',
    });
    this.selectedTypes = this.normalizeTypes(item.availablePurchaseType);
  }

  get item(): any {
    return this.data?.item ?? this.data ?? {};
  }

  normalizeTypes(v: any): string[] {
    if (!v) return [];
    if (Array.isArray(v)) return [...v];
    return String(v)
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
  }

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

  onSubmit() {
    this.isSubmitting = true;
    const id = this.item.id;
    this.apiService
      .put('master-items/' + id, {
        id: id,
        description: this.formGroup.value.description,
        brand: this.formGroup.value.brand,
        type: this.formGroup.value.type,
        unit: this.formGroup.value.unit,
        availablePurchaseType: this.selectedTypes.join(',') || null,
      })
      .subscribe({
        next: () => {
          this.snackBar.open('Master item berhasil diperbarui', 'Close', {
            duration: 3000,
          });
          this.dialog.close(true);
        },
        error: (err) => {
          this.snackBar.open(
            err?.error?.detail || 'Gagal memperbarui master item',
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
