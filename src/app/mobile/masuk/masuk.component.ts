import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslatePipe } from '@ngx-translate/core';

import { PwaPasangComponent } from '../pwa-pasang/pwa-pasang.component';
import { ApiService } from '../../services/api.service';
import { PermissionService } from '../../services/permission.service';
import { ServerMessageService } from '../../services/server-message.service';
import { SettingsService } from '../../services/setting.service';
import {
  LanguageService,
  AppLang,
  LangOption,
} from '../../services/language.service';

/**
 * Masuk — versi MOBILE.
 *
 * MENGAPA TERPISAH DARI LOGIN DESKTOP
 *
 * Login desktop memakai tata letak bootstrap dengan kartu besar dan hiasan
 * bola — di layar ponsel ia tampil kelewat besar dan tidak senada dengan sisa
 * aplikasi mobile. Yang ditulis ulang di sini HANYA tampilannya; alur
 * masuknya sama persis: POST /auth, simpan token, muat izin, lalu ke beranda.
 * Aturan wewenang tidak ada di sini sama sekali, jadi tak ada yang bisa
 * berbeda dari desktop.
 */
@Component({
  selector: 'app-masuk',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    TranslatePipe,
    PwaPasangComponent,
  ],
  templateUrl: './masuk.component.html',
  styleUrls: ['./masuk.component.scss'],
})
export class MasukComponent {
  private readonly api = inject(ApiService);
  private readonly izin = inject(PermissionService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly pesanServer = inject(ServerMessageService);
  private readonly settings = inject(SettingsService);
  private readonly language = inject(LanguageService);

  isSubmitting = false;

  form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', Validators.required),
    remember: new FormControl(true),
  });

  get isDark(): boolean {
    return this.settings.theme === 'dark';
  }
  toggleTheme(): void {
    this.settings.setTheme(this.isDark ? 'light' : 'dark');
  }

  get languages(): LangOption[] {
    return this.language.languages;
  }
  get currentLang(): LangOption {
    return this.language.currentOption;
  }
  setLang(code: AppLang): void {
    this.language.use(code);
  }

  masuk(): void {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }
    this.isSubmitting = true;
    this.api.post('auth', this.form.value).subscribe({
      next: (data: any) => {
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        localStorage.setItem('user', JSON.stringify(data.user));

        const returnUrl = localStorage.getItem('returnUrl');
        localStorage.removeItem('returnUrl');

        // Izin dimuat dulu agar menu tidak sempat tampil kosong.
        this.izin.load(true).finally(() => {
          if (returnUrl && !returnUrl.startsWith('/Login')) {
            this.router.navigateByUrl(returnUrl);
          } else {
            this.router.navigate(['/']);
          }
        });
      },
      error: (error) => {
        this.snackBar.open(this.pesanServer.terjemahkan(error), 'Tutup', {
          duration: 4000,
        });
      },
    }).add(() => (this.isSubmitting = false));
  }
}
