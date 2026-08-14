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
  BRAND_COLORS,
  BrandColor,
  Density,
  PAGE_SIZES,
  PageSize,
  SettingsService,
  TextScale,
} from '../../../app/services/setting.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { AvatarComponent } from '../../components/avatar/avatar.component';
import { AvatarBuilderComponent } from '../../components/avatar/avatar-builder/avatar-builder.component';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  AppLang,
  LangOption,
  LanguageService,
} from '../../../app/services/language.service';

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
    private language: LanguageService,
    private translate: TranslateService,
    private authService: AuthService,
    public settings: SettingsService,
    private dialog: MatDialog,
  ) {}

  isSaving = false;
  isLoading = false;
  userId: number | null = null;

  /*
   * Label memakai kunci i18n; `value` tetap kode ukurannya.
   *
   * Sebelumnya labelnya ditulis langsung, sehingga "Kecil/Normal/Besar"
   * tetap berbahasa Indonesia meski aplikasinya diganti ke bahasa lain —
   * padahal pilihan ini berada di halaman yang sama dengan pemilih bahasa.
   *
   * `sample` tidak diterjemahkan: "Aa" adalah contoh bentuk huruf, bukan
   * kata. Menerjemahkannya justru menghilangkan gunanya.
   */
  textScales: { value: TextScale; key: string; sample: string }[] = [
    { value: 'sm', key: 'settings.textSm', sample: 'Aa' },
    { value: 'md', key: 'settings.textMd', sample: 'Aa' },
    { value: 'lg', key: 'settings.textLg', sample: 'Aa' },
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
      // `users/me`, bukan `users/{id}`: yang terakhir menuntut izin melihat
      // seluruh pengguna, sedangkan ini profil miliknya sendiri.
      .get('users/me', {})
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

  readonly pageSizes = PAGE_SIZES;

  selectPageSize(value: PageSize): void {
    this.settings.setPageSize(value);
  }

  selectDensity(value: Density): void {
    this.settings.setDensity(value);
  }

  /**
   * Daftar warna merek tidak pernah berubah saat aplikasi berjalan, jadi
   * kuncinya dihitung sekali. Sebagai getter, `Object.keys()` membuat array
   * baru setiap putaran change detection tanpa alasan.
   *
   * Dibaca langsung dari konstantanya, bukan lewat `this.settings`: field
   * yang menyentuh parameter constructor saat inisialisasi memicu TS2729
   * ("used before its initialization").
   */
  readonly brandColorKeys = Object.keys(BRAND_COLORS) as BrandColor[];

  get initials(): string {
    const name: string = this.profileFormGroup.get('name')?.value || '?';
    return name.charAt(0).toUpperCase();
  }

  selectTextScale(scale: TextScale): void {
    this.settings.setTextScale(scale);
  }

  // ---- Bahasa -----------------------------------------------------------

  get languages(): LangOption[] {
    return this.language.languages;
  }

  get currentLang(): AppLang {
    return this.language.current;
  }

  selectLang(code: AppLang): void {
    this.language.use(code);
  }

  // ---- Ganti sandi ------------------------------------------------------

  readonly passwordFormGroup = new FormGroup(
    {
      currentPassword: new FormControl('', Validators.required),
      newPassword: new FormControl('', [
        Validators.required,
        Validators.minLength(6),
      ]),
      confirmPassword: new FormControl('', Validators.required),
    },
    { validators: [samaDenganKonfirmasi()] },
  );

  isChangingPassword = false;
  showPassword = false;

  changePassword(): void {
    if (this.passwordFormGroup.invalid || this.isChangingPassword) return;

    this.isChangingPassword = true;
    const v = this.passwordFormGroup.value;

    this.apiService
      .put('users/me/password', {
        currentPassword: v.currentPassword,
        newPassword: v.newPassword,
      })
      .subscribe({
        next: () => {
          this.passwordFormGroup.reset();
          this.snackBar.open(
            this.translate.instant('settings.passwordChanged'),
            'Close',
            { duration: 4000 },
          );
        },
        error: (err) => {
          /*
           * Pesan dipetakan di sini, bukan menampilkan `detail` dari server.
           *
           * Server mengirim kode tetap (`CURRENT_PASSWORD_INVALID`) supaya
           * bisa diterjemahkan; menampilkannya mentah membuat pengguna
           * membaca istilah teknis berbahasa Inggris.
           */
          const kode = err?.error?.detail;
          const kunci =
            kode === 'CURRENT_PASSWORD_INVALID'
              ? 'settings.passwordWrong'
              : kode === 'PASSWORD_UNCHANGED'
                ? 'settings.passwordSame'
                : 'settings.passwordFailed';
          this.snackBar.open(this.translate.instant(kunci), 'Close', {
            duration: 5000,
          });
        },
      })
      .add(() => {
        this.isChangingPassword = false;
      });
  }
}

/**
 * Sandi baru dan konfirmasinya harus sama.
 *
 * Diperiksa di tingkat grup, bukan per kolom: kesalahannya milik pasangan
 * kolom, dan menandainya di salah satu saja membuat pesan muncul sebelum
 * kolom keduanya sempat diisi.
 */
function samaDenganKonfirmasi() {
  return (group: any) => {
    const baru = group.get('newPassword')?.value;
    const konfirmasi = group.get('confirmPassword')?.value;
    if (!baru || !konfirmasi) return null;
    return baru === konfirmasi ? null : { konfirmasiTidakCocok: true };
  };
}
