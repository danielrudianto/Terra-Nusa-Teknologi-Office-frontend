import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../../app/services/api.service';
import { AuthService } from '../../../app/services/auth.service';
import {
  SettingsService,
  TextScale,
} from '../../../app/services/setting.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatSnackBarModule,
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnInit {
  constructor(
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private authService: AuthService,
    public settings: SettingsService,
  ) {}

  isSaving = false;

  textScales: { value: TextScale; label: string; sample: string }[] = [
    { value: 'sm', label: 'Kecil', sample: 'Aa' },
    { value: 'md', label: 'Normal', sample: 'Aa' },
    { value: 'lg', label: 'Besar', sample: 'Aa' },
  ];

  profileFormGroup: FormGroup = new FormGroup({
    name: new FormControl('', [Validators.required]),
    email: new FormControl('', [Validators.email]),
    position: new FormControl(''),
  });

  ngOnInit(): void {
    const info: any = this.authService.userInfo;
    this.profileFormGroup.patchValue({
      name: info?.name ?? '',
      email: info?.email ?? '',
      position: info?.position ?? '',
    });
  }

  get initials(): string {
    const name: string = this.profileFormGroup.get('name')?.value || '?';
    return name.charAt(0).toUpperCase();
  }

  selectTextScale(scale: TextScale): void {
    this.settings.setTextScale(scale);
  }

  onSaveProfile(): void {
    if (this.profileFormGroup.invalid) return;
    this.isSaving = true;
    // NOTE: requires a backend endpoint (PUT /profile). Wired optimistically —
    // when the endpoint exists this just works; until then it surfaces the error.
    this.apiService
      .put('profile', this.profileFormGroup.value)
      .subscribe({
        next: () => {
          this.snackBar.open('Profil berhasil disimpan', 'Close', {
            duration: 3000,
          });
        },
        error: (error) => {
          this.snackBar.open(
            error?.error?.detail ?? 'Gagal menyimpan profil',
            'Close',
            { duration: 3000 },
          );
        },
      })
      .add(() => {
        this.isSaving = false;
      });
  }
}
