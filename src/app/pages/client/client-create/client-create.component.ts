import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-client-create',
  standalone: false,
  templateUrl: './client-create.component.html',
  styleUrl: './client-create.component.scss',
})
export class ClientCreateComponent {
  constructor(private apiService: ApiService, private snackBar: MatSnackBar) {}

  isSubmitting: boolean = false;
  formGroup: FormGroup = new FormGroup({
    prefix: new FormControl('', Validators.required),
    name: new FormControl('', Validators.required),
    address: new FormControl('', Validators.required),
    city: new FormControl('', Validators.required),
    province: new FormControl('', Validators.required),
    npwp: new FormControl('', Validators.maxLength(20)),
    phoneNumber: new FormControl('', [
      Validators.required,
      Validators.pattern(/^\+?[0-9\s-]{10,15}$/),
    ]),
    email: new FormControl('', [Validators.email, Validators.maxLength(100)]),
  });

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
          this.snackBar.open('Client created successfully!', 'Close', {
            duration: 3000,
          });
          this.formGroup.reset();
        },
        error: (error) => {
          this.snackBar.open(
            `Error creating client: ${error.error.message || error.message}`,
            'Close',
            {
              duration: 3000,
            }
          );
        },
      })
      .add(() => {
        this.isSubmitting = false;
      });
  }
}
