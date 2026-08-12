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
        gap: 6px;
        border: 1px solid #d1d5db;
        background: #fff;
        color: #4b5563;
        border-radius: 999px;
        min-width: 26px;
        height: 26px;
        padding: 0 8px;
        font: inherit;
        font-size: 13px;
        font-weight: 600;
        line-height: 1;
        cursor: pointer;
      }
      .pd-tombol:hover {
        background: #f3f4f6;
        color: #111827;
      }
      .pd-tombol-teks {
        font-weight: 500;
        font-size: 12.5px;
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
