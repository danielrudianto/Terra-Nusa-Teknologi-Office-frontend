import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { SettingsService, ThemeMode } from '../../services/setting.service';
import { AccountService } from '../../services/account.service';
import { PermissionService } from '../../services/permission.service';
import { PushService } from '../../services/push.service';
import { VersiService } from '../../services/versi.service';
import { PwaPasangService } from '../../services/pwa-pasang.service';
import { PwaPasangComponent } from '../pwa-pasang/pwa-pasang.component';

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
  imports: [
    CommonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe,
    PwaPasangComponent,
  ],
  templateUrl: './pengaturan.component.html',
  styleUrls: ['./pengaturan.component.scss'],
})
export class PengaturanComponent implements OnInit {
  private readonly settings = inject(SettingsService);
  private readonly akun = inject(AccountService);
  private readonly izin = inject(PermissionService);
  private readonly push = inject(PushService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  /** Versi aplikasi + pemantau pembaruan — sama dengan desktop. */
  readonly versi = inject(VersiService);
  /** Tawaran pasang aplikasi (PWA); menyembunyikan dirinya bila tak relevan. */
  readonly pwa = inject(PwaPasangService);

  ngOnInit(): void {
    // Daftarkan service worker & segarkan status langganan.
    void this.push.init();
  }

  /**
   * Notifikasi ditawarkan ke SEMUA pengguna — rantai kabarnya kini lengkap
   * (pemeriksa, penyetuju, dan pembuat sama-sama penerima), jadi tidak ada
   * lagi orang yang menyalakan langganan yang tak akan pernah berbunyi.
   */
  get bolehMemeriksa(): boolean {
    return true;
  }

  get pushDidukung(): boolean {
    return this.push.didukung();
  }
  get pushAktif(): boolean {
    return this.push.berlangganan();
  }
  get pushSedangProses(): boolean {
    return this.push.sedangProses();
  }

  async aktifkanNotif(): Promise<void> {
    const galat = await this.push.aktifkan();
    this.snackBar.open(
      galat ??
        this.translate.instant('mobile.setelan.notifNyala'),
      'Tutup',
      { duration: galat ? 6000 : 3000 },
    );
  }
  async matikanNotif(): Promise<void> {
    await this.push.matikan();
    this.snackBar.open(
      this.translate.instant('mobile.setelan.notifMati'),
      'Tutup',
      { duration: 3000 },
    );
  }

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
