import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { PermissionService } from '../../services/permission.service';

/**
 * Layar "tidak berhak" — dan perbaikan atas putaran tak berujung.
 *
 * KEKELIRUAN YANG DIPERBAIKI
 *
 * `penjaga-level.ts` sudah lama mengarahkan yang levelnya kurang ke
 * `/TidakBerhak`. Rute itu TIDAK PERNAH ADA. Jadi yang terjadi:
 *
 *   /TidakBerhak  ->  cocok dengan `**`  ->  dialihkan ke `''`
 *                 ->  penjaga jalan lagi  ->  levelnya masih kurang
 *                 ->  /TidakBerhak  ->  ... berulang tanpa henti.
 *
 * Tidak ada galat di konsol, tidak ada halaman yang tergambar. Yang membuka
 * aplikasi melihat layar putih yang berkedip. Selama ini tidak ketahuan
 * karena tidak ada level di bawah 3 yang punya alasan membukanya — sampai
 * layar berita acara lapangan ada.
 *
 * DIDAFTARKAN DI LUAR PENJAGA. Rute "tidak berhak" yang ikut dijaga penjaga
 * yang menolaknya adalah putaran yang sama dengan bentuk lain.
 */
@Component({
  selector: 'app-tidak-berhak',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, TranslatePipe],
  templateUrl: './tidak-berhak.component.html',
  styleUrls: ['./tidak-berhak.component.scss'],
})
export class TidakBerhakComponent {
  private readonly izin = inject(PermissionService);
  private readonly router = inject(Router);

  /**
   * Yang boleh mencatat volume DITAWARI jalannya, bukan cuma ditolak.
   *
   * Engineering lapangan memang levelnya di bawah tiga — itu sebabnya ia
   * sampai ke layar ini. Tetapi ia punya satu layar yang memang dibuat
   * untuknya, dan layar penolakan yang tidak menyebutkannya membuat orang
   * menyangka aplikasinya memang tidak untuk dia.
   */
  get bisaBeritaAcara(): boolean {
    return this.izin.can('certificate_of_payment', 'create');
  }

  keBeritaAcara(): void {
    this.router.navigate(['/Berita-acara']);
  }

  keluar(): void {
    try {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
    } catch {}
    window.location.href = '/Login';
  }
}
