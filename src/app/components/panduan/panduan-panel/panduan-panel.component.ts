import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  HostListener,
  inject,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { PanduanService } from '../../../services/panduan.service';

/**
 * Panel panduan. Pasang SEKALI di komponen kerangka aplikasi
 * (mis. `app.component.html` atau layout utama), bukan di tiap halaman.
 *
 *   <app-panduan-panel />
 */
@Component({
  selector: 'app-panduan-panel',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (svc.terbuka()) {
      <div class="pd-latar" (click)="svc.tutup()"></div>

      <aside
        class="pd-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Panduan penggunaan"
      >
        <header class="pd-kepala">
          @if (svc.topikAktif()) {
            <button
              type="button"
              class="pd-ikon"
              (click)="svc.kembaliKeDaftar()"
              aria-label="Kembali ke daftar panduan"
            >
              ←
            </button>
          }

          <h2 class="pd-judul">
            {{ svc.topikAktif()?.judul ?? 'Panduan' }}
          </h2>

          <button
            type="button"
            class="pd-ikon"
            (click)="svc.tutup()"
            aria-label="Tutup panduan"
          >
            ✕
          </button>
        </header>

        <div class="pd-isi" #wadah>
          @if (svc.galat(); as pesan) {
            <p class="pd-galat">{{ pesan }}</p>
          }

          @if (svc.memuat()) {
            <p class="pd-samar">Memuat…</p>
          }

          <!-- ---------- Tampilan daftar ---------- -->
          @if (!svc.topikAktif() && !svc.memuat()) {
            <input
              type="search"
              class="pd-cari"
              placeholder="Cari panduan…"
              [value]="svc.cari()"
              (input)="onCari($event)"
              aria-label="Cari panduan"
            />

            @if (svc.daftarTersaring().length === 0) {
              <p class="pd-samar">Tidak ada panduan yang cocok.</p>
            }

            <ul class="pd-daftar">
              @for (t of svc.daftarTersaring(); track t.id) {
                <li>
                  <button type="button" (click)="svc.bukaTopik(t.id)">
                    <span class="pd-daftar-judul">{{ t.judul }}</span>
                    @if (t.ringkas) {
                      <span class="pd-daftar-ringkas">{{ t.ringkas }}</span>
                    }
                  </button>
                </li>
              }
            </ul>
          }

          <!-- ---------- Tampilan isi ---------- -->
          @if (svc.topikAktif(); as t) {
            @if (t.bagian?.length) {
              <nav class="pd-toc" aria-label="Daftar isi">
                @for (b of t.bagian; track b.anchor) {
                  <a
                    [href]="'#' + b.anchor"
                    (click)="keAnchor($event, b.anchor)"
                  >
                    {{ b.judul }}
                  </a>
                }
              </nav>
            }

            <!-- Isi berasal dari berkas markdown di repo (tepercaya), bukan
                 masukan pengguna. Tidak ada jalur XSS dari sisi pengguna. -->
            <article class="pd-prosa" [innerHTML]="svc.htmlAktif()"></article>
          }
        </div>
      </aside>
    }
  `,
  styles: [
    `
      :host {
        --pd-lebar: 420px;
      }

      .pd-latar {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.32);
        z-index: 1200;
      }

      .pd-panel {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        width: min(var(--pd-lebar), 100vw);
        background: #fff;
        box-shadow: -2px 0 16px rgba(0, 0, 0, 0.18);
        display: flex;
        flex-direction: column;
        z-index: 1201;
        animation: pd-masuk 0.18s ease-out;
      }

      @keyframes pd-masuk {
        from {
          transform: translateX(24px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .pd-panel {
          animation: none;
        }
      }

      .pd-kepala {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 12px 12px 16px;
        border-bottom: 1px solid #e5e7eb;
        flex: 0 0 auto;
      }

      .pd-judul {
        flex: 1;
        margin: 0;
        font-size: 15px;
        font-weight: 600;
        line-height: 1.3;
      }

      .pd-ikon {
        border: 0;
        background: transparent;
        cursor: pointer;
        font-size: 16px;
        line-height: 1;
        padding: 6px 8px;
        border-radius: 6px;
        color: #4b5563;
      }
      .pd-ikon:hover {
        background: #f3f4f6;
      }

      .pd-isi {
        flex: 1 1 auto;
        overflow-y: auto;
        padding: 16px;
        scroll-behavior: smooth;
      }

      .pd-samar {
        color: #6b7280;
        font-size: 13px;
      }
      .pd-galat {
        color: #b91c1c;
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 6px;
        padding: 8px 10px;
        font-size: 13px;
      }

      .pd-cari {
        width: 100%;
        box-sizing: border-box;
        padding: 8px 10px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font: inherit;
        font-size: 13px;
        margin-bottom: 12px;
      }

      .pd-daftar {
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .pd-daftar li + li {
        margin-top: 4px;
      }
      .pd-daftar button {
        display: block;
        width: 100%;
        text-align: left;
        border: 0;
        background: transparent;
        padding: 10px 12px;
        border-radius: 8px;
        cursor: pointer;
        font: inherit;
      }
      .pd-daftar button:hover {
        background: #f3f4f6;
      }
      .pd-daftar-judul {
        display: block;
        font-weight: 500;
        font-size: 14px;
      }
      .pd-daftar-ringkas {
        display: block;
        color: #6b7280;
        font-size: 12px;
        margin-top: 2px;
      }

      .pd-toc {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 10px 12px;
        margin-bottom: 16px;
        background: #f9fafb;
        border: 1px solid #eef0f3;
        border-radius: 8px;
        font-size: 12.5px;
      }
      .pd-toc a {
        color: #374151;
        text-decoration: none;
      }
      .pd-toc a:hover {
        text-decoration: underline;
      }

      /* ---- Prosa markdown ---- */
      .pd-prosa {
        font-size: 14px;
        line-height: 1.65;
        color: #1f2937;
      }
      .pd-prosa h1 {
        font-size: 18px;
        margin: 0 0 12px;
      }
      .pd-prosa h2 {
        font-size: 15px;
        margin: 26px 0 8px;
        padding-top: 6px;
        border-top: 1px solid #eef0f3;
        scroll-margin-top: 8px;
      }
      .pd-prosa h3 {
        font-size: 13.5px;
        margin: 18px 0 6px;
        scroll-margin-top: 8px;
      }
      .pd-prosa p,
      .pd-prosa ul,
      .pd-prosa ol {
        margin: 0 0 10px;
      }
      .pd-prosa ul,
      .pd-prosa ol {
        padding-left: 20px;
      }
      .pd-prosa li {
        margin-bottom: 3px;
      }
      .pd-prosa code {
        background: #f3f4f6;
        padding: 1px 5px;
        border-radius: 4px;
        font-size: 12.5px;
      }
      .pd-prosa blockquote {
        margin: 12px 0;
        padding: 8px 12px;
        border-left: 3px solid #fbbf24;
        background: #fffbeb;
        color: #78350f;
        font-size: 13px;
      }
      .pd-prosa blockquote p:last-child {
        margin-bottom: 0;
      }
      .pd-prosa table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12.5px;
        margin: 0 0 12px;
      }
      .pd-prosa th,
      .pd-prosa td {
        border: 1px solid #e5e7eb;
        padding: 6px 8px;
        text-align: left;
        vertical-align: top;
      }
      .pd-prosa th {
        background: #f9fafb;
        font-weight: 600;
      }
      .pd-prosa a {
        color: #1d4ed8;
      }
    `,
  ],
})
export class PanduanPanelComponent {
  readonly svc = inject(PanduanService);
  private readonly wadah = viewChild<ElementRef<HTMLElement>>('wadah');

  constructor() {
    // Gulir ke anchor setelah isi selesai dirender.
    effect(() => {
      const html = this.svc.htmlAktif();
      const anchor = this.svc.anchorTertunda();
      if (!html || !anchor) return;

      queueMicrotask(() => {
        this.gulirKe(anchor);
        this.svc.anchorSelesai();
      });
    });
  }

  onCari(ev: Event): void {
    this.svc.setCari((ev.target as HTMLInputElement).value);
  }

  keAnchor(ev: Event, anchor: string): void {
    ev.preventDefault();
    this.gulirKe(anchor);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.svc.terbuka()) this.svc.tutup();
  }

  private gulirKe(anchor: string): void {
    const el = this.wadah()?.nativeElement.querySelector(
      `#${CSS.escape(anchor)}`,
    );
    el?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
}
