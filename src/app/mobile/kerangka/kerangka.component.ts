import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

import { AccountService } from '../../services/account.service';
import { PermissionService } from '../../services/permission.service';

/**
 * Kerangka aplikasi mobile: kepala tipis di atas, navigasi di BAWAH.
 *
 * Navigasinya di bawah bukan selera. Ponsel dipegang satu tangan, dan yang
 * dapat dijangkau ibu jari hanya sepertiga bawah layar — menu di atas
 * memaksa menggeser pegangan setiap kali berpindah, dan itu yang membuat
 * orang salah tekan pada layar yang isinya menyetujui dan menghapus.
 */
@Component({
  selector: 'app-kerangka',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet, MatIconModule, TranslatePipe],
  templateUrl: './kerangka.component.html',
  styleUrls: ['./kerangka.component.scss'],
})
export class KerangkaComponent {
  private readonly akun = inject(AccountService);
  private readonly izin = inject(PermissionService);
  private readonly router = inject(Router);

  get nama(): string {
    return this.akun.displayName;
  }

  get inisial(): string {
    return this.akun.initials;
  }

  get level(): number {
    return this.izin.level();
  }

  /**
   * Tab pemeriksaan hanya untuk yang berwenang memeriksa — cerminan
   * `boleh_memeriksa` di server: level 4 ke atas selalu; level 3 hanya bila
   * procurement. Bagi yang lain bilah bawah tetap lima tab seperti semula.
   */
  get bolehMemeriksa(): boolean {
    const lv = this.izin.level();
    if (lv >= 4) return true;
    if (lv < 3) return false;
    return this.izin.inDepartment('procurement');
  }

  /**
   * Keluar: token dibuang, lalu halaman dimuat ULANG.
   *
   * Bukan sekadar berpindah rute. Layanan izin menyimpan level dan divisi
   * pengguna sebelumnya di memori; berpindah tanpa memuat ulang membuat
   * pengguna berikutnya di ponsel yang sama mewarisi izin orang sebelumnya
   * sampai jawaban server datang.
   */
  keluar(): void {
    try {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
    } catch {}
    window.location.href = '/Login';
  }

  ke(jalur: string): void {
    this.router.navigate([jalur]);
  }
}
