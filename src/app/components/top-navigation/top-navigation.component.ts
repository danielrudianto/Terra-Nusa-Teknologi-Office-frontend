import {
  Component,
  EventEmitter,
  Input,
  Output,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TopNavigationBookmarkComponent } from './top-navigation-bookmark/top-navigation-bookmark.component';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageSwitcherComponent } from '../language-switcher/language-switcher.component';
import { SettingsService } from '../../services/setting.service';
import { AccountService } from '../../services/account.service';
import { AvatarComponent } from '../avatar/avatar.component';
import { CanDirective } from '../../directives/can.directive';
import { LencanaService, RUTE_LENCANA, HitunganLencana } from '../../services/lencana.service';
import { PermissionService } from '../../services/permission.service';

@Component({
  selector: 'app-top-navigation',
  standalone: true,
  imports: [
    CanDirective,
    AvatarComponent,
    CommonModule,
    TopNavigationBookmarkComponent,
    LanguageSwitcherComponent,
    MatButtonModule,
    MatToolbarModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
    MatTooltipModule,
    RouterModule,
    TranslatePipe,
  ],
  templateUrl: './top-navigation.component.html',
  styleUrl: './top-navigation.component.scss',
})
export class TopNavigationComponent {
  @Input('label') label!: string;
  @Output('onBookmarkClicked') onBookmarkClicked: EventEmitter<void> =
    new EventEmitter<void>();
  /** Tombol "Cari…" — MainComponent membuka pencarian global (Ctrl+K). */
  @Output() cari = new EventEmitter<void>();

  readonly lencana = inject(LencanaService);
  /** Dipakai templat untuk menandai akun pemeriksa. */
  readonly izin = inject(PermissionService);

  /** ⌘ di Mac, Ctrl di tempat lain — yang tertulis harus yang ditekan. */
  readonly tombolPintas =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
      ? '⌘'
      : 'Ctrl';

  private static readonly IKON: Record<keyof HitunganLencana, string> = {
    purchase_order: 'receipt_long',
    tender: 'gavel',
    reimbursement: 'receipt',
    certificate_of_payment: 'verified',
    payment_plan: 'event',
  };

  /**
   * Isi lonceng: satu baris per jenis yang MENUNGGU, dari hitungan yang sama
   * dengan lencana menu samping. Tidak ada sumber kedua — lonceng dan menu
   * samping tidak mungkin berselisih angka.
   */
  /*
   * `computed`, BUKAN getter.
   *
   * Isinya lahir dari `Object.entries(...).map(...)` — larik baru setiap kali
   * dibaca. Sebagai getter di dalam `@for`, ia dibaca pada tiap putaran
   * deteksi perubahan, dan bilah atas hadir di SEMUA halaman. `computed`
   * hanya menghitung ulang ketika lencananya sendiri berubah.
   */
  readonly notifikasi = computed(() => {
    const semua = this.lencana.semua();
    return Object.entries(RUTE_LENCANA)
      .map(([rute, kunci]) => ({
        rute,
        ikon: TopNavigationComponent.IKON[kunci],
        ket: `lencana.ket.${kunci}`,
        n: Number(semua[kunci]) || 0,
      }))
      .filter((x) => x.n > 0);
  });

  readonly totalNotifikasi = computed(() =>
    this.notifikasi().reduce((a, x) => a + x.n, 0),
  );

  bukaNotifikasi(rute: string): void {
    this.router.navigateByUrl(rute);
  }

  private settings = inject(SettingsService);
  private account = inject(AccountService);
  private router = inject(Router);

  onMenuClicked() {
    this.onBookmarkClicked.emit();
  }

  // ----- dark mode -----
  get isDark(): boolean {
    return this.settings.theme === 'dark';
  }

  toggleTheme(): void {
    this.settings.setTheme(this.isDark ? 'light' : 'dark');
  }

  // ----- account -----
  get displayName(): string {
    return this.account.displayName;
  }
  /** Id pengguna untuk memuat avatar; null bila belum masuk. */
  get userId(): number | null {
    return this.account.user?.id ?? null;
  }

  get email(): string {
    return this.account.email;
  }
  get initials(): string {
    return this.account.initials;
  }

  /*
   * Menu akun berisi tiga tindakan yang sama dengan kelompok bawah sidenav:
   * Pengaturan, Aktivitas, dan Keluar.
   *
   * Sebelumnya ada butir "Profil" yang menuju `/Profile` — rute yang tidak
   * pernah dibuat, sehingga menekannya tidak melakukan apa pun. Butir mati
   * lebih merugikan daripada butir yang tidak ada: yang menekannya mengira
   * aplikasinya rusak, bukan fiturnya belum ada.
   *
   * Aktivitas dijaga izin `audit_log:read`; bila tidak berhak, butirnya
   * disembunyikan — bukan ditampilkan lalu ditolak server.
   */
  onSettings(): void {
    this.router.navigate(['/Settings']);
  }

  onActivity(): void {
    this.router.navigate(['/Activity']);
  }

  onLogout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    this.router.navigate(['/Login']);
  }
}
