import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-client-update',
  standalone: true,
  imports: [
    TranslatePipe,
    CommonModule,
    MatDialogModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatButtonModule,
  ],
  templateUrl: './client-update.component.html',
  styleUrl: './client-update.component.scss',
})
export class ClientUpdateComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private apiService: ApiService,
    private dialog: MatDialogRef<ClientUpdateComponent>,
    private snackbar: MatSnackBar,
  ) {}

  isSubmitting: boolean = false;

  ngOnInit(): void {
    this.fetchByID(this.data.id);
  }

  formGroup: FormGroup = new FormGroup({
    id: new FormControl('', Validators.required),
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

  fetchByID(id: number) {
    this.apiService.get('clients/' + id, {}).subscribe({
      next: (data) => {
        this.formGroup.patchValue(data);
      },
      error: (error) => {
        this.snackbar.open(error, 'Close', {
          duration: 1000,
        });
        this.dialog.close();
      },
    });
  }

  submit() {
    this.isSubmitting = true;
    this.apiService
      .put('clients/' + this.data.id, this.formGroup.value)
      .subscribe({
        next: (_) => {
          this.snackbar.open('Client updated successfully', 'Close', {
            duration: 1000,
          });
          this.dialog.close(this.formGroup.value);
        },
        error: (error) => {
          this.snackbar.open(error, 'Close', {
            duration: 1000,
          });
        },
      })
      .add(() => {
        this.isSubmitting = false;
      });
  }
}
