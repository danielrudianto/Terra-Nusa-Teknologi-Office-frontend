import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { marked } from 'marked';

import { PanduanIndeks, PanduanTopik } from '../model/panduan.model';

// ⚠️ SATU-SATUNYA TITIK SAMBUNG KE SISTEM IZIN.
// Sesuaikan path import dan nama method di `bolehLihat()` di bawah.
import { PermissionService } from './permission.service';

const BASIS = 'assets/panduan';

@Injectable({ providedIn: 'root' })
export class PanduanService {
  private readonly http = inject(HttpClient);
  private readonly izin = inject(PermissionService);

  /** Cache HTML per topik supaya berkas tidak diambil ulang tiap buka. */
  private readonly cacheHtml = new Map<string, string>();

  private readonly _indeks = signal<PanduanTopik[]>([]);
  private readonly _siapMuat = signal(false);

  // ---- Keadaan panel ----------------------------------------------------
  private readonly _terbuka = signal(false);
  private readonly _topikAktif = signal<PanduanTopik | null>(null);
  private readonly _htmlAktif = signal<string>('');
  private readonly _memuat = signal(false);
  private readonly _galat = signal<string | null>(null);
  private readonly _anchorTertunda = signal<string | null>(null);
  private readonly _cari = signal('');

  readonly terbuka = this._terbuka.asReadonly();
  readonly topikAktif = this._topikAktif.asReadonly();
  readonly htmlAktif = this._htmlAktif.asReadonly();
  readonly memuat = this._memuat.asReadonly();
  readonly galat = this._galat.asReadonly();
  readonly anchorTertunda = this._anchorTertunda.asReadonly();
  readonly cari = this._cari.asReadonly();

  /** Topik yang boleh dilihat pengguna saat ini. */
  readonly daftar = computed(() =>
    this._indeks().filter((t) => this.bolehLihat(t)),
  );

  /** Hasil penyaringan kotak pencarian. */
  readonly daftarTersaring = computed(() => {
    const q = this._cari().trim().toLowerCase();
    if (!q) return this.daftar();
    return this.daftar().filter((t) => {
      const bahan = [
        t.judul,
        t.ringkas ?? '',
        ...(t.kataKunci ?? []),
        ...(t.bagian ?? []).map((b) => b.judul),
      ]
        .join(' ')
        .toLowerCase();
      return bahan.includes(q);
    });
  });

  /**
   * Apakah topik ini boleh dilihat pengguna saat ini.
   *
   * ⚠️ Sesuaikan pemanggilan di bawah dengan API PermissionService yang ada.
   * Kalau method-nya bernama lain (`has`, `check`, `canAccess`, dst), cukup
   * ubah baris ini — sisanya tidak perlu disentuh.
   */
  private bolehLihat(t: PanduanTopik): boolean {
    if (!t.modul) return true; // topik umum, selalu tampil
    return this.izin.can(t.modul, 'view'); // ⚠️ ganti bila nama method berbeda
  }

  /** Muat indeks sekali saja (dipanggil otomatis saat panel dibuka). */
  async muatIndeks(): Promise<void> {
    if (this._siapMuat()) return;
    try {
      const data = await firstValueFrom(
        this.http.get<PanduanIndeks>(`${BASIS}/index.json`),
      );
      this._indeks.set(data?.topik ?? []);
      this._siapMuat.set(true);
    } catch {
      this._galat.set('Daftar panduan gagal dimuat.');
    }
  }

  // ---- Aksi panel -------------------------------------------------------

  /** Buka panel. Tanpa argumen = tampil daftar topik. */
  async buka(topikId?: string, anchor?: string): Promise<void> {
    this._terbuka.set(true);
    this._galat.set(null);
    await this.muatIndeks();
    if (topikId) await this.bukaTopik(topikId, anchor);
  }

  async bukaTopik(topikId: string, anchor?: string): Promise<void> {
    await this.muatIndeks();

    const topik = this.daftar().find((t) => t.id === topikId);
    if (!topik) {
      // Tidak ditemukan ATAU tidak berizin — perlakukan sama, jangan bocorkan
      // keberadaan topik yang tidak boleh dilihat.
      this._topikAktif.set(null);
      this._htmlAktif.set('');
      this._galat.set('Panduan untuk bagian ini belum tersedia.');
      return;
    }

    this._topikAktif.set(topik);
    this._anchorTertunda.set(anchor ?? null);
    this._galat.set(null);

    const cache = this.cacheHtml.get(topik.id);
    if (cache) {
      this._htmlAktif.set(cache);
      return;
    }

    this._memuat.set(true);
    try {
      const md = await firstValueFrom(
        this.http.get(`${BASIS}/${topik.berkas}`, { responseType: 'text' }),
      );
      const html = this.tambahAnchor(await marked.parse(md));
      this.cacheHtml.set(topik.id, html);
      this._htmlAktif.set(html);
    } catch {
      this._htmlAktif.set('');
      this._galat.set('Isi panduan gagal dimuat.');
    } finally {
      this._memuat.set(false);
    }
  }

  kembaliKeDaftar(): void {
    this._topikAktif.set(null);
    this._htmlAktif.set('');
    this._galat.set(null);
  }

  tutup(): void {
    this._terbuka.set(false);
    this._cari.set('');
  }

  setCari(nilai: string): void {
    this._cari.set(nilai);
  }

  anchorSelesai(): void {
    this._anchorTertunda.set(null);
  }

  /**
   * Beri id pada setiap h2/h3 supaya bisa ditautkan langsung.
   * Dilakukan lewat DOMParser, bukan lewat custom renderer marked, karena
   * API renderer marked berubah antar versi mayor — cara ini tahan versi.
   */
  private tambahAnchor(html: string): string {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const terpakai = new Set<string>();

    doc.querySelectorAll('h2, h3').forEach((h) => {
      if (h.id) {
        terpakai.add(h.id);
        return;
      }
      let dasar = this.slug(h.textContent ?? '');
      let id = dasar;
      let n = 2;
      while (terpakai.has(id)) id = `${dasar}-${n++}`;
      terpakai.add(id);
      h.id = id;
    });

    // Tautan keluar dibuka di tab baru.
    doc.querySelectorAll('a[href^="http"]').forEach((a) => {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    });

    return doc.body.innerHTML;
  }

  private slug(teks: string): string {
    return teks
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
  }
}
