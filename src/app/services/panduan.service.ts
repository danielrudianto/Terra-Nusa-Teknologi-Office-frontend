import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { marked } from 'marked';

import { PanduanBagian, PanduanIndeks, PanduanTopik } from '../model/panduan.model';
import { PermissionService } from './permission.service';

const BASIS = 'assets/panduan';
const LEBAR_KEY = 'panduan_lebar';

/** Lebar panel. `lebar` memunculkan rel daftar isi di sisi kanan. */
export type PanduanLebar = 'normal' | 'lebar';

function bacaLebar(): PanduanLebar {
  try {
    return localStorage.getItem(LEBAR_KEY) === 'lebar' ? 'lebar' : 'normal';
  } catch {
    return 'normal';
  }
}

@Injectable({ providedIn: 'root' })
export class PanduanService {
  private readonly http = inject(HttpClient);
  private readonly izin = inject(PermissionService);
  private readonly sanitizer = inject(DomSanitizer);

  /** Cache hasil render per topik supaya berkas tidak diambil ulang. */
  private readonly cache = new Map<
    string,
    { html: string; bagian: PanduanBagian[] }
  >();

  private readonly _indeks = signal<PanduanTopik[]>([]);
  private readonly _siapMuat = signal(false);

  // ---- Keadaan panel ----------------------------------------------------
  private readonly _terbuka = signal(false);
  private readonly _topikAktif = signal<PanduanTopik | null>(null);
  private readonly _html = signal<string>('');
  private readonly _daftarIsi = signal<PanduanBagian[]>([]);
  private readonly _memuat = signal(false);
  private readonly _galat = signal<string | null>(null);
  private readonly _anchorTertunda = signal<string | null>(null);
  private readonly _cari = signal('');
  private readonly _lebar = signal<PanduanLebar>(bacaLebar());

  readonly terbuka = this._terbuka.asReadonly();
  readonly topikAktif = this._topikAktif.asReadonly();
  readonly daftarIsi = this._daftarIsi.asReadonly();
  readonly memuat = this._memuat.asReadonly();
  readonly galat = this._galat.asReadonly();
  readonly anchorTertunda = this._anchorTertunda.asReadonly();
  readonly cari = this._cari.asReadonly();
  readonly lebar = this._lebar.asReadonly();

  /**
   * Isi mentah. Dipakai panel untuk tahu kapan isi berganti — objek SafeHtml
   * selalu truthy sehingga tidak bisa dipakai menandai "sudah ada isi".
   */
  readonly htmlMentah = this._html.asReadonly();

