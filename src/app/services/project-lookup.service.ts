import { Injectable, computed, inject, signal } from '@angular/core';

import { ApiService } from './api.service';

export interface ProyekRingkas {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
  isCancelled: boolean;
  /** Nominal dokumen (DPP + PPN). Untuk ditampilkan. */
  contractValue: number;
  /** Dasar pengenaan pajak. Inilah yang dipakai menghitung margin. */
  contractDpp: number;
  contractCount: number;
}

/**
 * Daftar proyek untuk pemilih kode, diambil sekali dan dipakai bersama.
 *
 * Satu formulir purchase order dapat menampilkan pemilih ini bersamaan dengan
 * layar lain pada shell yang sama; tanpa cache bersama, setiap pemilih akan
 * menembak `projects` sendiri-sendiri pada setiap pembukaan halaman.
 *
 * Sengaja mengambil SELURUH proyek, termasuk yang selesai dan batal.
 * Dokumen lama tetap harus dapat menampilkan kodenya, dan pengguna yang
 * membuka pembelian tahun lalu tidak boleh melihat kolom kosong hanya karena
 * proyeknya sudah ditutup. Yang dibedakan adalah penyajiannya, bukan
 * ketersediaannya.
 */
@Injectable({ providedIn: 'root' })
export class ProjectLookupService {
  private readonly api = inject(ApiService);

  private readonly _proyek = signal<ProyekRingkas[]>([]);
  private readonly _dimuat = signal(false);
  private berjalan: Promise<void> | null = null;

  readonly proyek = this._proyek.asReadonly();
  readonly dimuat = this._dimuat.asReadonly();

  /** Indeks kode -> proyek, untuk pemeriksaan cepat. */
  readonly perKode = computed(() => {
    const peta = new Map<string, ProyekRingkas>();
    for (const p of this._proyek()) peta.set(p.code.toUpperCase(), p);
    return peta;
  });

  /**
   * Muat sekali. Panggilan berikutnya memakai ulang permintaan yang sedang
   * berjalan, sehingga enam belas varian purchase order yang terbuka
   * bergantian tidak menembak server berulang kali.
   */
  muat(paksa = false): Promise<void> {
    if (this._dimuat() && !paksa) return Promise.resolve();
    if (this.berjalan && !paksa) return this.berjalan;

    this.berjalan = new Promise<void>((selesai) => {
      this.api.get('projects', { page: 1, pageSize: 500 }).subscribe({
        next: (res: any) => {
          this._proyek.set(res?.data ?? []);
          this._dimuat.set(true);
          selesai();
        },
        error: () => {
          /*
           * Gagal memuat TIDAK boleh menghalangi pengisian dokumen.
           *
           * Pemilih ini bantuan, bukan syarat: bila daftarnya kosong,
           * kodenya masih bisa diketik tangan seperti sebelumnya. Menahan
           * formulir karena daftar bantu gagal dimuat akan menghentikan
           * pekerjaan yang sebenarnya masih bisa jalan.
           */
          console.error(
            '[Proyek] Gagal memuat daftar proyek; kode masih dapat diketik manual.',
          );
          this._proyek.set([]);
          selesai();
        },
      });
    }).finally(() => {
      this.berjalan = null;
    });

    return this.berjalan;
  }

  /** Apakah kode ini terdaftar. Kode kosong dianggap belum diisi, bukan salah. */
  dikenal(kode: string | null | undefined): boolean {
    const k = (kode ?? '').trim().toUpperCase();
    if (!k) return true;
    return this.perKode().has(k);
  }

  cari(kode: string | null | undefined): ProyekRingkas | undefined {
    return this.perKode().get((kode ?? '').trim().toUpperCase());
  }

  /**
   * Tandai daftar sudah usang; pemuatan berikutnya mengambil ulang.
   *
   * Dipanggil setelah proyek dibuat, diubah, atau dihapus. Tanpa ini, daftar
   * hanya dimuat sekali per sesi — proyek yang baru ditambahkan tidak pernah
   * muncul di pemilih sampai halaman dimuat ulang, dan yang mengisi formulir
   * mengira kodenya belum terdaftar.
   */
  segarkan(): void {
    this._dimuat.set(false);
    this.berjalan = null;
  }

  /** Daftar tersaring untuk autocomplete. */
  saring(kata: string | null | undefined): ProyekRingkas[] {
    const q = (kata ?? '').trim().toLowerCase();
    const semua = this._proyek();
    if (!q) return semua;
    return semua.filter(
      (p) =>
        p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q),
    );
  }
}
