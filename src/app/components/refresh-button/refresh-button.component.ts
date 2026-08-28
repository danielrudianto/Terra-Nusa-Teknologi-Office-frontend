import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * Tombol muat ulang untuk daftar.
 *
 * Memuat ulang DATANYA saja, bukan halamannya. `Ctrl+R` mengembalikan
 * pencarian, penyaring, dan halaman ke keadaan awal — sehingga yang mencari
 * sesuatu harus mengetik ulang seluruhnya hanya untuk melihat apakah ada
 * data baru.
 *
 * Dibuat sebagai komponen bersama karena dipakai dua puluh lima daftar.
 * Menyalinnya berarti dua puluh lima salinan yang harus diperbaiki
 * bersamaan, dan yang terlupa tidak menimbulkan galat — hanya satu daftar
 * yang tombolnya diam-diam berbeda.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-refresh-button',
  standalone: true,
  imports: [CommonModule, MatIconModule, TranslatePipe],
  template: `
    <button
      type="button"
      class="rfb"
      [class.berputar]="memuat"
      [disabled]="memuat"
      (click)="muatUlang.emit()"
      [attr.aria-label]="'common.refresh' | translate"
      [title]="'common.refreshHint' | translate"
    >
      <mat-icon>refresh</mat-icon>
      @if (denganTeks) {
        <span class="rfb__teks">{{ "common.refresh" | translate }}</span>
      }
    </button>
  `,
  styles: [
    `
      .rfb {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.35rem;
        height: 38px;
        min-width: 38px;
        padding: 0 0.7rem;
        border: 1px solid var(--border, #e3e6eb);
        border-radius: 10px;
        background: var(--surface, #fff);
        color: var(--muted, #6b7280);
        font-family: 'Montserrat', sans-serif;
        font-size: 0.8rem;
        font-weight: 600;
        cursor: pointer;
      }
      .rfb:hover:not(:disabled) {
        border-color: var(--brand);
        color: var(--brand);
      }
      .rfb:disabled {
        cursor: default;
        opacity: 0.7;
      }
      .rfb__teks {
        white-space: nowrap;
      }

      /*
       * Ikon berputar selama memuat.
       *
       * Bukan hiasan: muat ulang yang berhasil kerap tidak mengubah apa pun
       * di layar, sehingga tanpa tanda ini penggunanya tidak tahu apakah
       * tombolnya bekerja — lalu menekannya berulang kali.
       */
      .rfb.berputar mat-icon {
        animation: rfb-putar 0.8s linear infinite;
      }
      @keyframes rfb-putar {
        to {
          transform: rotate(360deg);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .rfb.berputar mat-icon {
          animation: none;
        }
      }
    `,
  ],
})
export class RefreshButtonComponent {
  /** True selama data sedang diambil; tombol dimatikan dan ikonnya berputar. */
  @Input() memuat = false;

  /** Tampilkan tulisan di samping ikon. Pada toolbar sempit cukup ikon. */
  @Input() denganTeks = false;

  @Output() muatUlang = new EventEmitter<void>();
}