  /**
   * Isi siap tempel ke `[innerHTML]`.
   *
   * `bypassSecurityTrustHtml` WAJIB. Sanitizer bawaan Angular membuang
   * atribut `id` (juga `name` dan `data-*`) — lihat VALID_ATTRS di
   * html_sanitizer. Tanpa ini id heading hasil `perkaya()` lenyap tanpa
   * pesan galat dan seluruh tautan daftar isi berhenti bekerja.
   *
   * Aman karena isinya berkas markdown dari repo, bukan masukan pengguna.
   * Bila panduan suatu saat boleh disunting lewat layar, baris ini harus
   * dicabut dan penambahan id dipindah ke sisi DOM.
   */
  readonly html = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(this._html()),
  );

  /** Topik yang boleh dilihat pengguna saat ini. */
  readonly daftar = computed(() =>
    this._indeks().filter((t) => this.bolehLihat(t)),
  );

  readonly daftarTersaring = computed(() => {
    const q = this._cari().trim().toLowerCase();
    if (!q) return this.daftar();
    return this.daftar().filter((t) =>
      [t.judul, t.ringkas ?? '', ...(t.kataKunci ?? [])]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  });

  /** Aksinya `read`, sesuai `data.permission` di berkas rute. */
  private bolehLihat(t: PanduanTopik): boolean {
    if (!t.modul) return true;
    return this.izin.canRead(t.modul);
  }

  async muatIndeks(): Promise<void> {
    // Izin harus sudah ada sebelum daftar disaring, kalau tidak panel
    // sempat tampil kosong lalu terisi sendiri. `load()` memakai ulang
    // permintaan yang sedang berjalan.
    await this.izin.load();

    if (this._siapMuat()) return;
    try {
      const data = await firstValueFrom(
        this.http.get<PanduanIndeks>(`${BASIS}/index.json`),
      );
      this._indeks.set(data?.topik ?? []);
      this._siapMuat.set(true);
    } catch (err: any) {
      console.error(
        `[Panduan] Gagal memuat ${BASIS}/index.json (status ${err?.status ?? '?'}).`,
        err,
      );
      this._galat.set('Daftar panduan gagal dimuat.');
    }
  }

  // ---- Aksi panel -------------------------------------------------------

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
      // Tidak ada ATAU tidak berizin — diperlakukan sama supaya keberadaan
      // topik yang tidak boleh dilihat tidak bocor.
      this.bersihkanIsi();
      this._galat.set('Panduan untuk bagian ini belum tersedia.');
      return;
    }

    this._topikAktif.set(topik);
    this._anchorTertunda.set(anchor ?? null);
    this._galat.set(null);

    const tersimpan = this.cache.get(topik.id);
    if (tersimpan) {
      this._html.set(tersimpan.html);
      this._daftarIsi.set(tersimpan.bagian);
      return;
    }

    this._memuat.set(true);
    try {
      const md = await firstValueFrom(
        this.http.get(`${BASIS}/${topik.berkas}`, { responseType: 'text' }),
      );
      const hasil = this.perkaya(await marked.parse(md));
      this.cache.set(topik.id, hasil);
      this._html.set(hasil.html);
      this._daftarIsi.set(hasil.bagian);
    } catch (err: any) {
      /*
       * Penyebab paling sering: `berkas` di index.json tidak sama persis
       * dengan nama berkas di assets/panduan — termasuk BESAR-KECIL huruf.
       * Windows memaafkan, server Linux membalas 404.
       */
      console.error(
        `[Panduan] Gagal memuat ${BASIS}/${topik.berkas} (status ${err?.status ?? '?'}). ` +
          'Periksa nama berkas di assets/panduan, termasuk besar-kecil hurufnya.',
        err,
      );
      this._html.set('');
      this._daftarIsi.set([]);
      this._galat.set('Isi panduan gagal dimuat.');
    } finally {
      this._memuat.set(false);
    }
  }

  kembaliKeDaftar(): void {
    this.bersihkanIsi();
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

  /** Perbesar/perkecil panel. Pilihannya diingat antar sesi. */
  ubahLebar(): void {
    const baru: PanduanLebar = this._lebar() === 'lebar' ? 'normal' : 'lebar';
    this._lebar.set(baru);
    try {
      localStorage.setItem(LEBAR_KEY, baru);
    } catch {
      // Mode penyamaran atau penyimpanan penuh: cukup berlaku sesi ini.
    }
  }

  private bersihkanIsi(): void {
    this._topikAktif.set(null);
    this._html.set('');
    this._daftarIsi.set([]);
  }

  // ---- Pengayaan HTML ---------------------------------------------------

  /**
   * Ubah HTML hasil marked menjadi HTML siap tampil, sekaligus menyusun
   * daftar isi dari heading yang benar-benar ada.
   *
   * Semuanya lewat DOMParser, bukan custom renderer marked, karena API
   * renderer marked berubah antar versi mayor — cara ini tahan versi.
   */
  private perkaya(htmlMentah: string): {
    html: string;
    bagian: PanduanBagian[];
  } {
    const doc = new DOMParser().parseFromString(htmlMentah, 'text/html');
    const terpakai = new Set<string>();
    const bagian: PanduanBagian[] = [];

    // 1. id pada heading
    doc.querySelectorAll('h2, h3').forEach((h) => {
      if (h.id) {
        terpakai.add(h.id);
        return;
      }
      const dasar = this.slug(h.textContent ?? '');
      let id = dasar;
      let n = 2;
      while (terpakai.has(id)) id = `${dasar}-${n++}`;
      terpakai.add(id);
      h.id = id;
    });

    // 2. nomor urut bagian + daftar isi
    let nomor = 0;
    doc.querySelectorAll('h2').forEach((h) => {
      bagian.push({ anchor: h.id, judul: (h.textContent ?? '').trim() });

      nomor += 1;
      const tanda = doc.createElement('span');
      tanda.className = 'pd-nomor';
      tanda.setAttribute('aria-hidden', 'true');
      tanda.textContent = String(nomor).padStart(2, '0');
      h.insertBefore(tanda, h.firstChild);
    });

    // 3. paragraf pembuka
    const h1 = doc.querySelector('h1');
    const sesudahH1 = h1?.nextElementSibling;
    if (sesudahH1?.tagName === 'P') sesudahH1.classList.add('pd-lead');

    // 4. tabel dibungkus agar bisa digulir mendatar di panel sempit
    doc.querySelectorAll('table').forEach((t) => {
      const bungkus = doc.createElement('div');
      bungkus.className = 'pd-tabel';
      bungkus.setAttribute('role', 'region');
      bungkus.setAttribute('tabindex', '0');
      t.parentNode?.insertBefore(bungkus, t);
      bungkus.appendChild(t);
    });

    // 5. blockquote jadi callout; jenisnya dari kata pertama
    const jenis: Record<string, string> = {
      catatan: 'info',
      info: 'info',
      tips: 'info',
      penting: 'penting',
      perhatian: 'penting',
      awas: 'bahaya',
      hindari: 'bahaya',
      jangan: 'bahaya',
    };
    doc.querySelectorAll('blockquote').forEach((b) => {
      const kata = (b.textContent ?? '').trim().toLowerCase().split(/[\s:]+/)[0];
      b.classList.add('pd-callout', `pd-callout--${jenis[kata] ?? 'info'}`);
    });

    // 6. tautan keluar dibuka di tab baru
    doc.querySelectorAll('a[href^="http"]').forEach((a) => {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    });

    return { html: doc.body.innerHTML, bagian };
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
