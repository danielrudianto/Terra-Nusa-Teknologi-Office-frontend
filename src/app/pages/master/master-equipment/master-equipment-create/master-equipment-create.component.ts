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
import { DialogGeserDirective } from '../../../../directives/dialog-geser.directive';

@Component({
  selector: 'app-master-equipment-create',
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
    DialogGeserDirective,
  ],
  templateUrl: './master-equipment-create.component.html',
  styleUrl: './master-equipment-create.component.scss',
})
export class MasterEquipmentCreateComponent {
  private readonly translate = inject(TranslateService);
  constructor(
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialogRef<MasterEquipmentCreateComponent>,
  ) {}

  isSubmitting = false;

  categories: string[] = [
    'Forklift',
    'Excavator',
    'Crane',
    'Generator Set',
    'Lainnya',
  ];
  units: string[] = ['hari', 'minggu', 'bulan', 'jam', 'trip'];

  formGroup: FormGroup = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    category: new FormControl('', Validators.required),
    capacity: new FormControl(''),
    brand: new FormControl(''),
    description: new FormControl(''),
    unit: new FormControl('hari', Validators.required),
  });

  onCancel() {
    this.dialog.close();
  }

  onSubmit() {
    this.isSubmitting = true;
    this.apiService
      .post('master-equipment', {
        name: this.formGroup.value.name,
        category: this.formGroup.value.category,
        capacity: this.formGroup.value.capacity || null,
        brand: this.formGroup.value.brand || null,
        description: this.formGroup.value.description || null,
        unit: this.formGroup.value.unit,
      })
      .subscribe({
        next: () => {
          this.snackBar.open(
      this.translate.instant('notify.createSuccess'), 'Close', {
            duration: 3000,
          });
          this.dialog.close(true);
        },
        error: (err) =>
          this.snackBar.open(
            err?.error?.detail || 'Gagal membuat equipment',
            'Close',
            { duration: 3000 },
          ),
      })
      .add(() => (this.isSubmitting = false));
  }
}
