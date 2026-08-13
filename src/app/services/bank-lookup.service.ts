import { Injectable, computed, inject, signal } from '@angular/core';

import { ApiService } from './api.service';

export interface RekeningRingkas {
  id: number;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
}

/**
 * Daftar rekening perusahaan, diambil sekali dan dipakai bersama.
 *
 * Sebelumnya setiap layar memanggil `banks/all` sendiri-sendiri — dua belas
 * tempat, masing-masing pada setiap pembukaan dialog. Cache ini membuatnya
 * satu kali per sesi.
 */
@Injectable({ providedIn: 'root' })
export class BankLookupService {
  private readonly api = inject(ApiService);

  private readonly _rekening = signal<RekeningRingkas[]>([]);
  private readonly _dimuat = signal(false);
  private berjalan: Promise<void> | null = null;

  readonly rekening = this._rekening.asReadonly();
  readonly dimuat = this._dimuat.asReadonly();

  /** Indeks id -> rekening, untuk pencarian cepat saat menampilkan nilai. */
  readonly perId = computed(() => {
    const peta = new Map<number, RekeningRingkas>();
    for (const r of this._rekening()) peta.set(Number(r.id), r);
    return peta;
  });

  muat(paksa = false): Promise<void> {
    if (this._dimuat() && !paksa) return Promise.resolve();
    if (this.berjalan && !paksa) return this.berjalan;

    this.berjalan = new Promise<void>((selesai) => {
      this.api.get('banks/all', {}).subscribe({
        next: (res: any) => {
          this._rekening.set(Array.isArray(res) ? res : (res?.data ?? []));
          this._dimuat.set(true);
          selesai();
        },
        error: () => {
          /*
           * Gagal memuat dibiarkan kosong, bukan dilempar.
           *
           * Berbeda dari pemilih proyek yang kodenya masih bisa diketik
           * tangan, rekening WAJIB dipilih dari daftar — nilainya berupa id.
           * Daftar kosong berarti kolomnya tetap kosong dan formulir tidak
           * dapat disimpan, dan itu memang keadaan yang benar: menyimpan
           * pembayaran tanpa rekening yang sah lebih buruk daripada gagal
           * menyimpan.
           */
          console.error('[Bank] Gagal memuat daftar rekening.');
          this._rekening.set([]);
          selesai();
        },
      });
    }).finally(() => {
      this.berjalan = null;
    });

    return this.berjalan;
  }

  /** Segarkan setelah rekening dibuat, diubah, atau dihapus. */
  segarkan(): void {
    this._dimuat.set(false);
    this.berjalan = null;
  }

  cari(id: number | null | undefined): RekeningRingkas | undefined {
    if (id === null || id === undefined) return undefined;
    return this.perId().get(Number(id));
  }

  /** Label satu baris untuk ditampilkan di kolom dan daftar saran. */
  label(r: RekeningRingkas | undefined): string {
    if (!r) return '';
    return [r.bankAccountNumber, r.bankAccountName].filter(Boolean).join(' — ');
  }

  /**
   * Saring menurut kata kunci.
   *
   * Nama bank ikut dicari meski tidak ditampilkan di label: orang biasanya
   * ingat "yang BCA", bukan nomor rekeningnya.
   */
  saring(kata: string | null | undefined): RekeningRingkas[] {
    const q = (kata ?? '').trim().toLowerCase();
    const semua = this._rekening();
    if (!q) return semua;
    return semua.filter((r) =>
      [r.bankAccountNumber, r.bankAccountName, r.bankName]
        .filter(Boolean)
        .some((x) => String(x).toLowerCase().includes(q)),
    );
  }
}
