import { Component, Inject } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatInputModule } from '@angular/material/input';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-client-update',
  imports: [
    MatDialogModule,
    MatSnackBarModule,
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
    private snackbar: MatSnackBar
  ) {}

  isSubmitting: boolean = false;

  ngOnInit(): void {
    this.fetchByID(this.data.id);
  }

  formGroup: FormGroup = new FormGroup({
    id: new FormControl('', Validators.required),
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
      });
  }
}
