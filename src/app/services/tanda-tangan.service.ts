import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';

import { ApiService } from './api.service';
import {
  DataTtdSaya,
  TtdSayaComponent,
} from '../components/ttd-saya/ttd-saya.component';

export interface KeadaanTtd {
  punya: boolean;
  /** Pergantian sudah diajukan dan sedang menunggu persetujuan direktur. */
  tertunda: boolean;
  tertundaSejak: string | null;
}

export interface PermintaanTtd {
  id: number;
  userID: number;
  userName: string;
  image: string;
  similarity: number | null;
  /** `sangat_mirip` | `mirip` | null — lihat `utils/sidik_ttd.py` di server. */
  similarLevel: string | null;
  similarTo: number | null;
  createdAt: string;
}

/**
 * Tanda tangan pengguna: memeriksa punya-tidaknya, dan memintanya bila belum.
 *
 * SEKALI PER SESI PERAMBAN, BUKAN SEKALI PER MUAT HALAMAN
 *
 * Yang diminta pemilik: ditawarkan saat login, dan juga kepada pengguna lama
 * yang belum pernah membuatnya. Tetapi "saat login" tidak sama dengan "saat
 * aplikasi dimuat": menyegarkan halaman, membuka tab kedua, dan kembali dari
 * layar lain semuanya memuat ulang aplikasi. Tanpa penanda, dialognya muncul
 * berkali-kali dalam satu hari kerja — dan yang muncul terus-menerus akan
 * ditutup tanpa dibaca.
 *
 * `sessionStorage`, bukan `localStorage`: penandanya harus hilang saat orang
 * benar-benar keluar dan masuk lagi. Dengan `localStorage`, yang menekan
 * "Nanti saja" sekali tidak akan pernah ditawari lagi di perangkat itu.
 */
@Injectable({ providedIn: 'root' })
export class TandaTanganService {
  private readonly api = inject(ApiService);
  private readonly dialog = inject(MatDialog);

  private static readonly KUNCI_SESI = 'tnt.ttd.ditawarkan';

  /** Keadaan tanda tangan sendiri; `null` bila gagal menanyakan. */
  async keadaan(): Promise<KeadaanTtd | null> {
    try {
      const res: any = await firstValueFrom(
        this.api.get('user-signatures/status', {}),
      );
      return {
        punya: !!res?.hasSignature,
        tertunda: !!res?.pending,
        tertundaSejak: res?.pendingSince ?? null,
      };
    } catch {
      // Gagal menanyakan BUKAN berarti belum punya. Menganggapnya belum
      // membuat dialog muncul setiap kali jaringan sedang buruk — di depan
      // orang yang tanda tangannya sudah tersimpan sejak bulan lalu.
      return null;
    }
  }

  /** Sudah punya tanda tangan? `null` bila gagal menanyakan. */
  async punya(): Promise<boolean | null> {
    const k = await this.keadaan();
    return k ? k.punya : null;
  }

  /** Tanda tangan SENDIRI sebagai data-URI; `null` bila belum ada. */
  async milikSendiri(): Promise<string | null> {
    try {
      const res: any = await firstValueFrom(
        this.api.get('user-signatures/me', {}),
      );
      return res?.image ?? null;
    } catch {
      return null;
    }
  }

  /** Antrean pergantian yang menunggu keputusan — hanya level 5. */
  async antrean(): Promise<PermintaanTtd[]> {
    try {
      const res: any = await firstValueFrom(
        this.api.get('user-signatures/permintaan', {}),
      );
      return Array.isArray(res) ? res : [];
    } catch {
      return [];
    }
  }

  /** Setujui atau tolak satu permintaan. */
  async putuskan(id: number, setuju: boolean, catatan?: string): Promise<void> {
    await firstValueFrom(
      this.api.post(
        `user-signatures/permintaan/${id}/${setuju ? 'setujui' : 'tolak'}`,
        { note: catatan ?? null },
      ),
    );
  }

  /**
   * Tawarkan pembuatan tanda tangan bila penggunanya belum punya.
   *
   * Dipanggil kerangka aplikasi sesudah izin termuat. Tidak menunggu
   * hasilnya: layar tidak boleh tertahan oleh satu permintaan tambahan.
   */
  async tawarkanBilaBelumAda(): Promise<void> {
    if (this.sudahDitawarkan()) return;
    const keadaan = await this.keadaan();
    if (!keadaan || keadaan.punya || keadaan.tertunda) return;

    this.tandaiDitawarkan();
    this.buka({ bolehLewat: true });
  }

  /** Buka dialognya. Mengembalikan `true` bila tersimpan. */
  async buka(data: DataTtdSaya = {}): Promise<boolean> {
    const ref = this.dialog.open(TtdSayaComponent, {
      data,
      width: '620px',
      maxWidth: '94vw',
      autoFocus: false,
      // Yang WAJIB tidak boleh lolos dengan menekan Esc atau mengklik latar.
      disableClose: data.bolehLewat === false,
    });
    return !!(await firstValueFrom(ref.afterClosed()));
  }

  private sudahDitawarkan(): boolean {
    try {
      return sessionStorage.getItem(TandaTanganService.KUNCI_SESI) === '1';
    } catch {
      // Penyimpanan ditolak (jendela penyamaran, setelan situs). Menawarkan
      // sekali lebih baik daripada menggagalkan pemuatan aplikasi.
      return false;
    }
  }

  private tandaiDitawarkan(): void {
    try {
      sessionStorage.setItem(TandaTanganService.KUNCI_SESI, '1');
    } catch {
      // Tidak apa-apa — paling banter ditawarkan sekali lagi.
    }
  }
}
