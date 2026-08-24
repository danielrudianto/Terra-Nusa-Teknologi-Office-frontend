import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { CertificateOfPaymentService } from '../../services/certificate-of-payment.service';
import { PermissionService } from '../../services/permission.service';
import { ServerMessageService } from '../../services/server-message.service';
import { GeserTutupDirective } from '../geser-tutup.directive';
import { ScrollBawahDirective } from '../scroll-bawah.directive';
import { TarikSegarkanDirective } from '../tarik-segarkan.directive';

/**
 * Menyetujui Certificate of Payment dari ponsel.
 *
 * TAHAP TERAKHIR SAJA
 *
 * Pengisian CoP tidak ada di sini: yang mengisi berada di kantor lapangan
 * dengan komputer, dan tabel pagu berkolom banyak tidak dapat diisi dengan
 * benar sambil berjalan. Yang dibawa ke ponsel hanya keputusan terakhirnya —
 * dan itu cocok dengan penjaga level aplikasi ini (3 ke atas), sehingga
 * gerbangnya tidak perlu dilonggarkan sama sekali.
 *
 * YANG DITAMPILKAN HANYA YANG SUDAH DIPERIKSA
 *
 * CoP yang belum diperiksa bukan giliran penyetuju. Menampilkannya hanya
 * membuat daftar penuh dokumen yang tombolnya akan ditolak server.
 */
@Component({
  selector: 'app-persetujuan-cop',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    TranslatePipe,
    TarikSegarkanDirective,
    ScrollBawahDirective,
    GeserTutupDirective,
  ],
  templateUrl: './persetujuan-cop.component.html',
  styleUrls: [
    './persetujuan-cop.component.scss',
    // Pakai ulang gaya kotak cari & kaki daftar (pod-*) dari daftar PO.
    '../po-daftar/po-daftar.component.scss',
  ],
})
export class PersetujuanCopComponent implements OnInit {
  private readonly service = inject(CertificateOfPaymentService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly pesanServer = inject(ServerMessageService);
  private readonly izin = inject(PermissionService);

  daftar: any[] = [];
  sedangMemuat = false;
  sedangSegar = false;
  sedangMuatLagi = false;
  habis = false;
  private page = 0;
  private readonly pageSize = 20;

  cariCtrl = new FormControl('');

  dipilih: any = null;
  memuatRincian = false;
  sedangKirim = false;

  /**
   * Ditandai sudah dibaca oleh yang menyetujui.
   *
   * Bukan pengaman — server tetap memutuskan — melainkan PENGHENTI LANGKAH:
   * tombol Setujui baru hidup setelah ini ditandai. CoP menjadi dasar
   * penagihan; menyetujuinya dengan satu ketukan refleks di ponsel persis
   * yang hendak dicegah.
   */
  sudahBaca = false;

  get bolehLihatNilai(): boolean {
    return this.izin.level() >= 2;
  }

  ngOnInit(): void {
    this.muat(true);
  }

  private pesan(e: any, cadangan = 'notify.actionFailed'): void {
    this.snackBar.open(this.pesanServer.terjemahkan(e, cadangan), 'Close', {
      duration: 5000,
    });
  }

  muat(reset: boolean): void {
    if (reset) {
      this.page = 0;
      this.habis = false;
      if (!this.sedangSegar) this.sedangMemuat = true;
    } else {
      if (this.habis || this.sedangMuatLagi || this.sedangMemuat) return;
      this.sedangMuatLagi = true;
    }

    this.service
      .daftar({ page: this.page, pageSize: this.pageSize })
      .subscribe({
        next: (res: any) => {
          const mentah: any[] = res?.data ?? [];
          // Disaring DI SINI: rute daftar sengaja tidak punya saringan
          // "menunggu persetujuan" karena layar lain memerlukan semuanya.
          const kata = (this.cariCtrl.value || '').trim().toLowerCase();
          const menunggu = mentah.filter(
            (c) => c.isChecked && !c.isApproved && !c.isDelete,
          );
          const tersaring = kata
            ? menunggu.filter(
                (c) =>
                  `${c.name || ''}`.toLowerCase().includes(kata) ||
                  `${c.projectName || ''}`.toLowerCase().includes(kata) ||
                  `${c.purchaseOrderName || ''}`.toLowerCase().includes(kata),
              )
            : menunggu;

          if (mentah.length < this.pageSize) this.habis = true;
          this.daftar = reset ? tersaring : [...this.daftar, ...tersaring];
        },
        error: (e) => {
          if (reset) this.pesan(e, 'notify.loadFailed');
        },
      })
      .add(() => {
        this.sedangMemuat = false;
        this.sedangMuatLagi = false;
        this.sedangSegar = false;
      });
  }

  muatLagi(): void {
    if (this.habis || this.sedangMuatLagi || this.sedangMemuat) return;
    this.page += 1;
    this.muat(false);
  }

  segarkan(): void {
    this.sedangSegar = true;
    this.muat(true);
  }

  cari(): void {
    this.muat(true);
  }

  buka(c: any): void {
    this.dipilih = c;
    this.sudahBaca = false;
    this.memuatRincian = true;
    this.service.detail(c.id).subscribe({
      next: (res: any) => {
        this.dipilih = res;
      },
      error: (e) => this.pesan(e, 'notify.loadFailed'),
      complete: () => (this.memuatRincian = false),
    });
  }

  tutup(): void {
    this.dipilih = null;
    this.sudahBaca = false;
  }

  tandaiBaca(dicentang: boolean): void {
    this.sudahBaca = dicentang;
  }

  total(c: any): number | null {
    if (!this.bolehLihatNilai || !c?.items) return null;
    return c.items.reduce((t: number, i: any) => t + Number(i.amount || 0), 0);
  }

  setujui(): void {
    if (!this.dipilih || !this.sudahBaca || this.sedangKirim) return;
    this.sedangKirim = true;
    this.service.setujui(this.dipilih.id).subscribe({
      next: () => {
        this.snackBar.open(
          this.translate.instant('cop.tersetujui'),
          'Close',
          { duration: 3000 },
        );
        this.tutup();
        this.muat(true);
      },
      error: (e) => this.pesan(e),
      complete: () => (this.sedangKirim = false),
    });
  }
}
