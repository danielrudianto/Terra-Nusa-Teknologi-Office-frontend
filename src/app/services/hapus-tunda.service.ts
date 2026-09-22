import { Injectable, NgZone, inject } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { MatSnackBar, MatSnackBarRef, TextOnlySnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import { Observable, filter } from 'rxjs';
import { ServerMessageService } from './server-message.service';

export interface PermintaanHapus {
  /** Nama yang dihapus, untuk pesannya ("PT Maju dihapus"). */
  label: string;
  /** Permintaan DELETE ke server — baru dijalankan sesudah jendela urung. */
  kirim: () => Observable<unknown>;
  /** Buang barisnya dari layar SEKARANG. */
  sembunyikan: () => void;
  /** Kembalikan barisnya (diurungkan, atau server menolak). */
  pulihkan: () => void;
  /** Sesudah server benar-benar menghapus (mis. muat ulang daftar). */
  berhasil?: () => void;
  /** Kunci pesan galat cadangan untuk ServerMessageService. */
  galatCadangan?: string;
}

const JENDELA_URUNG_MS = 6000;

/**
 * HAPUS YANG BISA DIURUNGKAN — tanpa dialog "Yakin hapus?".
 *
 * Barisnya langsung hilang dari layar, dan muncul "PT Maju dihapus ·
 * Urungkan" selama enam detik. Permintaan DELETE ke server BARU DIKIRIM
 * sesudah jendela itu lewat. Mengurungkan berarti tidak ada yang pernah
 * dikirim — tidak ada yang perlu dipulihkan di server, dan cara ini
 * berlaku untuk modul mana pun tanpa mengubah backend.
 *
 * Kapan permintaannya dikirim LEBIH AWAL:
 *  - pesannya digantikan hapus berikutnya (jendela urungnya sudah tertutup);
 *  - pengguna berpindah halaman — daftar di halaman tujuan tidak boleh
 *    memuat baris yang "sudah dihapus".
 *
 * Menutup tab selama jendela urung memunculkan peringatan peramban: tanpa
 * itu, permintaannya tidak pernah terkirim dan barisnya muncul lagi esok
 * hari tanpa penjelasan.
 *
 * Server yang MENOLAK (mis. data sudah dipakai dokumen lain) memulihkan
 * barisnya dan menampilkan alasannya.
 *
 * Hanya untuk data induk yang penghapusannya tidak berantai (lawan
 * transaksi, pemasok, barang, alat, transfer). Dokumen keuangan tetap
 * memakai dialog konfirmasi.
 */
@Injectable({ providedIn: 'root' })
export class HapusTundaService {
  private readonly snack = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly pesan = inject(ServerMessageService);
  private readonly zone = inject(NgZone);

  private tertunda = new Set<() => void>();

  constructor() {
    // `events` dicek dulu: tiruan Router di beberapa uji tidak membawanya.
    inject(Router, { optional: true })
      ?.events?.pipe(filter((e) => e instanceof NavigationStart))
      .subscribe(() => this.kirimSemua());

    if (typeof window !== 'undefined') {
      this.zone.runOutsideAngular(() =>
        window.addEventListener('beforeunload', (e) => {
          if (!this.tertunda.size) return;
          e.preventDefault();
          e.returnValue = '';
        }),
      );
    }
  }

  get adaTertunda(): boolean {
    return this.tertunda.size > 0;
  }

  hapus(p: PermintaanHapus): MatSnackBarRef<TextOnlySnackBar> {
    p.sembunyikan();

    let selesai = false;
    const kirim = () => {
      if (selesai) return;
      selesai = true;
      this.tertunda.delete(kirim);
      p.kirim().subscribe({
        next: () => p.berhasil?.(),
        error: (err) => {
          p.pulihkan();
          this.snack.open(
            this.pesan.terjemahkan(err, p.galatCadangan || 'notify.deleteFailed'),
            this.translate.instant('hapusTunda.tutup'),
            { duration: 5000 },
          );
        },
      });
    };
    this.tertunda.add(kirim);

    const ref = this.snack.open(
      this.translate.instant('hapusTunda.dihapus', { label: p.label }),
      this.translate.instant('hapusTunda.urungkan'),
      { duration: JENDELA_URUNG_MS, panelClass: 'akn-snack-urung' },
    );

    ref.onAction().subscribe(() => {
      if (selesai) return;
      selesai = true;
      this.tertunda.delete(kirim);
      p.pulihkan();
    });
    // Ditutup BUKAN oleh "Urungkan" — waktunya habis, atau digantikan pesan
    // lain: kirim sekarang.
    ref.afterDismissed().subscribe((r) => {
      if (!r.dismissedByAction) kirim();
    });
    return ref;
  }

  /** Kirim seluruh penghapusan yang masih menunggu. */
  kirimSemua(): void {
    for (const k of Array.from(this.tertunda)) k();
  }
}
