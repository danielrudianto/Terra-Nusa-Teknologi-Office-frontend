import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  FormsModule,
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
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from 'src/app/services/api.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { DialogGeserDirective } from '../../../directives/dialog-geser.directive';

@Component({
  selector: 'app-user-update',
  templateUrl: './user-update.component.html',
  styleUrl: './user-update.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatIconModule,
    TranslatePipe,
    DialogGeserDirective,
  ],
})
export class UserUpdateComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { id: number },
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<UserUpdateComponent>,
    private translate: TranslateService,
  ) {}

  isSubmitting: boolean = false;
  levels = [1, 2, 3, 4, 5];

  formGroup: FormGroup = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    email: new FormControl('', [Validators.required, Validators.email, Validators.maxLength(100)]),
    // Jabatan; dicetak pada blok tanda tangan dokumen yang ia setujui.
    position: new FormControl('', Validators.maxLength(100)),
    password: new FormControl('', Validators.maxLength(255)), // optional: blank = keep
    authenticationLevel: new FormControl(1, Validators.required),
    isActive: new FormControl(true),
  });

  ngOnInit(): void {
    this.fetchData();
  }

  fetchData() {
    this.apiService.get('users/' + this.data.id, {}).subscribe({
      next: (data: any) => {
        this.formGroup.patchValue({
          name: data.name,
          email: data.email,
          position: data.position ?? '',
          authenticationLevel: data.authenticationLevel || 1,
          isActive: data.isActive,
        });
      },
      error: (error) => {
        this.snackBar.open(
          error.error?.detail || 'Error',
          this.translate.instant('user.close'),
          { duration: 3000 },
        );
      },
    });
  }

  onSubmit() {
    if (this.formGroup.invalid) return;
    this.isSubmitting = true;

    const payload: any = {
      name: this.formGroup.value.name,
      email: this.formGroup.value.email,
      position: this.formGroup.value.position || null,
      authenticationLevel: this.formGroup.value.authenticationLevel,
      isActive: this.formGroup.value.isActive,
    };
    // only send password when filled
    const pw = (this.formGroup.value.password || '').trim();
    if (pw) payload.password = pw;

    this.apiService
      .put('users/' + this.data.id, payload)
      .subscribe({
        next: () => {
          this.snackBar.open(
            this.translate.instant('user.updated'),
            this.translate.instant('user.close'),
            { duration: 3000 },
          );
          this.dialogRef.close(true);
        },
        error: () => {
          this.snackBar.open(
            this.translate.instant('user.updateFailed'),
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
