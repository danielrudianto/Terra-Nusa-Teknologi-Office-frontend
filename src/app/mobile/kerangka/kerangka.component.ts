import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';
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
export class KerangkaComponent implements AfterViewInit, OnDestroy {
  private readonly akun = inject(AccountService);
  private readonly izin = inject(PermissionService);
  private readonly router = inject(Router);

  @ViewChild('kepala') kepala?: ElementRef<HTMLElement>;
  private ro?: ResizeObserver;

  /**
   * Tinggi kepala diekspos sebagai `--tinggi-kepala`.
   *
   * Kepala menempel di puncak; kotak cari pada daftar juga menempel, tepat DI
   * BAWAHNYA. Tanpa nilai tinggi kepala yang sebenarnya, keduanya bertumpuk.
   * Diukur nyata (skala teks dapat mengubahnya) dan diperbarui saat berubah.
   */
  ngAfterViewInit(): void {
    const el = this.kepala?.nativeElement;
    if (!el) return;
    const set = () =>
      document.documentElement.style.setProperty(
        '--tinggi-kepala',
        `${Math.round(el.getBoundingClientRect().height)}px`,
      );
    set();
    try {
      this.ro = new ResizeObserver(set);
      this.ro.observe(el);
    } catch {
      /* peramban lama tanpa ResizeObserver: nilai awal tetap dipakai */
    }
  }

  ngOnDestroy(): void {
    this.ro?.disconnect();
  }

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
   * Tab Reimbursement hanya untuk yang BERWENANG menyetujuinya
   * (`reimbursement:approve`). Level 3 yang bukan accounting tidak memilikinya,
   * jadi tabnya tidak ditawarkan — bukan sekadar dinonaktifkan — supaya tidak
   * tertekan tak sengaja.
   */
  get bisaReimbursement(): boolean {
    return this.izin.can('reimbursement', 'approve');
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
