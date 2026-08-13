import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

import { PurchaseOrderTypeSelectorComponent } from '../pages/purchase-order/purchase-order-type-selector/purchase-order-type-selector.component';
import { DeleteConfirmationComponent } from '../components/delete-confirmation/delete-confirmation.component';
import { firstValueFrom } from 'rxjs';

/**
 * Ganti jenis purchase order dari dalam formulirnya.
 *
 * Setelah masuk ke salah satu formulir, jenisnya tidak dapat diubah — satu-
 * satunya jalan keluar adalah tombol kembali peramban. Bagi yang salah pilih
 * di awal, itu terasa seperti terjebak.
 *
 * Ditaruh di satu layanan, bukan disalin ke tiap formulir: pemetaan jenis ke
 * alamatnya cukup dirawat di sini, sehingga jenis baru tidak perlu disentuh
 * di tiga belas tempat.
 */
@Injectable({ providedIn: 'root' })
export class PurchaseOrderTypeSwitcher {
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  /** Jenis PO → potongan alamat pembuatannya. */
  private readonly routes: Record<string, string> = {
    A: 'A',
    B: 'B',
    C: 'C',
    D: 'D',
    F: 'F',
    G: 'G',
    H: 'H',
    '5.1.1': '511',
    '5.1.2': '512',
    '5.1.6': '516',
    '5.1.12': '5112',
    '6.3.1': '631',
    '6.3.2': '632',
    '6.4.1': '641',
    '6.4.2': '642',
    '6.5.1': '651',
    '6.5.2': '652',
  };

  /**
   * Buka pemilih jenis, lalu pindah ke formulirnya.
   *
   * @param adaIsian bila benar, pengguna dikonfirmasi lebih dulu karena
   *                 isian yang sudah diketik akan hilang.
   */
  async open(adaIsian: boolean = false): Promise<void> {
    if (adaIsian) {
      /*
       * Konfirmasi memakai dialog aplikasi, bukan `window.confirm`.
       *
       * Dialog bawaan peramban tidak dapat didandani sama sekali: tampilannya
       * berbeda di tiap peramban, tidak mengikuti tema maupun warna aksen,
       * dan judulnya selalu disertai nama domain. Di tengah aplikasi yang
       * seluruhnya bergaya seragam, ia terlihat seperti galat.
       *
       * `destructive` disebut tegas: kalimatnya tidak memuat kata "hapus",
       * sehingga penebakan dari teks akan menganggapnya tindakan biasa —
       * padahal isian yang sudah diketik memang akan hilang.
       */
      const lanjut = await firstValueFrom(
        this.dialog
          .open(DeleteConfirmationComponent, {
            data: {
              title: this.translate.instant('poForm.changeTypeTitle'),
              prompt: this.translate.instant('poForm.changeTypeBody'),
              confirmLabel: this.translate.instant('poForm.changeTypeConfirm'),
              destructive: true,
            },
            maxWidth: '94vw',
            autoFocus: false,
          })
          .afterClosed(),
      );
      if (!lanjut) return;
    }

    this.dialog
      .open(PurchaseOrderTypeSelectorComponent, {
        maxWidth: '94vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((type: string) => {
        if (!type) return;
        const segment = this.routes[type];
        // Jenis yang formulirnya belum dibuat tidak diarahkan ke mana pun;
        // pemilihnya sendiri sudah menandainya sebagai belum tersedia.
        if (!segment) return;
        this.router.navigate(['/Purchase-order', 'Create', segment]);
      });
  }
}
