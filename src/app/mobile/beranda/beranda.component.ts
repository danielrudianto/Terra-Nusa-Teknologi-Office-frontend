import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationExtras, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import { TarikSegarkanDirective } from '../tarik-segarkan.directive';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ApiService } from '../../services/api.service';
import { AccountService } from '../../services/account.service';
import { PermissionService } from '../../services/permission.service';
import { PushService } from '../../services/push.service';
import { MatSnackBar } from '@angular/material/snack-bar';

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
    CommonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe,
    TarikSegarkanDirective,
  ],
  templateUrl: './beranda.component.html',
  styleUrls: ['./beranda.component.scss'],
})
export class BerandaComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly akun = inject(AccountService);
  private readonly izin = inject(PermissionService);
  private readonly push = inject(PushService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  /** Perangkat ini mendukung notifikasi push? */
  get pushDidukung(): boolean {
    return this.push.didukung();
  }

  /** Perangkat ini sedang berlangganan notifikasi? */
  get pushAktif(): boolean {
    return this.push.berlangganan();
  }

  get pushSedangProses(): boolean {
    return this.push.sedangProses();
  }

  /**
   * Nyalakan/matikan notifikasi di perangkat ini.
   *
   * Ditawarkan HANYA kepada yang berwenang memeriksa: merekalah yang perlu
   * tahu begitu ada PO baru. Yang lain tidak diberi tombol yang tak berguna
   * baginya.
   */
  async aktifkanNotif(): Promise<void> {
    const galat = await this.push.aktifkan();
    if (galat) {
      this.snackBar.open(galat, 'Tutup', { duration: 6000 });
    } else {
      this.snackBar.open('Notifikasi dinyalakan di perangkat ini.', 'Tutup', {
        duration: 3000,
      });
    }
  }

  async matikanNotif(): Promise<void> {
    await this.push.matikan();
    this.snackBar.open('Notifikasi dimatikan di perangkat ini.', 'Tutup', {
      duration: 3000,
    });
  }

  jumlahPo = 0;
  jumlahReimbursement = 0;
  jumlahPeriksa = 0;
  sedangMemuat = false;

  /**
   * Pengguna ini berwenang MEMERIKSA — cerminan `boleh_memeriksa` di server:
   * level 4 ke atas selalu; level 3 hanya bila procurement. Kartu pemeriksaan
   * hanya muncul bila ini benar, supaya yang tidak bertugas memeriksa tidak
   * melihat pekerjaan yang bukan miliknya.
   */
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
    return this.jumlahPo + this.jumlahReimbursement + periksa;
  }

  ngOnInit(): void {
    this.muat();
    // Daftarkan service worker & segarkan status langganan — hanya menyiapkan,
    // tidak meminta izin apa pun sampai pengguna menekan tombolnya.
    if (this.bolehMemeriksa()) {
      void this.push.init();
    }
  }

  muat(): void {
    // Saat tarik-segarkan, indikator tarikannya yang berputar — hero tidak
    // perlu ikut berganti jadi spinner.
    if (!this.sedangSegar) this.sedangMemuat = true;
    forkJoin({
      po: this.api
        .get('purchase-orders', { status: 'pending', page: 1, page_size: 50 })
        .pipe(catchError(() => of(null))),
      reimbursement: this.api
        .get('reimbursements', {
          filter: 1,
          isPending: true,
          page: 1,
          pageSize: 50,
        })
        .pipe(catchError(() => of(null))),
    })
      .subscribe({
        next: (res: any) => {
          /*
           * Yang belum diperiksa TIDAK dihitung.
           *
           * Sama dengan saringan di layar persetujuannya: dokumen yang belum
           * diperiksa memang belum dapat disetujui, dan menghitungnya membuat
           * beranda menjanjikan pekerjaan yang tidak ada di layar berikutnya.
           */
          const po = res?.po?.data ?? res?.po?.items ?? [];
          this.jumlahPo = po.filter((x: any) => !!x?.isChecked).length;
          // Menunggu DIPERIKSA: kebalikan saringannya — yang belum diperiksa.
          this.jumlahPeriksa = po.filter((x: any) => !x?.isChecked).length;

          const rb = res?.reimbursement?.data ?? res?.reimbursement?.items ?? [];
          this.jumlahReimbursement = rb.length;
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

  /** Ke tab Purchase Order pada mode tertentu (periksa / setujui). */
  kePO(mode: 'periksa' | 'setujui'): void {
    const extras: NavigationExtras = { queryParams: { mode } };
    this.router.navigate(['/Purchase-order'], extras);
  }
}
