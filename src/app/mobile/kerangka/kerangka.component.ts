import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

import { AccountService } from '../../services/account.service';
import { PermissionService } from '../../services/permission.service';
import { bolehMembuatBapMobile, bolehMenyetujuiCop } from '../penjaga-level';
import { SettingsService } from '../../services/setting.service';
import { TandaTanganService } from '../../services/tanda-tangan.service';
import { TransisiHalamanDirective } from '../../animations/transisi-halaman.directive';

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
  imports: [
    CommonModule,
    RouterModule,
    RouterOutlet,
    MatIconModule,
    TranslatePipe,
    TransisiHalamanDirective,
  ],
  templateUrl: './kerangka.component.html',
  styleUrls: ['./kerangka.component.scss'],
})
export class KerangkaComponent implements AfterViewInit, OnDestroy {
  private readonly akun = inject(AccountService);
  private readonly izin = inject(PermissionService);
  private readonly router = inject(Router);
  private readonly settings = inject(SettingsService);
  private readonly tandaTangan = inject(TandaTanganService);

  /** Setelan transisi yang berlaku (Pengaturan → Transisi), sama dengan desktop. */
  readonly setelan = computed(() => this.settings.transisiParams());

  /** Berubah tiap halaman berganti — menyalakan `appTransisiHalaman`. */
  readonly kunciRute = signal('');

  catatRute(): void {
    this.kunciRute.set(this.router.url.split('?')[0]);
  }

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
    /*
     * Tanda tangan ditawarkan di sini juga, bukan hanya di kerangka desktop.
     *
     * Justru DI SINI yang paling penting: yang memeriksa dan menyetujui di
     * lapangan memakai ponsel, dan ponsel berpena (S-Pen) adalah tempat
     * tanda tangan paling enak dibuat. Layanannya menjaga sendiri agar
     * dialognya muncul sekali per sesi, jadi membuka aplikasi di dua
     * kerangka tidak berarti ditawari dua kali.
     */
    void this.tandaTangan.tawarkanBilaBelumAda();

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
   * Tab CoP hanya untuk yang BERWENANG menyetujuinya — izinnya DAN levelnya.
   *
   * `can('certificate_of_payment','approve')` saja tidak cukup: matriks izin
   * memberi aksi `approve` mulai level 3, sementara server meminta level 4
   * (`boleh_menyetujui_bap_cop` / `boleh_menyetujui_cop`). Selama tabnya
   * hanya membaca izinnya, manajer level 3 mendapat tab berisi dokumen yang
   * satu pun tidak dapat ia setujui.
   */
  get bisaCop(): boolean {
    return bolehMenyetujuiCop(this.izin);
  }

  /**
   * Tab Berita Acara untuk yang berwenang MEMBUAT CoP
   * (`certificate_of_payment:create`) — bukan yang menyetujuinya.
   *
   * Keduanya berbeda orang: yang mencatat volume di lapangan engineering
   * level 1, yang menyetujui level 4 ke atas. Memakai izin yang sama untuk
   * keduanya menutup tabnya bagi yang justru dibuatkan layarnya.
   *
   * Divisinya ikut diperiksa (`bolehMembuatBapMobile`). Server meminta
   * divisi engineering bagi yang di bawah level 4 (`boleh_membuat_cop`),
   * dan pemeriksaan divisi di dalam `can()` DILEWATI ketika daftar divisi
   * penggunanya kosong — jadi akun tanpa divisi lolos `can()`, mendapat
   * tabnya, mengetik seluruh volume di lapangan, lalu ditolak saat menyimpan.
   */
  get bisaBeritaAcara(): boolean {
    return bolehMembuatBapMobile(this.izin);
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
