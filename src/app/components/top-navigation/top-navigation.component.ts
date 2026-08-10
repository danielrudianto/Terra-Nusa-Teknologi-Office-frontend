import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
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

@Component({
  selector: 'app-top-navigation',
  standalone: true,
  imports: [
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

  onProfile(): void {
    // halaman profile dibuat nanti
    this.router.navigate(['/Profile']);
  }

  onLogout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    this.router.navigate(['/Login']);
  }
}
