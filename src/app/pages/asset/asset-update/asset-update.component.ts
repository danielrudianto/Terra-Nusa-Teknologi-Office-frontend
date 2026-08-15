import { Component, Inject, OnInit, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import {
  FormControl,
  FormGroup,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialogRef,
  MatDialogModule,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { DialogGeserDirective } from '../../../directives/dialog-geser.directive';

@Component({
  selector: 'app-asset-update',
  standalone: true,
  templateUrl: './asset-update.component.html',
  styleUrl: './asset-update.component.scss',
  imports: [
    CommonModule,
    MatButtonModule,
    MatSnackBarModule,
    MatFormFieldModule,
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatDatepickerModule,
    MatSelectModule,
    MatDialogModule,
    MatIconModule,
    TranslatePipe,
    DialogGeserDirective,
  ],
})
export class AssetUpdateComponent implements OnInit {
  private readonly translate = inject(TranslateService);
  constructor(
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialogRef<AssetUpdateComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { id: number },
  ) {}

  isSubmitting = false;
  isLoading = false;

  assetFormGroup: FormGroup = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(45)]),
    description: new FormControl('', [Validators.required, Validators.maxLength(500)]),
    brand: new FormControl('', [Validators.required, Validators.maxLength(50)]),
    type: new FormControl('', Validators.required),
    depreciation: new FormControl(0, [Validators.required, Validators.min(0)]),
    location: new FormControl('', [Validators.required, Validators.maxLength(50)]),
    purchaseOrderName: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    purchaseDate: new FormControl('', Validators.required),
    value: new FormControl(0, [Validators.required, Validators.min(0)]),
    // opsional: kalau asset sudah dijual
    soldValue: new FormControl(null),
    soldDate: new FormControl(null),
  });

  ngOnInit(): void {
    this.loadAsset();
  }

  private loadAsset(): void {
    this.isLoading = true;
    this.apiService.get(`assets/${this.data.id}`, {}).subscribe({
      next: (asset: any) => {
        this.assetFormGroup.patchValue({
          name: asset.name,
          description: asset.description,
          brand: asset.brand,
          type: asset.type,
          depreciation: asset.depreciation,
          location: asset.location,
          purchaseOrderName: asset.purchaseOrderName,
          purchaseDate: asset.purchaseDate ? new Date(asset.purchaseDate) : '',
          value: asset.value,
          soldValue: asset.soldValue ?? null,
          soldDate: asset.soldDate ? new Date(asset.soldDate) : null,
        });
        this.isLoading = false;
      },
      error: (error) => {
        this.snackBar.open(
          error?.error?.detail || 'Gagal memuat data asset',
          'Close',
          { duration: 3000 },
        );
        this.isLoading = false;
      },
    });
  }

  private toISO(value: any): string | null {
    if (!value) return null;
    const d = new Date(value);
    return `${d.getFullYear()}-${(d.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  }

  onSubmit(): void {
    if (this.assetFormGroup.invalid) return;
    this.isSubmitting = true;
    const raw = this.assetFormGroup.value;
    const payload: any = {
      name: raw.name,
      description: raw.description,
      brand: raw.brand,
      type: raw.type,
      depreciation: raw.depreciation,
      location: raw.location,
      purchaseOrderName: raw.purchaseOrderName,
      value: raw.value,
      purchaseDate: this.toISO(raw.purchaseDate),
      soldValue: raw.soldValue !== '' ? raw.soldValue : null,
      soldDate: this.toISO(raw.soldDate),
    };

    this.apiService
      .put(`assets/${this.data.id}`, payload)
      .subscribe({
        next: () => {
          this.snackBar.open(
      this.translate.instant('notify.updateSuccess'), 'Close', {
            duration: 3000,
          });
          this.dialog.close(true);
        },
        error: (error) => {
          this.snackBar.open(
            error?.error?.detail || 'Gagal memperbarui asset',
            'Close',
            { duration: 3000 },
          );
        },
      })
      .add(() => {
        this.isSubmitting = false;
      });
  }

  onCancel(): void {
    this.dialog.close();
  }
}
