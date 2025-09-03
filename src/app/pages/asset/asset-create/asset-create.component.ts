import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-asset-create',
  standalone: false,
  templateUrl: './asset-create.component.html',
  styleUrl: './asset-create.component.scss',
})
export class AssetCreateComponent {
  constructor(private apiService: ApiService, private snackBar: MatSnackBar) {}

  isSubmitting: boolean = false;

  assetFormGroup: FormGroup = new FormGroup({
    name: new FormControl('', Validators.required),
    description: new FormControl('', Validators.required),
    brand: new FormControl('', Validators.required),
    type: new FormControl('', Validators.required),
    depreciation: new FormControl(0, [Validators.required, Validators.min(0)]),
    location: new FormControl('', Validators.required),
    purchaseOrderName: new FormControl('', Validators.required),
    purchaseDate: new FormControl('', Validators.required),
    value: new FormControl(0, [Validators.required, Validators.min(0)]),
  });

  onSubmit() {
    const date = new Date(this.assetFormGroup.value.purchaseDate);
    this.apiService
      .post('assets', {
        ...this.assetFormGroup.value,
        purchaseDate: `${date.getFullYear()}-${(date.getMonth() + 1)
          .toString()
          .padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`,
      })
      .subscribe({
        next: (data) => {
          this.assetFormGroup.reset();
          this.snackBar.open('Asset created successfully', 'Close', {
            duration: 3000,
          });
        },
        error: (error) => {
          this.snackBar.open(error.error.detail, 'Close', {
            duration: 3000,
          });
        },
      });
  }
}
