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
  BrandColor,
} from '../../../app/services/setting.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { AvatarComponent } from '../../components/avatar/avatar.component';
import { AvatarBuilderComponent } from '../../components/avatar/avatar-builder/avatar-builder.component';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    AvatarComponent,
    MatTooltipModule,
    TranslatePipe,
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
    private dialog: MatDialog,
  ) {}

  isSaving = false;
  isLoading = false;
  userId: number | null = null;

  textScales: { value: TextScale; label: string; sample: string }[] = [
    { value: 'sm', label: 'Kecil', sample: 'Aa' },
    { value: 'md', label: 'Normal', sample: 'Aa' },
    { value: 'lg', label: 'Besar', sample: 'Aa' },
  ];

  profileFormGroup: FormGroup = new FormGroup({
    name: new FormControl('', [Validators.required]),
    email: new FormControl('', [Validators.email]),
  });

  ngOnInit(): void {
    this.userId = this.authService.userId;
    // profile is read only here — it is managed from the User page
    this.profileFormGroup.disable();
    this.fetchProfile();
  }

  /** Load the signed-in user's profile from the API. */
  fetchProfile(): void {
    if (this.userId == null) return;
    this.isLoading = true;
    this.apiService
      .get('users/' + this.userId, {})
      .subscribe({
        next: (data: any) => {
          this.profileFormGroup.patchValue({
            name: data?.name ?? '',
            email: data?.email ?? '',
          });
        },
        error: () => {
          // fall back to whatever the token carries
          const info: any = this.authService.userInfo;
          this.profileFormGroup.patchValue({
            name: info?.name ?? '',
            email: info?.email ?? '',
          });
        },
      })
      .add(() => {
        this.isLoading = false;
      });
  }

  editAvatar(): void {
    if (this.userId == null) return;
    this.dialog.open(AvatarBuilderComponent, {
      data: {
        userId: this.userId,
        name: this.profileFormGroup.get('name')?.value,
      },
    });
  }

  selectBrandColor(color: BrandColor): void {
    this.settings.setBrandColor(color);
  }

  get brandColorKeys(): BrandColor[] {
    return Object.keys(this.settings.brandColors) as BrandColor[];
  }

  get initials(): string {
    const name: string = this.profileFormGroup.get('name')?.value || '?';
    return name.charAt(0).toUpperCase();
  }

  selectTextScale(scale: TextScale): void {
    this.settings.setTextScale(scale);
  }
}
