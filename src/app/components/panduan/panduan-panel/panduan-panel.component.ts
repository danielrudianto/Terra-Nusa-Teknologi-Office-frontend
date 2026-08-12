import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  HostListener,
  inject,
  signal,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

import { PanduanService } from '../../../services/panduan.service';

/**
 * Panel panduan. Dipasang SEKALI di layout utama (main.component.html),
 * bukan di tiap halaman:
 *
 *   <app-panduan-panel />
 */
@Component({
  selector: 'app-panduan-panel',
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  /*
   * WAJIB None.
   *
   * Isi panduan ditempel lewat `[innerHTML]` saat runtime, sehingga
   * elemennya TIDAK pernah mendapat atribut `_ngcontent-xxx`. Dengan
   * encapsulation bawaan, `.pd-prosa h2` dikompilasi jadi
   * `.pd-prosa[_ngcontent-x] h2[_ngcontent-x]` dan tidak pernah cocok —
   * seluruh gaya heading, tabel, kode, dan daftar diam-diam tidak berlaku.
   *
   * Konsekuensinya gaya di bawah bersifat global, jadi SETIAP selector
   * wajib berawalan `.pd-`. Jangan pernah menambah selector telanjang
   * seperti `table`, `h2`, atau `pre` di blok ini.
   */
  encapsulation: ViewEncapsulation.None,
  template: `
    @if (svc.terbuka()) {
      <div class="pd-latar" (click)="svc.tutup()"></div>

      <aside
        class="pd-panel"
        [class.pd-panel--lebar]="svc.lebar() === 'lebar'"
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
              title="Kembali"
            >
              <mat-icon>arrow_back</mat-icon>
            </button>
          }

          <h2 class="pd-judul">{{ svc.topikAktif()?.judul ?? 'Panduan' }}</h2>

          <button
            type="button"
            class="pd-ikon"
            (click)="svc.ubahLebar()"
            [attr.aria-label]="
              svc.lebar() === 'lebar' ? 'Perkecil panduan' : 'Perbesar panduan'
            "
            [title]="svc.lebar() === 'lebar' ? 'Perkecil' : 'Perbesar'"
          >
            <mat-icon>{{
              svc.lebar() === 'lebar' ? 'close_fullscreen' : 'open_in_full'
            }}</mat-icon>
          </button>

          <button
            type="button"
            class="pd-ikon"
            (click)="svc.tutup()"
            aria-label="Tutup panduan"
            title="Tutup"
          >
            <mat-icon>close</mat-icon>
          </button>
        </header>

        <div class="pd-badan">
          <div class="pd-isi" #wadah>
            @if (svc.galat(); as pesan) {
              <p class="pd-galat">{{ pesan }}</p>
            }

            @if (svc.memuat()) {
              <p class="pd-samar">Memuat&hellip;</p>
            }

            <!-- ---------- Daftar topik ---------- -->
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

            <!-- ---------- Isi topik ---------- -->
            @if (svc.topikAktif()) {
              @if (svc.daftarIsi().length) {
                <nav class="pd-toc" aria-label="Daftar isi">
                  <p class="pd-toc-judul">Daftar isi</p>
                  @for (b of svc.daftarIsi(); track b.anchor) {
                    <a
                      [href]="'#' + b.anchor"
                      (click)="keAnchor($event, b.anchor)"
                      >{{ b.judul }}</a
                    >
                  }
                </nav>
              }

              <article class="pd-prosa" [innerHTML]="svc.html()"></article>
            }
          </div>

          <!-- Rel daftar isi: hanya tampil saat panel diperbesar. -->
          @if (svc.topikAktif() && svc.daftarIsi().length) {
            <nav class="pd-rel" aria-label="Bagian di halaman ini">
              <p class="pd-rel-judul">Di halaman ini</p>
              @for (b of svc.daftarIsi(); track b.anchor) {
                <a
                  [href]="'#' + b.anchor"
                  [class.pd-aktif]="bagianAktif() === b.anchor"
                  (click)="keAnchor($event, b.anchor)"
                  >{{ b.judul }}</a
                >
              }
            </nav>
          }
        </div>
      </aside>
    }
  `,
  styles: [
    `
      /* ===================================================================
         PANDUAN — gaya panel
         Semua selector berawalan .pd- karena akan dipasang tanpa encapsulation.
         Semua ukuran teks rem agar ikut --app-text-scale.
         =================================================================== */

      .pd-latar {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.32);
        z-index: 1200;
      }

      .pd-panel {
        --pd-lebar: 30rem;
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        width: min(var(--pd-lebar), 100vw);
        background: var(--surface);
        color: var(--ink);
        box-shadow: var(--card-shadow);
        border-left: 1px solid var(--border);
        display: flex;
        flex-direction: column;
        z-index: 1201;
        transition: width 0.22s cubic-bezier(0.4, 0, 0.2, 1);
      }

      /*
       * Diperbesar = mentok ke sisi side navigation.
       *
       * Default memenuhi layar; bila sidenav sedang terbuka, lebarnya
       * dikurangi selebar sidenav sehingga tepi kiri panel berhenti tepat
       * di sisinya. Penanda 'data-sidenav' dipasang MainComponent.
       *
       * '--sidenav-lebar' berasal dari :root di styles.scss — angkanya
       * tidak diulang di sini supaya tidak pernah beda dengan sidenav.
       */
      .pd-panel--lebar {
        --pd-lebar: 100vw;
      }
      html[data-sidenav='open'] .pd-panel--lebar {
        --pd-lebar: calc(100vw - var(--sidenav-lebar, 250px));
      }

      /* ---- kepala ---- */
      .pd-kepala {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.875rem 0.875rem 0.875rem 1.25rem;
        border-bottom: 1px solid var(--line);
        flex: 0 0 auto;
      }

      .pd-judul {
        flex: 1;
        margin: 0;
        font-size: 0.9rem;
        font-weight: 600;
        line-height: 1.3;
        letter-spacing: -0.005em;
        color: var(--heading-text-color, var(--ink));
      }

      /* Kotak persegi tetap: ketiga tombol punya jejak identik apa pun
         ikonnya, sehingga tidak ada yang tampak lebih kecil dari yang lain. */
      .pd-ikon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
        width: 2rem;
        height: 2rem;
        padding: 0;
        border: 0;
        background: transparent;
        border-radius: 0.5rem;
        cursor: pointer;
        color: var(--muted);
        transition: background 0.15s ease, color 0.15s ease;
      }
      .pd-ikon:hover {
        background: var(--hover);
        color: var(--ink);
      }
      .pd-ikon:focus-visible {
        outline: 2px solid var(--brand);
        outline-offset: 1px;
      }
      .pd-ikon .mat-icon {
        width: 1.15rem;
        height: 1.15rem;
        font-size: 1.15rem;
        line-height: 1.15rem;
      }

      /* ---- badan: satu kolom (normal) / dua kolom (lebar) ---- */
      .pd-badan {
        flex: 1 1 auto;
        display: flex;
        min-height: 0;
      }

      .pd-isi {
        flex: 1 1 auto;
        overflow-y: auto;
        padding: 1.5rem 1.25rem 4rem;
        scroll-behavior: smooth;
      }

      /* Rel daftar isi hanya muncul saat panel diperbesar. */
      .pd-rel {
        display: none;
      }
      .pd-panel--lebar .pd-rel {
        display: block;
        flex: 0 0 15rem;
        order: 2;
        overflow-y: auto;
        padding: 1.75rem 1.25rem 3rem 0.5rem;
        border-left: 1px solid var(--line);
      }
      .pd-panel--lebar .pd-isi {
        order: 1;
        padding-left: 2.25rem;
      }
      /* Baris tidak dibiarkan melar penuh: yang butuh ruang itu tabel. */
      .pd-panel--lebar .pd-prosa {
        max-width: 42rem;
      }
      .pd-panel--lebar .pd-tabel,
      .pd-panel--lebar .pd-prosa pre {
        max-width: none;
      }

      .pd-rel-judul {
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--faint);
        margin: 0 0 0.75rem;
      }
      .pd-rel a {
        display: block;
        font-size: 0.78rem;
        line-height: 1.45;
        color: var(--muted);
        text-decoration: none;
        padding: 0.3rem 0 0.3rem 0.75rem;
        border-left: 2px solid var(--line);
        transition: color 0.15s ease, border-color 0.15s ease;
      }
      .pd-rel a:hover {
        color: var(--ink);
      }
      .pd-rel a.pd-aktif {
        color: var(--brand);
        border-left-color: var(--brand);
        font-weight: 600;
      }

      /* Daftar isi ringkas untuk mode normal. */
      .pd-toc {
        margin: 0 0 1.75rem;
        padding: 0.875rem 1rem;
        background: var(--surface-2);
        border: 1px solid var(--line);
        border-radius: 0.625rem;
      }
      .pd-panel--lebar .pd-toc {
        display: none;
      }
      .pd-toc-judul {
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--faint);
        margin: 0 0 0.5rem;
      }
      .pd-toc a {
        display: block;
        font-size: 0.8rem;
        line-height: 1.6;
        color: var(--muted);
        text-decoration: none;
      }
      .pd-toc a:hover {
        color: var(--brand);
      }


      /* ---- tampilan daftar topik ---- */
      .pd-samar {
        color: var(--muted);
        font-size: 0.8rem;
      }

      .pd-galat {
        color: var(--bad-fg);
        background: var(--bad-bg);
        border: 1px solid var(--bad-fg);
        border-radius: 0.5rem;
        padding: 0.625rem 0.75rem;
        font-size: 0.8rem;
        margin: 0 0 1rem;
      }

      .pd-cari {
        width: 100%;
        box-sizing: border-box;
        padding: 0.55rem 0.75rem;
        border: 1px solid var(--border);
        border-radius: 0.5rem;
        background: var(--surface-2);
        color: var(--ink);
        font: inherit;
        font-size: 0.8rem;
        margin-bottom: 1rem;
      }
      .pd-cari::placeholder {
        color: var(--faint);
      }
      .pd-cari:focus {
        outline: 2px solid var(--brand);
        outline-offset: -1px;
      }

      .pd-daftar {
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .pd-daftar li + li {
        margin-top: 0.25rem;
      }
      .pd-daftar button {
        display: block;
        width: 100%;
        text-align: left;
        border: 1px solid transparent;
        background: transparent;
        color: inherit;
        padding: 0.75rem 0.875rem;
        border-radius: 0.625rem;
        cursor: pointer;
        font: inherit;
        transition: background 0.15s ease, border-color 0.15s ease;
      }
      .pd-daftar button:hover {
        background: var(--hover);
        border-color: var(--line);
      }
      .pd-daftar-judul {
        display: block;
        font-weight: 600;
        font-size: 0.9rem;
        color: var(--heading-text-color, var(--ink));
      }
      .pd-daftar-ringkas {
        display: block;
        color: var(--muted);
        font-size: 0.76rem;
        line-height: 1.5;
        margin-top: 0.2rem;
      }

      /* ---- prosa ---- */
      .pd-prosa {
        font-size: 0.9rem;
        line-height: 1.7;
        color: var(--ink);
      }

      .pd-prosa h1 {
        font-size: 1.25rem;
        font-weight: 600;
        line-height: 1.3;
        letter-spacing: -0.015em;
        margin: 0 0 0.5rem;
        color: var(--heading-text-color, var(--ink));
      }

      .pd-prosa .pd-lead {
        font-size: 0.95rem;
        line-height: 1.6;
        color: var(--muted);
        margin: 0 0 2rem;
        padding-bottom: 1.5rem;
        border-bottom: 1px solid var(--line);
      }

      .pd-prosa h2 {
        display: flex;
        align-items: baseline;
        gap: 0.7rem;
        font-size: 1rem;
        font-weight: 600;
        line-height: 1.35;
        letter-spacing: -0.01em;
        margin: 2.5rem 0 0.875rem;
        scroll-margin-top: 1.5rem;
        color: var(--heading-text-color, var(--ink));
      }

      /* Nomor bagian: penanda halus, bukan hiasan berat. */
      .pd-nomor {
        flex: 0 0 auto;
        font-size: 0.68rem;
        font-weight: 600;
        letter-spacing: 0.06em;
        color: var(--brand);
        background: var(--brand-soft);
        border-radius: 0.3rem;
        padding: 0.18rem 0.4rem;
        line-height: 1;
        position: relative;
        top: -0.1rem;
      }

      .pd-prosa h3 {
        font-size: 0.9rem;
        font-weight: 600;
        line-height: 1.4;
        margin: 1.75rem 0 0.5rem;
        scroll-margin-top: 1.5rem;
        color: var(--heading-text-color, var(--ink));
      }

      .pd-prosa p {
        margin: 0 0 0.95rem;
      }

      .pd-prosa strong {
        font-weight: 600;
        color: var(--heading-text-color, var(--ink));
      }

      .pd-prosa ul,
      .pd-prosa ol {
        margin: 0 0 0.95rem;
        padding-left: 1.15rem;
      }
      .pd-prosa li {
        margin-bottom: 0.4rem;
        padding-left: 0.2rem;
      }
      .pd-prosa li::marker {
        color: var(--faint);
      }
      .pd-prosa li > ul,
      .pd-prosa li > ol {
        margin-top: 0.4rem;
        margin-bottom: 0;
      }

      /* ---- kode ---- */
      .pd-prosa code,
      .pd-prosa pre {
        font-family: ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas,
          monospace;
      }
      .pd-prosa code {
        font-size: 0.8rem;
        background: var(--surface-2);
        border: 1px solid var(--line);
        padding: 0.08rem 0.32rem;
        border-radius: 0.28rem;
        white-space: nowrap;
      }
      .pd-prosa pre {
        background: var(--surface-2);
        border: 1px solid var(--line);
        border-radius: 0.625rem;
        padding: 1rem 1.125rem;
        overflow-x: auto;
        font-size: 0.8rem;
        line-height: 1.6;
        margin: 0 0 1.25rem;
      }
      .pd-prosa pre code {
        background: transparent;
        border: 0;
        padding: 0;
        font-size: inherit;
        white-space: pre;
      }

      /* ---- callout ---- */
      .pd-callout {
        margin: 1.25rem 0;
        padding: 0.875rem 1rem;
        border-left: 3px solid;
        border-radius: 0 0.5rem 0.5rem 0;
        font-size: 0.85rem;
        line-height: 1.6;
      }
      .pd-callout p:last-child {
        margin-bottom: 0;
      }
      .pd-callout--info {
        border-left-color: var(--brand);
        background: var(--brand-soft);
        color: var(--ink);
      }
      .pd-callout--penting {
        border-left-color: var(--warn-fg);
        background: var(--warn-bg);
        color: var(--warn-fg);
      }
      .pd-callout--bahaya {
        border-left-color: var(--bad-fg);
        background: var(--bad-bg);
        color: var(--bad-fg);
      }

      /* ---- tabel ---- */
      .pd-tabel {
        margin: 0 0 1.5rem;
        overflow-x: auto;
        border: 1px solid var(--line);
        border-radius: 0.625rem;
      }
      .pd-tabel:focus-visible {
        outline: 2px solid var(--brand);
      }
      .pd-prosa table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.8rem;
        line-height: 1.55;
        margin: 0;
      }
      .pd-prosa th,
      .pd-prosa td {
        padding: 0.6rem 0.875rem;
        text-align: left;
        vertical-align: top;
        border-bottom: 1px solid var(--line);
      }
      .pd-prosa th {
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--muted);
        background: var(--surface-2);
        white-space: nowrap;
      }
      .pd-prosa tbody tr:last-child td {
        border-bottom: 0;
      }

      .pd-prosa a {
        color: var(--brand);
        text-underline-offset: 0.15em;
      }
      .pd-prosa hr {
        border: 0;
        border-top: 1px solid var(--line);
        margin: 2rem 0;
      }

      /* ---- mode rapat ---- */
      html[data-density='compact'] .pd-isi {
        padding: 1.125rem 1rem 3rem;
      }
      html[data-density='compact'] .pd-prosa {
        line-height: 1.55;
      }

      @media (prefers-reduced-motion: reduce) {
        .pd-panel,
        .pd-ikon,
        .pd-rel a {
          transition: none;
        }
        .pd-isi {
          scroll-behavior: auto;
        }
      }

    `,
  ],
})
export class PanduanPanelComponent {
  readonly svc = inject(PanduanService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly wadah = viewChild<ElementRef<HTMLElement>>('wadah');

  /** Anchor bagian yang sedang terlihat, untuk menyorot rel. */
  readonly bagianAktif = signal<string | null>(null);

  private pengamat?: IntersectionObserver;

  constructor() {
    effect(() => {
      const isi = this.svc.htmlMentah();
      const anchor = this.svc.anchorTertunda();

      if (!isi) {
        this.lepasPengamat();
        this.bagianAktif.set(null);
        return;
      }

      this.pasangPengamat();

      if (anchor) {
        this.svc.anchorSelesai();
        this.gulirKe(anchor);
      }
    });

    this.destroyRef.onDestroy(() => this.lepasPengamat());
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

  /**
   * Gulir ke heading, dicoba ulang beberapa bingkai.
   *
   * Saat dipanggil dari `effect`, isi belum tentu sudah menempel di DOM:
   * sinyal berubah lebih dulu, penempelan `[innerHTML]` menyusul di putaran
   * render. Sekali coba saja membuat tautan diam tanpa sebab.
   */
  private gulirKe(anchor: string, sisa = 5): void {
    const el = this.wadah()?.nativeElement.querySelector(
      `#${CSS.escape(anchor)}`,
    );

    if (!el) {
      if (sisa > 0) {
        requestAnimationFrame(() => this.gulirKe(anchor, sisa - 1));
      } else {
        console.warn(
          `[Panduan] Heading "#${anchor}" tidak ditemukan di isi yang dirender.`,
        );
      }
      return;
    }

    el.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  /** Sorot bagian yang sedang dibaca di rel kanan. */
  private pasangPengamat(sisa = 5): void {
    const wadah = this.wadah()?.nativeElement;
    const heading = wadah?.querySelectorAll<HTMLElement>('.pd-prosa h2');

    if (!wadah || !heading?.length) {
      if (sisa > 0) requestAnimationFrame(() => this.pasangPengamat(sisa - 1));
      return;
    }

    this.lepasPengamat();

    this.pengamat = new IntersectionObserver(
      (entri) => {
        for (const e of entri) {
          if (e.isIntersecting) this.bagianAktif.set(e.target.id);
        }
      },
      // Bagian dianggap aktif begitu judulnya masuk sepertiga atas panel,
      // bukan saat menyentuh tepi bawah — kalau tidak, sorotannya melompat
      // ke bagian berikutnya sebelum orang sempat membacanya.
      { root: wadah, rootMargin: '0px 0px -70% 0px', threshold: 0 },
    );

    heading.forEach((h) => this.pengamat!.observe(h));
  }

  private lepasPengamat(): void {
    this.pengamat?.disconnect();
    this.pengamat = undefined;
  }
}
