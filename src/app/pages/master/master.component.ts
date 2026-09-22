import { Component, computed, inject, signal } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TransisiHalamanDirective } from '../../animations/transisi-halaman.directive';
import { SettingsService } from '../../services/setting.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { PermissionService } from '../../services/permission.service';
import { MASTER_NAV, MasterNavItem } from './master-nav';


@Component({
  selector: 'app-master',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    TranslatePipe,
    TransisiHalamanDirective,
  ],
  templateUrl: './master.component.html',
  styleUrl: './master.component.scss',
  /*
   * TIDAK ada `animations: [...]` lagi.
   *
   * Pemicu animasi Angular yang terpasang pada INDUK `<router-outlet>`
   * menunda pembuangan simpul halaman lama selama animasinya berjalan —
   * itulah halaman yang terlihat bertumpuk, dan itu pula yang membuat
   * komponennya tidak pernah dihancurkan. Gerakannya sekarang dijalankan
   * `TransisiHalamanDirective` lewat Web Animations API, yang tidak tahu
   * apa-apa tentang penyisipan maupun pembuangan simpul.
   */
})
export class MasterComponent {
  constructor(private translate: TranslateService) {}

  private readonly settings = inject(SettingsService);

  /**
   * Setelan transisi yang BERLAKU.
   *
   * Dulu halaman ini hanya meminjam DURASINYA dan memakai gerakan tetap
   * `translateY(10px)`. Akibatnya jenis yang dipilih pengguna di Pengaturan —
   * morph, geser kiri, dan seterusnya — berlaku di seluruh aplikasi KECUALI
   * di dalam Data Master, tanpa ada yang menjelaskan kenapa.
   */
  readonly setelan = computed(() => this.settings.transisiParams());

  /**
   * Menu samping halaman master.
   *
   * `name` dan `description` berisi kunci terjemahan, bukan teks jadi —
   * templatenya sudah memakai pipe translate.
   */
  private readonly izin = inject(PermissionService);

  /**
   * Menu ini boleh dibuka oleh pengguna yang sedang masuk.
   *
   * Menu yang tidak boleh TETAP DITAMPILKAN, hanya dinonaktifkan. Kartu yang
   * hilang membuat orang mengira halamannya memang tidak ada; kartu yang
   * kelabu memberi tahu bahwa halamannya ada dan aksesnya yang kurang.
   */
  bolehBuka(item: MasterNavItem): boolean {
    return this.izin.canRead(item.modul);
  }

  navItems: MasterNavItem[] = MASTER_NAV;

  /*
   * Kunci transisi disimpan sebagai SIGNAL yang diisi saat outlet
   * mengaktifkan halaman, BUKAN dihitung dari outlet di dalam templat.
   *
   * Outlet baru aktif SESUDAH templat ini diperiksa, jadi `getRouteState`
   * yang dipanggil dari templat membaca 'empty' lalu 'Client' dalam satu
   * putaran — NG0100 (ExpressionChangedAfterItHasBeenChecked) di mode
   * pengembangan. Signal yang berubah memicu pemeriksaan ulang yang sah.
   */
  readonly kunciRute = signal('empty');

  catatRute(outlet: RouterOutlet): void {
    this.kunciRute.set(this.getRouteState(outlet));
  }

  // key unik per route -> animasi ter-trigger tiap ganti halaman
  getRouteState(outlet: RouterOutlet): string {
    return outlet?.isActivated
      ? outlet.activatedRoute?.snapshot?.routeConfig?.path || 'root'
      : 'empty';
  }
}
