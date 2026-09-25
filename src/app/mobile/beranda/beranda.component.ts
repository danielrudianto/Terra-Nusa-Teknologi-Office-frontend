import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationExtras, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import { TarikSegarkanDirective } from '../tarik-segarkan.directive';
import { AgendaRingkasComponent } from './agenda-ringkas/agenda-ringkas.component';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ApiService } from '../../services/api.service';
import { AccountService } from '../../services/account.service';
import { PermissionService } from '../../services/permission.service';
import { bolehDrafPembelianMobile, bolehMenyetujuiCop } from '../penjaga-level';
import { tanggalLokalTeks } from '../../utils/tanggal';
import { HitungNaikDirective } from '../../directives/hitung-naik.directive';

/**
 * Beranda mobile: berapa yang menunggu, dan jalan ke sana.
 *
 * Angkanya bukan hiasan. Yang membuka aplikasi ini biasanya sedang di luar
 * kantor dan ingin tahu satu hal — ada yang perlu diputuskan atau tidak.
 * Tanpa angkanya, ia harus membuka kedua layar bergantian untuk menemukan
 * bahwa keduanya kosong. Karena itu jumlah yang menunggu ditampilkan besar
 * di atas, sebelum apa pun yang lain.
 */
@Component({
  selector: 'app-beranda',
  standalone: true,
  imports: [
    HitungNaikDirective,
    CommonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe,
    TarikSegarkanDirective,
    AgendaRingkasComponent,
  ],
  templateUrl: './beranda.component.html',
  styleUrls: ['./beranda.component.scss'],
})
export class BerandaComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly akun = inject(AccountService);
  private readonly izin = inject(PermissionService);
  private readonly router = inject(Router);

  jumlahPo = 0;
  jumlahReimbursement = 0;
  jumlahPeriksa = 0;
  /** CoP yang belum diperiksa, dan yang sudah diperiksa tetapi belum disetujui. */
  jumlahCopPeriksa = 0;
  jumlahCopSetujui = 0;
  /** Pembayaran keluar yang menunggu keputusan HARI INI dan sebelumnya. */
  jumlahPembayaran = 0;
  sedangMemuat = false;

  /** Boleh menyetujui reimbursement (mis. accounting / level berwenang). */
  bisaReimbursement(): boolean {
    return this.izin.can('reimbursement', 'approve');
  }

  /**
   * Pengguna ini berwenang MEMERIKSA — cerminan `boleh_memeriksa` di server:
   * level 4 ke atas selalu; level 3 hanya bila procurement. Kartu pemeriksaan
   * hanya muncul bila ini benar, supaya yang tidak bertugas memeriksa tidak
   * melihat pekerjaan yang bukan miliknya.
   */
  /**
   * Berwenang atas certificate of payment.
   *
   * Memeriksa mulai level 2, menyetujui mulai level 3 — cerminan
   * `boleh_memeriksa_cop` dan `boleh_menyetujui_cop` di server. Kartunya
   * hanya muncul bila benar: beranda yang menjanjikan pekerjaan yang tidak
   * ada layarnya bagi pembacanya lebih buruk daripada beranda yang kosong.
   */
  bisaDrafPembelian(): boolean {
    return bolehDrafPembelianMobile(this.izin);
  }

  bisaPeriksaCop(): boolean {
    return this.izin.can('certificate_of_payment', 'read') && this.izin.level() >= 2;
  }

  /**
   * Level 4, bukan 3.
   *
   * `boleh_menyetujui_cop` di server meminta level 4. Kartu yang muncul pada
   * level 3 menjanjikan pekerjaan yang setiap barisnya akan ditolak 403 —
   * dan angkanya ikut masuk ke "yang menunggu Anda" di puncak layar.
   */
  bisaSetujuiCop(): boolean {
    return bolehMenyetujuiCop(this.izin);
  }

  /**
   * Berwenang memutuskan pembayaran keluar.
   *
   * `payment_outgoing:approve` sudah memperhitungkan divisi dan akun
   * hanya-baca; tidak ada aturan tambahan di sini.
   */
  bisaPembayaran(): boolean {
    return this.izin.can('payment_outgoing', 'approve');
  }

  bolehMemeriksa(): boolean {
    const lv = this.izin.level();
    if (lv >= 4) return true;
    if (lv < 3) return false;
    return this.izin.inDepartment('procurement');
  }

  get namaDepan(): string {
    // Nama depan saja: sapaan di ponsel yang menyebut nama lengkap terbaca
    // kaku, seperti surat resmi, bukan aplikasi yang dipakai sendiri.
    const nama = this.akun.displayName?.trim() || '';
    return nama.split(/\s+/)[0] || nama;
  }

  /**
   * Total yang menunggu keputusan.
   *
   * Pemeriksaan ikut dihitung HANYA bagi yang berwenang memeriksa — bagi yang
   * lain angka itu bukan pekerjaannya, dan memasukkannya membuat beranda
   * menjanjikan tugas yang tidak ada di layar mana pun untuknya.
   */
  get totalMenunggu(): number {
    const periksa = this.bolehMemeriksa() ? this.jumlahPeriksa : 0;
    const reim = this.bisaReimbursement() ? this.jumlahReimbursement : 0;
    const copP = this.bisaPeriksaCop() ? this.jumlahCopPeriksa : 0;
    const copS = this.bisaSetujuiCop() ? this.jumlahCopSetujui : 0;
    // PO ikut disaring juga: yang tidak berwenang menyetujui tetap melihat
    // angkanya masuk ke "yang menunggu Anda", padahal tombolnya tidak ada.
    const po = this.izin.can('purchase_order', 'approve') ? this.jumlahPo : 0;
    const bayar = this.bisaPembayaran() ? this.jumlahPembayaran : 0;
    return po + reim + periksa + copP + copS + bayar;
  }

  ngOnInit(): void {
    this.muat();
  }

  muat(): void {
    // Saat tarik-segarkan, indikator tarikannya yang berputar — hero tidak
    // perlu ikut berganti jadi spinner.
    if (!this.sedangSegar) this.sedangMemuat = true;
    // Angka diambil dari `count` server (bukan menghitung larik satu halaman)
    // — sama dengan penyaring di layar PO, sehingga beranda dan layarnya tidak
    // pernah menyebut jumlah yang berbeda. page_size 1: kita hanya perlu
    // angkanya, bukan datanya.
    forkJoin({
      periksa: this.api
        .get('purchase-orders', {
          // `status` saja: `status` + `checked` berlawanan saling
          // meniadakan di server (lihat `po-daftar.muat`).
          status: 'draft',
          page: 1,
          page_size: 1,
        })
        .pipe(catchError(() => of(null))),
      po: this.api
        .get('purchase-orders', {
          status: 'checked',
          page: 1,
          page_size: 1,
        })
        .pipe(catchError(() => of(null))),
      reimbursement: this.api
        .get('reimbursements', {
          filter: 1,
          isPending: true,
          page: 1,
          pageSize: 50,
        })
        .pipe(catchError(() => of(null))),
      // Angkanya dibaca dari `total` jawaban server, dengan `keadaan`
      // disaring DI SANA. Menghitung larik satu halaman akan berhenti di
      // dua puluh berapa pun banyaknya yang sebenarnya menunggu.
      copPeriksa: this.api
        .get('certificate-of-payments/', {
          keadaan: 'draft',
          page: 0,
          pageSize: 1,
        })
        .pipe(catchError(() => of(null))),
      copSetujui: this.api
        .get('certificate-of-payments/', {
          keadaan: 'diperiksa',
          page: 0,
          pageSize: 1,
        })
        .pipe(catchError(() => of(null))),
      /*
       * Pembayaran yang menunggu, SAMPAI hari ini.
       *
       * `dateTo` saja, tanpa `dateFrom`: yang tanggalnya sudah lewat dan
       * belum diputuskan justru yang paling perlu terlihat, dan pada
       * "hari ini" saja ia tidak pernah muncul sama sekali.
       */
      pembayaran: this.api
        .get('outgoing-payments', {
          isPending: true,
          dateTo: tanggalLokalTeks(new Date()),
          page: 1,
          pageSize: 1,
        })
        .pipe(catchError(() => of(null))),
    })
      .subscribe({
        next: (res: any) => {
          this.jumlahPeriksa = Number(res?.periksa?.count) || 0;
          this.jumlahPo = Number(res?.po?.count) || 0;

          this.jumlahCopPeriksa = Number(res?.copPeriksa?.total) || 0;
          this.jumlahCopSetujui = Number(res?.copSetujui?.total) || 0;

          this.jumlahPembayaran = Number(res?.pembayaran?.count) || 0;

          const rb = res?.reimbursement?.data ?? res?.reimbursement?.items ?? [];
          this.jumlahReimbursement =
            Number(res?.reimbursement?.count) || rb.length || 0;
        },
        error: () => {},
      })
      // `sedangMemuat` dimatikan SESUDAH permintaannya selesai, bukan di
      // baris berikutnya — yang sebelumnya mematikannya seketika, sehingga
      // pemuatnya tidak pernah terlihat dan angkanya melonjak dari nol.
      .add(() => {
        this.sedangMemuat = false;
        this.sedangSegar = false;
      });
  }

  /** Tarik-untuk-menyegarkan: muat ulang DATANYA, bukan halamannya. */
  sedangSegar = false;
  segarkan(): void {
    this.sedangSegar = true;
    this.muat();
  }

  ke(jalur: string): void {
    this.router.navigate([jalur]);
  }

  /**
   * Ke daftar CoP, disaring pada keadaan yang ditunjuk kartunya.
   *
   * `dibuat`, BUKAN nama lamanya `diperiksa`. Keduanya menghasilkan syarat
   * SQL yang sama persis di server, tetapi hanya `dibuat` yang punya keping
   * di bilah penyaring daftarnya — dengan nama lama, daftarnya terbuka
   * tersaring tanpa satu keping pun menyala, dan yang membandingkannya
   * dengan tab lain menyimpulkan datanya yang kacau.
   */
  keCop(keadaan: 'draft' | 'dibuat'): void {
    this.router.navigate(['/Certificate-of-payment'], {
      queryParams: { keadaan },
    });
  }

  /** Ke tab Purchase Order pada mode tertentu (periksa / setujui). */
  kePO(mode: 'periksa' | 'setujui'): void {
    const extras: NavigationExtras = { queryParams: { mode } };
    this.router.navigate(['/Purchase-order'], extras);
  }
}
