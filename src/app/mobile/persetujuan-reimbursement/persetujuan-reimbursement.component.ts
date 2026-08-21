import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { debounceTime } from 'rxjs/operators';

import { ApiService } from '../../services/api.service';
import { AccountService } from '../../services/account.service';
import { ServerMessageService } from '../../services/server-message.service';
import { TarikSegarkanDirective } from '../tarik-segarkan.directive';
import { ScrollBawahDirective } from '../scroll-bawah.directive';
import { GeserTutupDirective } from '../geser-tutup.directive';

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
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    TranslatePipe,
    TarikSegarkanDirective,
    ScrollBawahDirective,
    GeserTutupDirective,
  ],
  templateUrl: './persetujuan-reimbursement.component.html',
  styleUrls: [
    './persetujuan-reimbursement.component.scss',
    // Pakai ulang gaya kotak cari & kaki daftar (pod-*) dari daftar PO.
    '../po-daftar/po-daftar.component.scss',
  ],
})
export class PersetujuanReimbursementComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly akun = inject(AccountService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly pesanServer = inject(ServerMessageService);

  daftar: any[] = [];
  sedangMemuat = false;
  sedangSegar = false;
  sedangMuatLagi = false;
  habis = false;
  private page = 1;
  private readonly pageSize = 20;
  cariCtrl = new FormControl('');
  sedangKirim = false;
  dipilih: any = null;

  ngOnInit(): void {
    this.muat(true);
    this.cariCtrl.valueChanges
      .pipe(debounceTime(350))
      .subscribe(() => this.muat(true));
  }

  muat(reset: boolean): void {
    if (reset) {
      this.page = 1;
      this.habis = false;
      if (!this.sedangSegar) this.sedangMemuat = true;
    } else {
      if (this.habis || this.sedangMuatLagi || this.sedangMemuat) return;
      this.sedangMuatLagi = true;
    }
    const kata = (this.cariCtrl.value || '').trim();
    this.api
      .get('reimbursements', {
        filter: 1,
        isPending: true,
        keyword: kata || undefined,
        page: this.page,
        pageSize: this.pageSize,
        sortBy: 'date',
        sortByDirection: 'desc',
      })
      .subscribe({
        next: (res: any) => {
          const mentah: any[] = res?.data ?? res?.items ?? [];
          if (mentah.length < this.pageSize) this.habis = true;
          this.daftar = reset ? mentah : [...this.daftar, ...mentah];
        },
        error: () => {
          if (reset)
            this.snackBar.open(
              this.translate.instant('notify.loadFailed'),
              'Close',
              { duration: 3000 },
            );
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

  /** Rincian baris pengajuan yang sedang dibuka (apa saja yang diganti). */
  rincianItem: any[] = [];
  memuatRincian = false;

  /**
   * Ditandai sudah diperiksa oleh yang menyetujui.
   *
   * Bukan pengaman — server tetap memutuskan — melainkan PENGHENTI LANGKAH:
   * tombol Setujui baru hidup setelah ini ditandai, supaya persetujuan bukan
   * satu ketukan refleks di ponsel. Reimbursement adalah uang yang akan
   * benar-benar ditransfer; menyetujuinya tanpa membaca rinciannya persis yang
   * hendak dicegah.
   */
  sudahBaca = false;
  tandaiBaca(dicentang: boolean): void {
    this.sudahBaca = dicentang;
  }

  buka(r: any): void {
    this.dipilih = r;
    this.rincianItem = [];
    this.sudahBaca = false;
    this.memuatRincian = true;
    // Ambil rincian: baris pengeluaran + nomor rekening tujuan. Menyetujui
    // tanpa melihat "uang ini untuk apa" dan "ditransfer ke mana" berarti
    // tanda tangan atas sesuatu yang tidak terbaca.
    this.api.get(`reimbursements/${r.id}`, {}).subscribe({
      next: (res: any) => {
        const inti = res?.reimbursement ?? {};
        this.dipilih = { ...r, ...inti };
        this.rincianItem = res?.reimbursement_items ?? res?.items ?? [];
      },
      error: () => {
        // Gagal memuat rincian: biarkan data daftar apa adanya.
        this.rincianItem = [];
      },
    }).add(() => (this.memuatRincian = false));
  }

  tutup(): void {
    this.dipilih = null;
    this.rincianItem = [];
    this.sudahBaca = false;
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
   * Jenis pengeluaran — hanya tiga. Kuncinya sama dengan daftar desktop
   * supaya labelnya tidak pernah berbeda antar layar.
   */
  jenisKunci(r: any): string {
    switch (r?.purchaseType) {
      case 'A':
        return 'reimbursementType.transport';
      case 'E':
        return 'reimbursementType.consumption';
      case '5.1.6':
        return 'reimbursementType.document';
      default:
        return 'reimbursement.unknown';
    }
  }

  jenisIkon(r: any): string {
    switch (r?.purchaseType) {
      case 'A':
        return 'directions_car';
      case 'E':
        return 'restaurant';
      case '5.1.6':
        return 'description';
      default:
        return 'category';
    }
  }

  /** Salin ke papan klip; nomor rekening & nominal kerap disalin ke m-banking. */
  salin(teks: any): void {
    const v = String(teks ?? '').replace(/\s+/g, ' ').trim();
    if (!v) return;
    const beri = () =>
      this.snackBar.open(this.translate.instant('mobile.disalin'), 'Tutup', {
        duration: 1500,
      });
    try {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(v).then(beri).catch(() => {});
      } else {
        // Cadangan untuk peramban lama / konteks non-HTTPS.
        const ta = document.createElement('textarea');
        ta.value = v;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        beri();
      }
    } catch {
      /* diam: menyalin gagal bukan alasan menahan apa pun */
    }
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
          this.muat(true);
        },
        error: (err) =>
          this.snackBar.open(this.pesanServer.terjemahkan(err), 'Close', {
            duration: 5000,
          }),
      })
      .add(() => (this.sedangKirim = false));
  }
}
