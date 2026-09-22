import { Location } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * Alamat yang tidak ada.
 *
 * Sebelumnya tidak ada rute penangkap sama sekali: alamat yang salah ketik
 * atau tautan lama menghasilkan halaman KOSONG di dalam kerangka — tanpa
 * pesan, dan yang membukanya mengira aplikasinya rusak. Halaman ini tetap
 * di dalam kerangka (menu samping tetap ada), menyebut alamat yang dicari,
 * dan memberi dua jalan keluar.
 */
@Component({
  selector: 'app-tidak-ditemukan',
  standalone: true,
  imports: [RouterModule, MatIconModule, TranslatePipe],
  templateUrl: './tidak-ditemukan.component.html',
  styleUrl: './tidak-ditemukan.component.scss',
})
export class TidakDitemukanComponent {
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  readonly alamat = this.router.url;
  /** Ada halaman sebelumnya di aplikasi ini untuk dituju "Kembali". */
  readonly bisaKembali = !!this.router.lastSuccessfulNavigation?.previousNavigation;

  kembali(): void {
    if (this.bisaKembali) this.location.back();
    else this.router.navigateByUrl('/');
  }
}
