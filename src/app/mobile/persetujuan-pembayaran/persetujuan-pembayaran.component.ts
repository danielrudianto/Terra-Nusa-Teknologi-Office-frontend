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
import { PermissionService } from '../../services/permission.service';
import { ServerMessageService } from '../../services/server-message.service';
import { TarikSegarkanDirective } from '../tarik-segarkan.directive';
import { ScrollBawahDirective } from '../scroll-bawah.directive';
import { GeserTutupDirective } from '../geser-tutup.directive';
import { lembarBawah } from '../gerak-lembar';
import { gerakMati } from '../../animations/gerak';
import { KartuKerangkaComponent } from '../kartu-kerangka/kartu-kerangka.component';
import { tanggalLokalTeks } from '../../utils/tanggal';
import { LEVEL_SETUJU_SENDIRI } from '../penjaga-level';

/** Jangkauan tanggal yang ditawarkan. */
export type Jangkauan = 'hari-ini' | 'jatuh-tempo' | 'semua';

/**
 * Menyetujui dan menolak PEMBAYARAN KELUAR dari ponsel.
 *
 * KENAPA LAYAR INI ADA
 *
 * Pembayaran adalah satu-satunya tahap di seluruh alur yang benar-benar
 * MEMINDAHKAN UANG. Semua yang sebelumnya — purchase order, berita acara,
 * CoP, faktur — menghasilkan dokumen; yang ini menghasilkan transfer.
 *
 * Dan justru tahap itu yang paling terikat waktu: pembayaran hari ini harus
 * diputuskan hari ini, kerap saat yang berwenang sedang tidak di depan
 * komputer. Yang terjadi tanpa layar ini bukan penundaan yang tercatat,
 * melainkan persetujuan yang dikejar lewat pesan — "tolong approve yang
 * atas nama X ya" — dan disetujui oleh orang yang tidak pernah melihat
 * nominal maupun rekening tujuannya.
 *
 * BAWAANNYA HARI INI, BUKAN SELURUHNYA
 *
 * Daftar penuh membuat yang mendesak tenggelam. Jangkauannya tetap dapat
 * dilebarkan — "jatuh tempo" memuat yang tanggalnya sudah lewat dan belum
 * diputuskan, yang justru paling sering terlupa.
 *
 * YANG DITOLAK DI SINI, DITOLAK JUGA DI SERVER
 *
 * Tidak ada satu pun aturan baru di layar ini. Persetujuan atas pembayaran
 * buatan sendiri ditolak server bagi yang bukan pemilik usaha, dan yang
 * sudah disetujui atau sudah dihapus ditolak dengan 400. Keduanya diperiksa
 * di sini HANYA supaya tombolnya tidak menawarkan sesuatu yang pasti gagal —
 * penolakan sesudah ditekan terbaca sebagai kerusakan, bukan sebagai aturan.
 */
