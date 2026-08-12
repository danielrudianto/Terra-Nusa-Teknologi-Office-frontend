import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

import { PanduanService } from '../../../services/panduan.service';

/**
 * Tombol pembuka panduan. Diletakkan di toolbar halaman.
 *
 *   <app-panduan-button topik="beban" />
 *   <app-panduan-button topik="beban" denganTeks />
 *   <app-panduan-button topik="beban" bagian="langkah-2-data-nilai" />
 *
 * Tanpa `topik`, panel terbuka pada daftar seluruh panduan.
 */
@Component({
  selector: 'app-panduan-button',
  imports: [MatIconModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="pd-tombol"
      [class.pd-tombol--teks]="denganTeks()"
      [attr.aria-label]="'panduan.title' | translate"
      [title]="'panduan.title' | translate"
      (click)="buka()"
    >
      <mat-icon>help_outline</mat-icon>
      @if (denganTeks()) {
        <span class="pd-tombol-teks">{{ 'panduan.title' | translate }}</span>
      }
    </button>
  `,
  styles: [
    `
      .pd-tombol {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.35rem;
        height: 2rem;
        width: 2rem;
        padding: 0;
        border: 1px solid var(--border);
        border-radius: 999px;
        background: var(--surface);
        color: var(--muted);
        font: inherit;
        line-height: 1;
        cursor: pointer;
        transition:
          background 0.15s ease,
          color 0.15s ease,
          border-color 0.15s ease;
      }
      .pd-tombol--teks {
        width: auto;
        padding: 0 0.75rem 0 0.6rem;
      }
      .pd-tombol:hover {
        background: var(--hover);
        color: var(--ink);
        border-color: var(--brand);
      }
      .pd-tombol:focus-visible {
        outline: 2px solid var(--brand);
        outline-offset: 2px;
      }
      .pd-tombol .mat-icon {
        width: 1.05rem;
        height: 1.05rem;
        font-size: 1.05rem;
        line-height: 1.05rem;
      }
      .pd-tombol-teks {
        font-size: 0.76rem;
        font-weight: 500;
      }
    `,
  ],
})
export class PanduanButtonComponent {
  private readonly svc = inject(PanduanService);

  /** Id topik di `assets/panduan/index.json`. */
  readonly topik = input<string | undefined>(undefined);
  /** Anchor bagian, mis. `status-dokumen`. */
  readonly bagian = input<string | undefined>(undefined);
  /** Tampilkan teks "Panduan" di samping ikon. */
  readonly denganTeks = input(false, { transform: booleanAttribute });

  buka(): void {
    void this.svc.buka(this.topik(), this.bagian());
  }
}
