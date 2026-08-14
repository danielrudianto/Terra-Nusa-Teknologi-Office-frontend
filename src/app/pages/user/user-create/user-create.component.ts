import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from 'src/app/services/api.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-user-create',
  templateUrl: './user-create.component.html',
  styleUrl: './user-create.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    TranslatePipe,
  ],
})
export class UserCreateComponent {
  constructor(
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<UserCreateComponent>,
    private translate: TranslateService,
  ) {}

  isSubmitting: boolean = false;
  levels = [1, 2, 3, 4, 5];

  formGroup: FormGroup = new FormGroup({
    name: new FormControl('', Validators.required),
    email: new FormControl('', [Validators.required, Validators.email]),
    /*
     * Jabatan; dicetak di bawah nama pada blok tanda tangan dokumen.
     *
     * Opsional karena tidak semua pengguna menandatangani dokumen. Batasnya
     * mengikuti kolomnya di basis data (100), agar isian panjang ditolak di
     * layar, bukan setelah dikirim.
     */
    position: new FormControl('', Validators.maxLength(100)),
    password: new FormControl('', [
      Validators.required,
      Validators.minLength(6),
    ]),
    authenticationLevel: new FormControl(1, Validators.required),
  });

  onSubmit() {
    if (this.formGroup.invalid) return;
    this.isSubmitting = true;
    this.apiService
      .post('users', this.formGroup.value)
      .subscribe({
        next: () => {
          this.snackBar.open(
            this.translate.instant('user.created'),
            this.translate.instant('user.close'),
            { duration: 3000 },
          );
          this.dialogRef.close(true);
        },
        error: () => {
          this.snackBar.open(
            this.translate.instant('user.createFailed'),
            this.translate.instant('user.close'),
            { duration: 3000 },
          );
        },
      })
      .add(() => {
        this.isSubmitting = false;
      });
  }
}
