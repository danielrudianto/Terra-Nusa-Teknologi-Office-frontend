import { CommonModule } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Component, inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
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

@Component({
  selector: 'app-client-create',
  standalone: true,
  imports: [
    TranslatePipe,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
  ],
  templateUrl: './client-create.component.html',
  styleUrl: './client-create.component.scss',
})
export class ClientCreateComponent {
  private readonly translate = inject(TranslateService);
  constructor(
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialogRef<ClientCreateComponent>,
  ) {}

  isSubmitting: boolean = false;
  formGroup: FormGroup = new FormGroup({
    prefix: new FormControl('', Validators.required),
    name: new FormControl('', [Validators.required, Validators.maxLength(255)]),
    address: new FormControl('', [Validators.required, Validators.maxLength(255)]),
    city: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    province: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    npwp: new FormControl('', Validators.maxLength(20)),
    phoneNumber: new FormControl('', [
      Validators.required,
      Validators.pattern(/^\+?[0-9\s-]{10,15}$/),
      Validators.maxLength(20),
    ]),
    email: new FormControl('', [Validators.email, Validators.maxLength(100)]),
  });

  onCancel() {
    this.dialog.close();
  }

  onSubmit() {
    this.isSubmitting = true;
    this.apiService
      .post('clients', {
        prefix: this.formGroup.value.prefix,
        name: this.formGroup.value.name,
        address: this.formGroup.value.address,
        city: this.formGroup.value.city,
        province: this.formGroup.value.province,
        npwp: this.formGroup.value.npwp || null,
        phoneNumber: this.formGroup.value.phoneNumber,
        email: this.formGroup.value.email || null,
      })
      .subscribe({
        next: (data) => {
          this.snackBar.open(
      this.translate.instant('notify.createSuccess'), 'Close', {
            duration: 3000,
          });
          this.formGroup.reset();
          // close and signal the list to refresh
          this.dialog.close(true);
        },
        error: (error) => {
          this.snackBar.open(
            `Error creating client: ${error.error.message || error.message}`,
            'Close',
            {
              duration: 3000,
            },
          );
        },
      })
      .add(() => {
        this.isSubmitting = false;
      });
  }
}
