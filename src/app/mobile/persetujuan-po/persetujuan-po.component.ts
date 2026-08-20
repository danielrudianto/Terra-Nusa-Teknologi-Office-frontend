import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { ApiService } from '../../services/api.service';
import { AccountService } from '../../services/account.service';
import { PermissionService } from '../../services/permission.service';
import { ServerMessageService } from '../../services/server-message.service';

/**
 * Menyetujui purchase order dari ponsel.
 *
 * ATURANNYA TIDAK DITULIS ULANG DI SINI
 *
 * Yang boleh menyetujui, dan dokumen mana yang boleh disetujui, ditentukan
 * server — sama persis dengan desktop. Layar ini hanya menghindarkan orang
 * dari tombol yang pasti ditolak, dan sebabnya disebut di tempat tombol itu
 * tadinya berada.
 *
 * Dua aturan yang ditampilkan ulang di sini, keduanya menyalin dari layar
 * desktop dan keduanya sengaja:
 *
 *   1. Pembuat dokumen tidak menyetujui dokumennya sendiri.
 *   2. Pemeriksa tidak menyetujui dokumen yang diperiksanya sendiri.
 *
 * DISETUJUI DARI RINCIAN, BUKAN DARI DAFTAR
 *
 * Satu ketukan pada baris daftar setinggi jari, di ponsel yang dipegang
 * sambil berjalan, adalah cara paling mudah menandatangani sesuatu yang
 * tidak dibaca. Karena itu daftar hanya membuka rincian; persetujuannya ada
 * di dalam, sesudah nomor, pemasok, nilai, dan siapa yang memeriksanya
 * terlihat.
 */
@Component({
  selector: 'app-persetujuan-po',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    TranslatePipe,
  ],
  templateUrl: './persetujuan-po.component.html',
  styleUrls: ['./persetujuan-po.component.scss'],
})
export class PersetujuanPoComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly akun = inject(AccountService);
  private readonly izin = inject(PermissionService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly pesanServer = inject(ServerMessageService);

  daftar: any[] = [];
  sedangMemuat = false;
  sedangKirim = false;
  dipilih: any = null;

  ngOnInit(): void {
    this.muat();
  }

  muat(): void {
    this.sedangMemuat = true;
    this.api
      .get('purchase-orders', {
        // Hanya yang MENUNGGU persetujuan. Daftar lengkap di ponsel hanya
        // memperbesar peluang membuka dokumen yang tidak sedang ditunggu.
        status: 'pending',
        page: 1,
        page_size: 50,
        sortBy: 'date',
        sortByDirection: 'desc',
      })
      .subscribe({
        next: (res: any) => {
          const isi = res?.data ?? res?.items ?? [];
          /*
           * Yang belum DIPERIKSA tidak ikut ditampilkan.
           *
           * Urutannya bukan formalitas: pemeriksa membaca harga dan
           * volumenya, penyetuju memutuskan dokumen itu boleh terbit. Server
           * menolak persetujuan atas dokumen yang belum diperiksa, dan
           * menampilkannya di sini hanya menghasilkan penolakan yang terbaca
           * sebagai kerusakan.
           */
          this.daftar = isi.filter((x: any) => !!x?.isChecked);
        },
        error: () => this.gagal('notify.loadFailed'),
      })
      .add(() => (this.sedangMemuat = false));
  }

  buka(po: any): void {
    this.dipilih = po;
  }

  tutup(): void {
    this.dipilih = null;
  }

  /** Dokumen ini dibuat oleh saya sendiri. */
  buatanSendiri(po: any): boolean {
    const saya = this.akun.userId;
    if (saya === null) return false;
    return Number(po?.createdBy) === saya;
  }

  /** Dokumen ini diperiksa oleh saya sendiri. */
  diperiksaSendiri(po: any): boolean {
    const saya = this.akun.userId;
    if (saya === null) return false;
    return Number(po?.checkedBy) === saya;
  }

  /** Pemilik usaha boleh menyetujui dokumen yang diperiksanya sendiri. */
  private get pemilikUsaha(): boolean {
    return this.izin.level() >= 5;
  }

  /**
   * Sebab dokumen ini tidak dapat disetujui olehnya — atau `null` bila boleh.
   *
   * Disebutkan, bukan sekadar mematikan tombolnya: tombol kelabu tanpa
   * keterangan terbaca sebagai kerusakan, dan yang mengalaminya menelepon
   * orang lain untuk menanyakan aplikasi yang sedang berfungsi normal.
   */
  sebabTerhalang(po: any): string | null {
    if (!po) return null;
    if (this.diperiksaSendiri(po) && !this.pemilikUsaha) {
      return 'mobile.po.diperiksaSendiri';
    }
    if (this.buatanSendiri(po) && !this.pemilikUsaha) {
      return 'mobile.po.buatanSendiri';
    }
    return null;
  }

  bolehSetujui(po: any): boolean {
    return this.sebabTerhalang(po) === null;
  }

  nilai(po: any): number {
    const dpp = Number(po?.dpp) || 0;
    const ppn = (Number(po?.ppn) || 0) * dpp / 100;
    const lain = Number(po?.otherValue) || 0;
    return dpp + ppn + lain;
  }

  setujui(po: any): void {
    if (!this.bolehSetujui(po)) return;
    this.kirimStatus(po, 'approved', 'mobile.po.disetujui');
  }

  tolak(po: any): void {
    this.kirimStatus(po, 'rejected', 'mobile.po.ditolak');
  }

  private kirimStatus(po: any, status: string, kunciSukses: string): void {
    this.sedangKirim = true;
    this.api
      .patch(`purchase-orders/${po.id}/status?status=${status}`, {})
      .subscribe({
        next: () => {
          this.snackBar.open(
            this.translate.instant(kunciSukses, { nomor: po.name }),
            'Close',
            { duration: 2500 },
          );
          this.tutup();
          this.muat();
        },
        error: (err) => {
          this.snackBar.open(this.pesanServer.terjemahkan(err), 'Close', {
            duration: 5000,
          });
        },
      })
      .add(() => (this.sedangKirim = false));
  }

  private gagal(kunci: string): void {
    this.snackBar.open(this.translate.instant(kunci), 'Close', {
      duration: 3000,
    });
  }
}
