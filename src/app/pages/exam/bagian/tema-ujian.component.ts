import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';

import { SettingsService } from '../../../services/setting.service';

/**
 * Sakelar terang/gelap halaman ujian.
 *
 * Memakai tema aplikasi yang sama (`html[data-theme]`), jadi seluruh
 * komponen Material ikut berganti — bukan tiruan tema gelap khusus ujian.
 */
@Component({
  selector: 'app-tema-ujian',
  standalone: true,
  imports: [MatIconModule, MatTooltipModule, TranslateModule],
  template: `
    <button
      type="button"
      class="tmu"
      [attr.aria-label]="(gelap ? 'exam.temaTerang' : 'exam.temaGelap') | translate"
      [matTooltip]="(gelap ? 'exam.temaTerang' : 'exam.temaGelap') | translate"
      (click)="ganti()"
    >
      <mat-icon>{{ gelap ? 'light_mode' : 'dark_mode' }}</mat-icon>
    </button>
  `,
  styles: [
    `
      .tmu {
        width: 40px;
        height: 40px;
        display: grid;
        place-items: center;
        border: 1px solid var(--border, #dfe3ea);
        border-radius: 4px;
        background: transparent;
        color: var(--ink, #16181d);
        cursor: pointer;
        transition: background 0.15s ease;
      }
      .tmu:hover {
        background: var(--hover, rgba(0, 0, 0, 0.04));
      }
      .tmu:focus-visible {
        outline: 2px solid var(--akn-t, currentColor);
        outline-offset: 2px;
      }
      .tmu .mat-icon {
        flex: 0 0 auto;
        width: 20px;
        height: 20px;
        font-size: 20px;
      }
    `,
  ],
})
export class TemaUjianComponent {
  private readonly setelan = inject(SettingsService);

  get gelap(): boolean {
    return this.setelan.resolvedTheme === 'dark';
  }

  ganti(): void {
    this.setelan.setTheme(this.gelap ? 'light' : 'dark');
  }
}