@Component({
  animations: [lembarBawah],
  selector: 'app-persetujuan-pembayaran',
  standalone: true,
  imports: [
    KartuKerangkaComponent,
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
  templateUrl: './persetujuan-pembayaran.component.html',
  styleUrls: [
    './persetujuan-pembayaran.component.scss',
    // Pakai ulang kotak cari & kaki daftar (pod-*) dari daftar PO.
    '../po-daftar/po-daftar.component.scss',
  ],
})
export class PersetujuanPembayaranComponent implements OnInit {
  /** Sakelar gerak aplikasi — mematikan gerak keluar lembar. */
  readonly gerakMati = gerakMati;

  private readonly api = inject(ApiService);
  private readonly akun = inject(AccountService);
  private readonly izin = inject(PermissionService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly pesanServer = inject(ServerMessageService);

  readonly JANGKAUAN: Jangkauan[] = ['hari-ini', 'jatuh-tempo', 'semua'];
  jangkauan: Jangkauan = 'hari-ini';

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

  /**
   * Ditandai sudah diperiksa oleh yang menyetujui.
   *
   * Bukan pengaman — server tetap memutuskan — melainkan PENGHENTI LANGKAH.
   * Yang disetujui di sini uang yang benar-benar akan keluar ke satu nomor
   * rekening; satu ketukan refleks di ponsel persis yang hendak dicegah.
   */
  sudahBaca = false;

  ngOnInit(): void {
    this.muat(true);
    this.cariCtrl.valueChanges
      .pipe(debounceTime(350))
      .subscribe(() => this.muat(true));
  }

  gantiJangkauan(j: Jangkauan): void {
    if (this.jangkauan === j) return;
    this.jangkauan = j;
    this.muat(true);
  }

  /**
   * Rentang tanggal yang dikirim ke server.
   *
   * Disaring di SERVER, bukan di layar: memfilter per-halaman di ponsel
   * membuat pembayaran yang cocok — tetapi berada di halaman berikutnya —
   * tidak pernah tampil, sehingga daftarnya terlihat kosong padahal ada.
   */
  private rentang(): { dateFrom?: string; dateTo?: string } {
    const hariIni = tanggalLokalTeks(new Date());
    switch (this.jangkauan) {
      case 'hari-ini':
        return { dateFrom: hariIni, dateTo: hariIni };
      // Yang tanggalnya SUDAH LEWAT dan belum diputuskan — justru yang
      // paling sering terlupa, dan tidak pernah muncul pada "hari ini".
      case 'jatuh-tempo':
        return { dateTo: hariIni };
      default:
        return {};
    }
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
      .get('outgoing-payments', {
        isPending: true,
        keyword: kata || undefined,
        ...this.rentang(),
        page: this.page,
        pageSize: this.pageSize,
        sortBy: 'date',
        sortByDirection: 'asc',
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

  buka(p: any): void {
    this.dipilih = p;
    this.sudahBaca = false;
  }

  tutup(): void {
    this.dipilih = null;
    this.sudahBaca = false;
  }

  tandaiBaca(dicentang: boolean): void {
    this.sudahBaca = dicentang;
  }

  // ---- wewenang -----------------------------------------------------

  /** Berwenang memutuskan pembayaran — menyetujui maupun menolak. */
  get bolehMemutuskan(): boolean {
    return this.izin.can('payment_outgoing', 'approve');
  }

  /** Pemilik usaha boleh menyetujui yang dibuatnya sendiri. */
  get pemilikUsaha(): boolean {
    return this.izin.level() >= LEVEL_SETUJU_SENDIRI;
  }

  /** Pembayaran ini dibuat oleh yang sedang masuk. */
  buatanSendiri(p: any): boolean {
    const saya = this.akun.userId;
    // Tanpa id, anggap bukan buatan sendiri: server tetap menolak bila
    // ternyata iya, dan pesannya lebih jelas daripada tombol yang mati.
    if (saya === null) return false;
    return Number(p?.createdBy) === saya;
  }

  /** Sudah diputuskan — tidak dapat diputuskan lagi (server menjawab 400). */
  sudahDiputuskan(p: any): boolean {
    return !!(p?.isApprove || p?.isDelete);
  }

  bolehSetujui(p: any): boolean {
    if (!this.bolehMemutuskan || this.sudahDiputuskan(p)) return false;
    return !this.buatanSendiri(p) || this.pemilikUsaha;
  }

  /**
   * Menolak tidak terhalang "buatan sendiri".
   *
   * Menarik kembali pembayaran yang disiapkannya sendiri masuk akal dan
   * tidak memindahkan uang kepada siapa pun. Yang ditahan hanya yang sudah
   * diputuskan.
   */
  bolehTolak(p: any): boolean {
    return this.bolehMemutuskan && !this.sudahDiputuskan(p);
  }

  // ---- tindakan -----------------------------------------------------

  setujui(p: any): void {
    if (!this.bolehSetujui(p) || !this.sudahBaca) return;
    this.kirim('approve', p, 'notify.approveSuccess');
  }

  tolak(p: any): void {
    if (!this.bolehTolak(p)) return;
    this.kirim('reject', p, 'notify.paymentRejected');
  }

  private kirim(jalur: string, p: any, kunciSukses: string): void {
    this.sedangKirim = true;
    this.api
      .put(`outgoing-payments/${jalur}/${p.id}`, {})
      .subscribe({
        next: () => {
          this.snackBar.open(this.translate.instant(kunciSukses), 'Close', {
            duration: 2500,
          });
          // Barisnya dibuang dari daftar, bukan hanya ditandai: daftar ini
          // hanya memuat yang MENUNGGU, jadi yang sudah diputuskan memang
          // bukan bagiannya lagi.
          this.daftar = this.daftar.filter((x) => x.id !== p.id);
          this.tutup();
        },
        error: (e) => {
          this.snackBar.open(this.pesanServer.terjemahkan(e), 'Close', {
            duration: 4000,
          });
        },
      })
      .add(() => (this.sedangKirim = false));
  }

  // ---- tampilan -----------------------------------------------------

  /** Nama yang dibayar — pemasok, pegawai, atau lawan transaksi. */
  namaLawan(p: any): string {
    return p?.opponentName || p?.documentName || '—';
  }

  nilai(p: any): number {
    return Number(p?.amount) || 0;
  }

  /** Tanggalnya sudah lewat dan masih menunggu. */
  terlambat(p: any): boolean {
    const t = String(p?.date ?? '').slice(0, 10);
    return !!t && t < tanggalLokalTeks(new Date());
  }

  /**
   * Salin — nomor rekening dan nominal.
   *
   * Yang menyetujui dari ponsel kerap sekaligus yang mengetik transfernya di
   * aplikasi bank. Mengetik ulang enam belas digit dari layar ke layar
   * adalah tempat paling mudah salah di seluruh alur ini.
   *
   * Cadangan `execCommand` tetap ada: `navigator.clipboard` tidak tersedia
   * pada konteks non-HTTPS maupun sebagian peramban lama, dan kegagalannya
   * senyap — tombolnya ditekan, tidak terjadi apa-apa.
   */
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
      // Menyalin gagal bukan galat yang perlu diperlihatkan; angkanya tetap
      // terbaca di layar.
    }
  }
}
