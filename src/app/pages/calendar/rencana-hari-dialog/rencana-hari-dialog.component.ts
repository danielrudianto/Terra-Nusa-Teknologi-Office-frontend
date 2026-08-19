import { CommonModule } from '@angular/common';
import { ServerMessageService } from 'src/app/services/server-message.service';
import { Component, Inject, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { DeleteConfirmationComponent } from 'src/app/components/delete-confirmation/delete-confirmation.component';
import { DialogGeserDirective } from 'src/app/directives/dialog-geser.directive';
import {
  PaymentPlanService,
  cariKategori,
} from 'src/app/services/payment-plan.service';
import { RencanaDialogComponent } from '../rencana-dialog/rencana-dialog.component';

@Component({
  selector: 'app-rencana-hari-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    TranslateModule,
    DialogGeserDirective,
  ],
  templateUrl: './rencana-hari-dialog.component.html',
  styleUrl: './rencana-hari-dialog.component.scss',
})
export class RencanaHariDialogComponent {
  private readonly serverMessage = inject(ServerMessageService);

  private readonly service = inject(PaymentPlanService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  daftar: any[] = [];
  /**
   * Apakah ada yang berubah selama dialog terbuka.
   *
   * Dikembalikan saat ditutup supaya kalender memuat ulang SEKALI, bukan
   * setiap kali satu baris disunting — memuat ulang di tengah membuat
   * daftarnya berkedip di bawah tangan yang sedang mengerjakannya.
   */
  private berubah = false;

  constructor(
    private dialogRef: MatDialogRef<RencanaHariDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public input: any,
  ) {
    this.daftar = [...(input?.rencana ?? [])];
  }

  get tanggal(): string {
    return this.input?.tanggal ?? '';
  }

  /*
   * Arah ikut dikirim: `lain` ada di KEDUA daftar, dan tanpa arahnya yang
   * pertama ditemukan yang dipakai — kebetulan benar, tetapi hanya kebetulan.
   */
  ikonKategori(kategori: string, arah?: string): string {
    return cariKategori(kategori, arah)?.ikon ?? 'more_horiz';
  }

  labelKategori(kategori: string, arah?: string): string {
    return cariKategori(kategori, arah)?.label ?? 'rencana.katLain';
  }

  get totalKeluar(): number {
    return this.daftar
      .filter((r) => r.planType !== 'masuk' && r.status === 'rencana')
      .reduce((a, r) => a + Number(r.amount || 0), 0);
  }

  get totalMasuk(): number {
    return this.daftar
      .filter((r) => r.planType === 'masuk' && r.status === 'rencana')
      .reduce((a, r) => a + Number(r.amount || 0), 0);
  }

  tambah(): void {
    this.dialog
      .open(RencanaDialogComponent, {
        data: { tanggal: this.tanggal },
        width: '640px',
        maxWidth: '95vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((hasil) => {
        if (!hasil) return;
        this.service.buat(hasil).subscribe({
          next: (res: any) => {
            this.daftar = [...this.daftar, { ...hasil, id: res?.id, status: 'rencana' }];
            this.berubah = true;
          },
          error: (e: any) => this.gagal(e),
        });
      });
  }

  /**
   * Sunting satu rencana — termasuk MEMINDAHKAN tanggalnya.
   *
   * Tanggal adalah yang paling sering berubah: pembayaran digeser sepekan,
   * termin mundur, tagihan datang lebih awal. Karena itu ia isian biasa di
   * dalam formulir, bukan sesuatu yang menuntut menghapus lalu membuat ulang.
   */
  sunting(r: any): void {
    this.dialog
      .open(RencanaDialogComponent, {
        data: { rencana: r },
        width: '640px',
        maxWidth: '95vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((hasil) => {
        if (!hasil) return;
        this.service.ubah(r.id, hasil).subscribe({
          next: () => {
            this.berubah = true;
            /*
             * Baris yang tanggalnya BERPINDAH dikeluarkan dari daftar ini.
             *
             * Dialog ini menampilkan satu tanggal saja; membiarkannya tetap
             * di sini membuat orang mengira pemindahannya gagal.
             */
            if (hasil.date !== this.tanggal) {
              this.daftar = this.daftar.filter((x) => x.id !== r.id);
              this.snackBar.open(
                this.translate.instant('rencana.dipindahkan', {
                  tanggal: hasil.date,
                }),
                'Close',
                { duration: 3000 },
              );
              if (!this.daftar.length) this.tutup();
              return;
            }
            this.daftar = this.daftar.map((x) =>
              x.id === r.id ? { ...x, ...hasil } : x,
            );
          },
          error: (e: any) => this.gagal(e),
        });
      });
  }

  tandaiTerpakai(r: any): void {
    this.service.tandaiTerpakai(r.id).subscribe({
      next: () => {
        this.berubah = true;
        this.daftar = this.daftar.map((x) =>
          x.id === r.id ? { ...x, status: 'terpakai' } : x,
        );
      },
      error: (e: any) => this.gagal(e),
    });
  }

  batalkan(r: any): void {
    this.service.batalkan(r.id).subscribe({
      next: () => {
        this.berubah = true;
        this.daftar = this.daftar.map((x) =>
          x.id === r.id ? { ...x, status: 'batal' } : x,
        );
      },
      error: (e: any) => this.gagal(e),
    });
  }

  hapus(r: any): void {
    this.dialog
      .open(DeleteConfirmationComponent, {
        data: {
          title: this.translate.instant('rencana.hapusJudul'),
          prompt: this.translate.instant('rencana.hapusKet', {
            nama: r.description,
          }),
        },
        width: '440px',
        maxWidth: '94vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((ya) => {
        if (!ya) return;
        this.service.hapus(r.id).subscribe({
          next: () => {
            this.berubah = true;
            this.daftar = this.daftar.filter((x) => x.id !== r.id);
            if (!this.daftar.length) this.tutup();
          },
          error: (e: any) => this.gagal(e),
        });
      });
  }

  private gagal(e: any): void {
    this.snackBar.open(
      this.serverMessage.terjemahkan(e, 'notify.saveFailed'),
      'Close',
      { duration: 4000 },
    );
  }

  tutup(): void {
    this.dialogRef.close(this.berubah);
  }
}
