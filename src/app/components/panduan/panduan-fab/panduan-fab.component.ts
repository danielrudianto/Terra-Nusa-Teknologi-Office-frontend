import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

import { PanduanService } from '../../../services/panduan.service';
import { SettingsService } from '../../../services/setting.service';

/**
 * Tombol panduan melayang. Dipasang SEKALI di layout utama.
 *
 *   <app-panduan-fab />
 *
 * Menggantikan tombol per halaman. Topiknya diambil dari `data.panduan` di
 * berkas rute, sehingga bentuk dan letaknya tidak mungkin berbeda antar
 * halaman dan halaman baru tidak perlu menyunting templatnya.
 *
 * Disembunyikan bila: pengguna mematikannya di Pengaturan, halaman ini
 * belum punya panduan, pengguna tidak berhak membacanya, atau panelnya
 * memang sedang terbuka.
 */
@Component({
  selector: 'app-panduan-fab',
  imports: [MatIconModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (tampil()) {
      <button
        type="button"
        class="pf"
        (click)="buka()"
        [attr.aria-label]="
          (adaTopik() ? 'panduan.title' : 'panduan.browseAll') | translate
        "
      >
        <mat-icon>help_outline</mat-icon>
        <span class="pf__teks">{{
          (adaTopik() ? 'panduan.title' : 'panduan.browseAll') | translate
        }}</span>
      </button>
    }
  `,
  styles: [
    `
      /* Melayang di kanan bawah, di bawah panel (z-index panel 1200/1201)
         supaya tidak menutupi panduannya sendiri. */
      .pf {
        position: fixed;
        right: 1.5rem;
        bottom: 1.5rem;
        z-index: 900;

        display: inline-flex;
        align-items: center;
        gap: 0;
        height: 2.75rem;
        padding: 0 0.85rem;
        border: 1px solid var(--border);
        border-radius: 999px;
        background: var(--surface);
        color: var(--muted);
        font: inherit;
        line-height: 1;
        cursor: pointer;
        box-shadow: var(--card-shadow);
        opacity: 0.72;
        transition:
          opacity 0.15s ease,
          gap 0.18s ease,
          color 0.15s ease,
          border-color 0.15s ease;
      }

      /* Diam saja sampai didekati: teksnya baru melebar ketika disentuh,
         supaya tidak menarik perhatian terus-menerus. */
      .pf__teks {
        max-width: 0;
        overflow: hidden;
        white-space: nowrap;
        font-size: 0.8rem;
        font-weight: 500;
        transition: max-width 0.18s ease;
      }

      .pf:hover,
      .pf:focus-visible {
        opacity: 1;
        gap: 0.4rem;
        color: var(--ink);
        border-color: var(--brand);
      }
      .pf:hover .pf__teks,
      .pf:focus-visible .pf__teks {
        max-width: 8rem;
      }
      .pf:focus-visible {
        outline: 2px solid var(--brand);
        outline-offset: 2px;
      }

      .pf .mat-icon {
        width: 1.25rem;
        height: 1.25rem;
        font-size: 1.25rem;
        line-height: 1.25rem;
        flex: 0 0 auto;
      }

      /* Layar sempit: ikon saja, lebih merapat ke sudut. */
      @media (max-width: 700px) {
        .pf {
          right: 1rem;
          bottom: 1rem;
          padding: 0;
          width: 2.75rem;
          justify-content: center;
        }
        .pf:hover .pf__teks,
        .pf:focus-visible .pf__teks {
          max-width: 0;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .pf,
        .pf__teks {
          transition: none;
        }
      }

      @media print {
        .pf {
          display: none;
        }
      }
    `,
  ],
})
export class PanduanFabComponent {
  private readonly svc = inject(PanduanService);
  private readonly settings = inject(SettingsService);

  /*
   * Tampil di SETIAP halaman, bukan hanya yang punya panduan.
   *
   * Sebelumnya tombol ini disembunyikan ketika halamannya belum punya
   * panduan — dan itu berlaku pada sepuluh dari dua puluh satu halaman
   * modul. Akibatnya di Bank, Kalender, Slip Gaji, dan lainnya tidak ada
   * satu pun jalan untuk membuka panduan, bahkan untuk membaca modul yang
   * memang sudah ada panduannya.
   *
   * Sekarang: ada panduannya -> langsung ke topiknya; belum ada -> membuka
   * daftar seluruh topik.
   */
  readonly tampil = computed(
    () => this.settings.guideFab() && !this.svc.terbuka(),
  );

  /** Halaman ini punya panduannya sendiri. */
  readonly adaTopik = computed(() => !!this.svc.topikRute());

  buka(): void {
    const topik = this.svc.topikRute();
    void this.svc.buka(topik ?? undefined, this.svc.bagianRute() ?? undefined);
  }
}
