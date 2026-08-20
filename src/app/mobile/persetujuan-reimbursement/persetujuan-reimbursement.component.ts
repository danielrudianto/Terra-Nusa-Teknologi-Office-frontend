import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { ApiService } from '../../services/api.service';
import { AccountService } from '../../services/account.service';
import { ServerMessageService } from '../../services/server-message.service';

/**
 * Menyetujui reimbursement dari ponsel.
 *
 * Reimbursement adalah uang yang SUDAH ditalangi seseorang; menyetujuinya
 * berarti menyatakan perusahaan menggantinya. Karena itu bentuknya sama
 * dengan layar purchase order: daftar hanya membuka rincian, dan
 * persetujuannya ada di dalam — sesudah nama penerima, keperluan, dan
 * nominalnya terlihat.
 */
@Component({
  selector: 'app-persetujuan-reimbursement',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    TranslatePipe,
  ],
  templateUrl: './persetujuan-reimbursement.component.html',
  styleUrls: ['./persetujuan-reimbursement.component.scss'],
})
export class PersetujuanReimbursementComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly akun = inject(AccountService);
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
      .get('reimbursements', {
        // Hanya yang menunggu keputusan.
        filter: 1,
        isPending: true,
        page: 1,
        pageSize: 50,
        sortBy: 'date',
        sortByDirection: 'desc',
      })
      .subscribe({
        next: (res: any) => {
          this.daftar = res?.data ?? res?.items ?? [];
        },
        error: () =>
          this.snackBar.open(
            this.translate.instant('notify.loadFailed'),
            'Close',
            { duration: 3000 },
          ),
      })
      .add(() => (this.sedangMemuat = false));
  }

  buka(r: any): void {
    this.dipilih = r;
  }

  tutup(): void {
    this.dipilih = null;
  }

  /**
   * Pengajuan ini diajukan oleh saya sendiri.
   *
   * Server yang menolaknya; yang di sini hanya agar tombolnya tidak
   * disodorkan. Menyetujui talangan sendiri menghilangkan seluruh guna
   * tahap persetujuannya.
   */
  ajuanSendiri(r: any): boolean {
    const saya = this.akun.userId;
    if (saya === null) return false;
    return Number(r?.createdBy) === saya;
  }

  /**
   * Nominal pengajuan.
   *
   * Nilainya ada di BARISNYA, bukan di kepalanya — kepala dokumen hanya
   * menyimpan meta. Daftar server sudah menjumlahkannya; bila belum, baris
   * yang ada dijumlahkan di sini supaya kartunya tidak menampilkan nol pada
   * pengajuan yang jelas berisi.
   */
  nilai(r: any): number {
    const langsung = Number(r?.amount ?? r?.totalAmount);
    if (Number.isFinite(langsung) && langsung > 0) return langsung;
    return (r?.items ?? []).reduce(
      (a: number, b: any) => a + (Number(b?.amount) || 0),
      0,
    );
  }

  setujui(r: any): void {
    if (this.ajuanSendiri(r)) return;
    this.kirim('approve', r, 'mobile.reimbursement.disetujui');
  }

  tolak(r: any): void {
    this.kirim('reject', r, 'mobile.reimbursement.ditolak');
  }

  private kirim(jalur: string, r: any, kunciSukses: string): void {
    this.sedangKirim = true;
    this.api
      .put(`reimbursements/${jalur}/${r.id}`, {})
      .subscribe({
        next: () => {
          this.snackBar.open(
            this.translate.instant(kunciSukses, { nomor: r.name ?? r.id }),
            'Close',
            { duration: 2500 },
          );
          this.tutup();
          this.muat();
        },
        error: (err) =>
          this.snackBar.open(this.pesanServer.terjemahkan(err), 'Close', {
            duration: 5000,
          }),
      })
      .add(() => (this.sedangKirim = false));
  }
}
