import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

import { SettingsService, ThemeMode } from '../../services/setting.service';
import { AccountService } from '../../services/account.service';
import { PermissionService } from '../../services/permission.service';

/**
 * Pengaturan mobile: tema dan keluar.
 *
 * Tema punya TIGA pilihan — Terang, Gelap, dan Ikuti Perangkat. "Ikuti
 * Perangkat" ('system') berpindah sendiri saat setelan gelap ponsel berubah;
 * SettingsService yang memantaunya.
 */
@Component({
  selector: 'app-pengaturan',
  standalone: true,
  imports: [CommonModule, MatIconModule, TranslatePipe],
  templateUrl: './pengaturan.component.html',
  styleUrls: ['./pengaturan.component.scss'],
})
export class PengaturanComponent {
  private readonly settings = inject(SettingsService);
  private readonly akun = inject(AccountService);
  private readonly izin = inject(PermissionService);

  readonly pilihanTema: { nilai: ThemeMode; ikon: string; kunci: string }[] = [
    { nilai: 'light', ikon: 'light_mode', kunci: 'mobile.setelan.terang' },
    { nilai: 'dark', ikon: 'dark_mode', kunci: 'mobile.setelan.gelap' },
    { nilai: 'system', ikon: 'brightness_auto', kunci: 'mobile.setelan.ikutDevice' },
  ];

  get tema(): ThemeMode {
    return this.settings.theme;
  }
  pilihTema(t: ThemeMode): void {
    this.settings.setTheme(t);
  }

  get nama(): string {
    return this.akun.displayName;
  }
  get inisial(): string {
    return this.akun.initials;
  }
  get level(): number {
    return this.izin.level();
  }

  keluar(): void {
    try {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
    } catch {}
    window.location.href = '/Login';
  }
}
