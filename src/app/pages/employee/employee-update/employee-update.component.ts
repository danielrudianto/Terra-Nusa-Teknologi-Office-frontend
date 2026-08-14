import { Component, Inject, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-employee-update',
  standalone: true,
  imports: [
    TranslatePipe,
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
  ],
  templateUrl: './employee-update.component.html',
  styleUrl: './employee-update.component.scss',
})
export class EmployeeUpdateComponent {
  private readonly translate = inject(TranslateService);
  constructor(
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialogRef<EmployeeUpdateComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { id: number },
  ) {}

  isLoading: boolean = false;
  isSubmitting: boolean = false;

  formGroup: FormGroup = new FormGroup({
    id: new FormControl(this.data.id, Validators.required),
    name: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    birthday: new FormControl('', Validators.required),
    nik: new FormControl('', [
      Validators.required,
      Validators.minLength(16),
      Validators.maxLength(16),
    ]),
    email: new FormControl('', [Validators.required, Validators.email, Validators.maxLength(100)]),
    phoneNumber: new FormControl('', [
      Validators.required,
      Validators.pattern(/^\d{10,15}$/),
      Validators.maxLength(20),
    ]),
    address: new FormControl('', [Validators.required, Validators.maxLength(255)]),
    position: new FormControl('', [Validators.required, Validators.maxLength(50)]),
    department: new FormControl('', [Validators.required, Validators.maxLength(50)]),
    taxCategory: new FormControl('', Validators.required),
  });

  ngOnInit(): void {
    this.fetchEmployee(this.data.id);
  }

  fetchEmployee(id: number) {
    this.apiService
      .get('employees/' + id, {})
      .subscribe({
        next: (res: any) => {
          this.formGroup.patchValue({
            name: res.name,
            birthday: res.birthday,
            nik: res.nik,
            email: res.email,
            phoneNumber: res.phoneNumber,
            address: res.address,
            position: res.position,
            department: res.department,
            taxCategory: res.taxCategory,
          });
        },
        error: (error) => {},
      })
      .add(() => {
        this.isLoading = false;
      });
  }

  onSubmit() {
    this.isSubmitting = true;
    this.apiService
      .put('employees', this.formGroup.value)
      .subscribe({
        next: (data) => {
          this.dialog.close(data);
        },
        error: (error) => {
          this.snackBar.open(
      this.translate.instant('notify.updateFailed'),
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
