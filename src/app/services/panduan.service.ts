import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { marked } from 'marked';

import {
  PanduanBagian,
  PanduanIndeks,
  PanduanTopik,
  PanduanTopikTampil,
  TeksLokal,
} from '../model/panduan.model';
import { PermissionService } from './permission.service';
import { AppLang, LanguageService } from './language.service';
import { TranslateService } from '@ngx-translate/core';

const BASIS = 'assets/panduan';

/**
 * Bahasa cadangan.
 *
 * Panduan yang belum diterjemahkan ditampilkan dalam bahasa ini, bukan
 * dikosongkan: halaman kosong lebih merugikan daripada halaman berbahasa
 * lain yang isinya benar.
 */
const BAHASA_CADANGAN: AppLang = 'id';
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
  private readonly bahasa = inject(LanguageService);
  private readonly translate = inject(TranslateService);

  /** Cache hasil render per topik supaya berkas tidak diambil ulang. */
  /** Kunci cache menyertakan bahasa: `pembelian:id`. */
  private readonly cache = new Map<
    string,
    { html: string; bagian: PanduanBagian[]; cadangan: boolean }
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
  /** true bila isi yang tampil bukan bahasa yang sedang dipilih. */
  private readonly _pakaiCadangan = signal(false);
  /*
   * Bahasa aktif disimpan sebagai sinyal, bukan dibaca langsung dari
   * LanguageService. `computed` hanya menghitung ulang bila sinyal yang
   * dibacanya berubah — tanpa ini, judul dan ringkas topik tidak pernah
   * ikut berganti bahasa.
   */
  private readonly _lang = signal<AppLang>(this.bahasa.current);

  readonly terbuka = this._terbuka.asReadonly();
  readonly topikAktif = this._topikAktif.asReadonly();
  readonly daftarIsi = this._daftarIsi.asReadonly();
  readonly memuat = this._memuat.asReadonly();
  readonly galat = this._galat.asReadonly();
  readonly anchorTertunda = this._anchorTertunda.asReadonly();
  readonly cari = this._cari.asReadonly();
  readonly lebar = this._lebar.asReadonly();
  readonly pakaiCadangan = this._pakaiCadangan.asReadonly();

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

  /** Judul topik yang sedang dibuka, sudah diselesaikan ke bahasa aktif. */
  readonly judulAktif = computed(() => {
    const t = this._topikAktif();
    return t ? this.teks(t.judul) : null;
  });

  readonly daftarTersaring = computed<PanduanTopikTampil[]>(() => {
    const q = this._cari().trim().toLowerCase();

    return this.daftar()
      .map((t) => ({
        id: t.id,
        judul: this.teks(t.judul),
        ringkas: t.ringkas ? this.teks(t.ringkas) : undefined,
        // Kata kunci ikut dicari tetapi tidak ditampilkan.
        _cari: [
          this.teks(t.judul),
          t.ringkas ? this.teks(t.ringkas) : '',
          ...(t.kataKunci ?? []),
        ]
          .join(' ')
          .toLowerCase(),
      }))
      .filter((t) => !q || t._cari.includes(q))
      .map(({ _cari, ...sisa }) => sisa);
  });

  /**
   * Ambil teks sesuai bahasa aktif, mundur ke bahasa cadangan.
   *
   * Membaca `_lang()` supaya computed yang memanggilnya ikut dihitung ulang
   * ketika bahasa berganti.
   */
  private teks(t: TeksLokal): string {
    const lang = this._lang();
    return t?.[lang] ?? t?.[BAHASA_CADANGAN] ?? '';
  }

  constructor() {
    /*
     * Ganti bahasa memuat ulang topik yang sedang dibuka.
     *
     * Tanpa ini panel tetap menampilkan bahasa sebelumnya sampai ditutup
     * dan dibuka lagi — terlihat seperti pilihan bahasanya tidak berfungsi.
     * Cache berkunci bahasa, jadi bolak-balik tidak menembak server ulang.
     */
    this.translate.onLangChange.subscribe(() => {
      this._lang.set(this.bahasa.current);
      const topik = this._topikAktif();
      if (topik) void this.bukaTopik(topik.id);
    });
  }

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
      this._galat.set(this.translate.instant('panduan.errIndex'));
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
      this._galat.set(this.translate.instant('panduan.errNotAvailable'));
      return;
    }

    this._topikAktif.set(topik);
    this._anchorTertunda.set(anchor ?? null);
    this._galat.set(null);

    const lang = this.bahasa.current;
    const kunci = `${topik.id}:${lang}`;

    const tersimpan = this.cache.get(kunci);
    if (tersimpan) {
      this._html.set(tersimpan.html);
      this._daftarIsi.set(tersimpan.bagian);
      this._pakaiCadangan.set(tersimpan.cadangan);
      return;
    }

    this._memuat.set(true);
    try {
      const { md, cadangan } = await this.ambilMarkdown(topik.berkas, lang);
      const hasil = { ...this.perkaya(await marked.parse(md)), cadangan };
      this.cache.set(kunci, hasil);
      this._html.set(hasil.html);
      this._daftarIsi.set(hasil.bagian);
      this._pakaiCadangan.set(cadangan);
    } catch (err: any) {
      /*
       * Penyebab paling sering: `berkas` di index.json tidak sama persis
       * dengan nama berkas di assets/panduan — termasuk BESAR-KECIL huruf.
       * Windows memaafkan, server Linux membalas 404.
       */
      console.error(
        `[Panduan] Gagal memuat ${BASIS}/${topik.berkas}.*.md ` +
          `(status ${err?.status ?? '?'}). Minimal ${topik.berkas}.${BAHASA_CADANGAN}.md ` +
          'harus ada. Periksa nama berkas di assets/panduan, termasuk besar-kecil hurufnya.',
        err,
      );
      this._html.set('');
      this._daftarIsi.set([]);
      this._pakaiCadangan.set(false);
      this._galat.set(this.translate.instant('panduan.errContent'));
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
    this._pakaiCadangan.set(false);
  }

  /**
   * Ambil markdown untuk bahasa yang diminta, mundur ke bahasa cadangan
   * bila belum diterjemahkan.
   *
   * Mundurnya per topik, bukan seluruhnya — sehingga penerjemahan bisa
   * dicicil satu berkas demi satu tanpa mematikan yang lain.
   */
  private async ambilMarkdown(
    basis: string,
    lang: AppLang,
  ): Promise<{ md: string; cadangan: boolean }> {
    const ambil = (l: AppLang) =>
      firstValueFrom(
        this.http.get(`${BASIS}/${basis}.${l}.md`, { responseType: 'text' }),
      );

    if (lang === BAHASA_CADANGAN) {
      return { md: await ambil(BAHASA_CADANGAN), cadangan: false };
    }

    try {
      return { md: await ambil(lang), cadangan: false };
    } catch {
      // Belum diterjemahkan. Keadaan wajar, bukan galat — dicatat supaya
      // terlihat berkas mana yang masih perlu dikerjakan.
      console.info(
        `[Panduan] ${basis}.${lang}.md belum ada; menampilkan versi ${BAHASA_CADANGAN}.`,
      );
      return { md: await ambil(BAHASA_CADANGAN), cadangan: true };
    }
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
