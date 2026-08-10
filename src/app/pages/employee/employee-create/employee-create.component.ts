import { Component } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from 'src/app/services/api.service';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-employee-create',
  templateUrl: './employee-create.component.html',
  styleUrl: './employee-create.component.scss',
  standalone: true,
  imports: [
    TranslatePipe,
    MatDialogModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatSelectModule,
  ],
})
export class EmployeeCreateComponent {
  constructor(
    private apiService: ApiService,
    private snackBar: MatSnackBar,
  ) {}

  isSubmitting: boolean = false;
  formGroup: FormGroup = new FormGroup({
    name: new FormControl('', Validators.required),
    birthday: new FormControl('', Validators.required),
    nik: new FormControl('', [
      Validators.required,
      Validators.minLength(16),
      Validators.maxLength(16),
    ]),
    email: new FormControl('', [Validators.required, Validators.email]),
    phoneNumber: new FormControl('', [
      Validators.required,
      Validators.pattern(/^\d{10,15}$/),
    ]),
    address: new FormControl('', [
      Validators.required,
      Validators.minLength(10),
    ]),
    position: new FormControl('', Validators.required),
    department: new FormControl('', Validators.required),
    taxCategory: new FormControl('', Validators.required),
    startDate: new FormControl('', Validators.required),
  });

  onSubmit() {
    this.isSubmitting = true;
    const date = new Date(this.formGroup.value.birthday);
    const formattedDate = `${date.getFullYear()}-${String(
      date.getMonth() + 1,
    ).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    const startDate = new Date(this.formGroup.value.startDate);
    const formattedStartDate = `${startDate.getFullYear()}-${String(
      startDate.getMonth() + 1,
    ).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;

    this.apiService
      .post('employees', {
        name: this.formGroup.value.name,
        birthday: formattedDate,
        nik: this.formGroup.value.nik,
        email: this.formGroup.value.email,
        phoneNumber: this.formGroup.value.phoneNumber,
        address: this.formGroup.value.address,
        position: this.formGroup.value.position,
        department: this.formGroup.value.department,
        taxCategory: this.formGroup.value.taxCategory,
        startDate: formattedStartDate,
      })
      .subscribe({
        next: (_) => {
          this.snackBar.open('Employee created successfully!', 'Close', {
            duration: 3000,
          });
          this.formGroup.reset();
        },
        error: (error) => {
          console.error('Error creating employee:', error);
          this.snackBar.open(
            'Failed to create employee. Please try again.',
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
