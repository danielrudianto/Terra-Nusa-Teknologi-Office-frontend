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
  private readonly router = inject(Router);

  jumlahPo = 0;
  jumlahReimbursement = 0;
  jumlahPeriksa = 0;
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
    return this.jumlahPo + reim + periksa;
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
          status: 'draft',
          checked: false,
          page: 1,
          page_size: 1,
        })
        .pipe(catchError(() => of(null))),
      po: this.api
        .get('purchase-orders', {
          status: 'draft',
          checked: true,
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
    })
      .subscribe({
        next: (res: any) => {
          this.jumlahPeriksa = Number(res?.periksa?.count) || 0;
          this.jumlahPo = Number(res?.po?.count) || 0;

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

  /** Ke tab Purchase Order pada mode tertentu (periksa / setujui). */
  kePO(mode: 'periksa' | 'setujui'): void {
    const extras: NavigationExtras = { queryParams: { mode } };
    this.router.navigate(['/Purchase-order'], extras);
  }
}
