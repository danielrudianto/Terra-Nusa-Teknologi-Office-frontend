import { Component, inject } from '@angular/core';
import { ServerMessageService } from 'src/app/services/server-message.service';
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
import { MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-asset-create',
  standalone: true,
  templateUrl: './asset-create.component.html',
  styleUrl: './asset-create.component.scss',
  imports: [
    TranslatePipe,
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
  ],
})
export class AssetCreateComponent {
  private readonly serverMessage = inject(ServerMessageService);
  private readonly translate = inject(TranslateService);
  constructor(
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialogRef<AssetCreateComponent>,
  ) {}

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
    this.isSubmitting = true;
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
          this.snackBar.open(
      this.translate.instant('notify.createSuccess'), 'Close', {
            duration: 3000,
          });
          this.dialog.close(true);
        },
        error: (error) => {
          console.error(`Error: ${error.error.detail}`);
          this.snackBar.open(
          this.serverMessage.terjemahkan(error), 'Close', {
            duration: 3000,
          });
        },
      })
      .add(() => {
        this.isSubmitting = false;
      });
  }

  onCancel() {
    this.dialog.close();
  }
}
