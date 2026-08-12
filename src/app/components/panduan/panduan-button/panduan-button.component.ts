import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';

import { PanduanService } from '../../../services/panduan.service';

/**
 * Tombol "?" pembuka panduan. Taruh di toolbar halaman.
 *
 *   <app-panduan-button topik="pembelian" />
 *   <app-panduan-button topik="pembelian" bagian="membuat-po-baru" />
 *   <app-panduan-button topik="pembelian" label="Bantuan PO" />
 *
 * Tanpa `topik`, panel terbuka di daftar semua panduan.
 */
@Component({
  selector: 'app-panduan-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="pd-tombol"
      [attr.aria-label]="label() ?? 'Buka panduan'"
      [title]="label() ?? 'Panduan'"
      (click)="buka()"
    >
      <span aria-hidden="true">?</span>
      @if (label()) {
        <span class="pd-tombol-teks">{{ label() }}</span>
      }
    </button>
  `,
  styles: [
    `
      .pd-tombol {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        border: 1px solid var(--border);
        background: var(--surface);
        color: var(--muted);
        border-radius: 999px;
        min-width: 1.625rem;
        height: 1.625rem;
        padding: 0 0.5rem;
        font: inherit;
        font-size: 0.8rem;
        font-weight: 600;
        line-height: 1;
        cursor: pointer;
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
      .pd-tombol-teks {
        font-weight: 500;
        font-size: 0.76rem;
      }
    `,
  ],
})
export class PanduanButtonComponent {
  private readonly svc = inject(PanduanService);

  /** Id topik di `assets/panduan/index.json`. */
  readonly topik = input<string | undefined>(undefined);
  /** Anchor bagian, mis. `membuat-po-baru`. */
  readonly bagian = input<string | undefined>(undefined);
  /** Bila diisi, tombol menampilkan teks di samping tanda tanya. */
  readonly label = input<string | undefined>(undefined);

  buka(): void {
    void this.svc.buka(this.topik(), this.bagian());
  }
}
