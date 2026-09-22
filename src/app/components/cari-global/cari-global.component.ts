import {
  AfterViewInit,
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subject, Subscription, debounceTime, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';
import { ApiService } from '../../services/api.service';
import {
  ButirMenu,
  KELOMPOK_INFO,
  KelompokServer,
  cocokkanMenu,
  tujuanHasil,
} from './cari-global';

interface Baris {
  jenis: 'menu' | string;
  ikon: string;
  /** Ikon menu samping (berkas SVG di assets/vector), bila ada. */
  svg?: string;
  judul: string;
  sub?: string | null;
  tanggal?: string | null;
  buka: () => void;
}

interface Bagian {
  label: string;
  baris: Baris[];
}

/**
 * Pencarian global — Ctrl+K (⌘K di Mac).
 *
 * Satu kotak untuk menu DAN data: klien, pemasok, karyawan, proyek, tender,
 * PO, pembelian, faktur penjualan. Menu dicocokkan di tempat (seketika);
 * data ditanyakan ke `/search` sesudah 250ms tanpa ketikan, dan hanya
 * kelompok yang boleh dibaca pengguna yang dikembalikan server.
 *
 * Papan ketik penuh: ↑/↓ memilih, Enter membuka, Esc menutup.
 */
@Component({
  selector: 'app-cari-global',
  standalone: true,
  imports: [MatDialogModule, MatIconModule, TranslatePipe, FormsModule, DatePipe],
  templateUrl: './cari-global.component.html',
  styleUrl: './cari-global.component.scss',
})
export class CariGlobalComponent implements AfterViewInit, OnDestroy {
  @ViewChild('kotak') kotak?: ElementRef<HTMLInputElement>;

  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  readonly q = signal('');
  readonly memuat = signal(false);
  readonly server = signal<KelompokServer[]>([]);
  readonly aktif = signal(0);

  private readonly ketik$ = new Subject<string>();
  private langganan?: Subscription;

  constructor(
    private ref: MatDialogRef<CariGlobalComponent>,
    @Inject(MAT_DIALOG_DATA) private data: { menu: ButirMenu[] },
  ) {
    this.langganan = this.ketik$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((q) => {
          if (q.trim().length < 2) {
            this.memuat.set(false);
            return of({ kelompok: [] });
          }
          this.memuat.set(true);
          return this.api.get('search', { q: q.trim() }).pipe(catchError(() => of({ kelompok: [] })));
        }),
      )
      .subscribe((r: any) => {
        this.memuat.set(false);
        this.server.set(r?.kelompok ?? []);
        this.aktif.set(0);
      });
  }

  readonly bagian = computed<Bagian[]>(() => {
    const q = this.q();
    const hasil: Bagian[] = [];
    const menu = cocokkanMenu(this.data?.menu ?? [], q, (k) => this.translate.instant(k));
    if (menu.length) {
      hasil.push({
        label: 'cariGlobal.menu',
        baris: menu.map((m) => ({
          jenis: 'menu',
          // Ikon yang SAMA dengan menu samping: butir menu di sini dikenali
          // dari bentuk yang sudah dilihat setiap hari.
          ikon: m.icon && !/\.svg$/.test(m.icon) ? m.icon : 'arrow_forward',
          svg: m.icon && /\.svg$/.test(m.icon) ? `/assets/vector/${m.icon}` : undefined,
          judul: this.translate.instant(m.name),
          sub: m.grup ? this.translate.instant(m.grup) : null,
          buka: () => this.pergi([m.route]),
        })),
      });
    }
    for (const k of this.server()) {
      const info = KELOMPOK_INFO[k.jenis];
      if (!info) continue;
      hasil.push({
        label: info.label,
        baris: k.hasil.map((h) => ({
          jenis: k.jenis,
          ikon: info.ikon,
          judul: h.judul,
          sub: h.sub,
          tanggal: h.tanggal,
          buka: () => {
            const t = tujuanHasil(k.jenis, h);
            if (t) this.pergi(t.perintah, t.queryParams);
          },
        })),
      });
    }
    return hasil;
  });

  readonly datar = computed<Baris[]>(() => this.bagian().flatMap((b) => b.baris));

  ngAfterViewInit(): void {
    setTimeout(() => this.kotak?.nativeElement.focus());
  }

  ngOnDestroy(): void {
    this.langganan?.unsubscribe();
  }

  ubah(nilai: string): void {
    this.q.set(nilai);
    this.aktif.set(0);
    this.ketik$.next(nilai);
  }

  indeks(b: Baris): number {
    return this.datar().indexOf(b);
  }

  tombol(ev: KeyboardEvent): void {
    const n = this.datar().length;
    if (ev.key === 'ArrowDown' && n) {
      ev.preventDefault();
      this.aktif.set((this.aktif() + 1) % n);
      this.gulirKeAktif();
    } else if (ev.key === 'ArrowUp' && n) {
      ev.preventDefault();
      this.aktif.set((this.aktif() - 1 + n) % n);
      this.gulirKeAktif();
    } else if (ev.key === 'Enter') {
      ev.preventDefault();
      this.datar()[this.aktif()]?.buka();
    }
  }

  private gulirKeAktif(): void {
    setTimeout(() =>
      document.querySelector('.cg-baris--aktif')?.scrollIntoView({ block: 'nearest' }),
    );
  }

  private pergi(perintah: any[], queryParams?: Record<string, any>): void {
    this.ref.close();
    this.router.navigate(perintah, { queryParams });
  }
}
