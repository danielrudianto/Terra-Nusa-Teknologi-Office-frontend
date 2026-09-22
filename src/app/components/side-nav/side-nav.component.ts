import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { SideNavItemComponent } from './side-nav-item/side-nav-item.component';
import { LencanaService } from '../../services/lencana.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LogoComponent } from '../logo/logo.component';
import { VersiService } from 'src/app/services/versi.service';
import { MatIconModule } from '@angular/material/icon';
import { PermissionService } from '../../services/permission.service';
import { MASTER_NAV } from '../../pages/master/master-nav';

/** Larik kosong yang TETAP — lihat `hasilMaster`. */
const KOSONG: { name: string; route: string; icon: string }[] = [];

@Component({
  selector: 'app-side-nav',
  imports: [
    LogoComponent,
    TranslatePipe,
    CommonModule,
    FormsModule,
    RouterModule,
    SideNavItemComponent,
    MatIconModule,
  ],
  templateUrl: './side-nav.component.html',
  styleUrls: ['./side-nav.component.scss'],
  standalone: true,
})
export class SideNavComponent implements OnInit {
  /*
   * Dipakai LANGSUNG dari template lewat `lencana.untukRute(i.route)`.
   *
   * Pemetaan rute -> hitungan tinggal di layanannya, satu tempat. Menyalinnya
   * ke komponen ini berarti dua daftar yang harus tetap sepakat, dan yang
   * tertinggal saat rutenya berubah tidak menimbulkan galat — lencananya
   * hanya diam-diam berhenti muncul di satu menu.
   */
  readonly lencana = inject(LencanaService);
  private readonly izin = inject(PermissionService);

  readonly versi = inject(VersiService);

  @Input('items') items: any[] = [];

  /**
   * Rute yang menjadi awalan rute lain di menu ini.
   *
   * Dihitung dari daftarnya sendiri, bukan ditandai satu per satu: menu
   * bersarang berikutnya otomatis ikut benar tanpa ada yang perlu ingat
   * memasang bendera. `/Project` masuk daftar karena ada `/Project/Report`.
   */
  private _indukSrc: any[] | null = null;
  private _induk = new Set<string>();

  get ruteInduk(): Set<string> {
    if (this._indukSrc !== this.items) {
      this._indukSrc = this.items;
      const semua: string[] = [];
      for (const g of this.items || []) {
        for (const i of g?.children || []) {
          if (i?.route) semua.push(i.route);
        }
      }
      this._induk = new Set(
        semua.filter((a) => semua.some((b) => b !== a && b.startsWith(a + '/'))),
      );
    }
    return this._induk;
  }

  punyaRuteAnak(route?: string): boolean {
    return !!route && this.ruteInduk.has(route);
  }

  constructor(
    private router: Router,
    private translate: TranslateService,
  ) {}

  buildStatus: string = 'Alpha';
  version: string = '1.0.0';
  releaseDate: Date = new Date('2025-05-15');

  private COLLAPSE_KEY = 'terrabot.sidenav.collapsed';
  private PIN_KEY = 'terrabot.sidenav.pinned';

  collapsedGroups: string[] = [];
  pinnedRoutes: string[] = [];
  filter: string = '';

  ngOnInit(): void {
    this.collapsedGroups = this.loadState(this.COLLAPSE_KEY);
    this.pinnedRoutes = this.loadState(this.PIN_KEY);

    // make sure the group holding the current route is expanded
    const url = this.router.url;
    const activeGroup = this.topGroups.find((g) =>
      (g.children || []).some((i: any) => i.route === url),
    );
    if (activeGroup) {
      this.collapsedGroups = this.collapsedGroups.filter(
        (n) => n !== activeGroup.name,
      );
    }
  }

  private loadState(key: string): string[] {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveState(key: string, value: any) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }

  // ----- groups -----
  get bottomGroup(): any {
    const list = this.items || [];
    return list.find((g) => g.name === 'General') || list[list.length - 1];
  }

  /*
   * Hasilnya disimpan agar tidak menghasilkan array baru pada setiap siklus
   * deteksi perubahan. Array baru membuat @for menganggap seluruh isinya
   * berganti, sehingga menu dirender ulang terus-menerus.
   */
  private _topGroupsSrc: any[] | null = null;
  private _topGroups: any[] = [];

  get topGroups(): any[] {
    if (this._topGroupsSrc !== this.items) {
      this._topGroupsSrc = this.items;
      const bottom = this.bottomGroup;
      this._topGroups = (this.items || []).filter((g) => g !== bottom);
    }
    return this._topGroups;
  }

  isCollapsed(name: string): boolean {
    return this.collapsedGroups.includes(name);
  }

  toggleGroup(name: string) {
    this.collapsedGroups = this.isCollapsed(name)
      ? this.collapsedGroups.filter((n) => n !== name)
      : [...this.collapsedGroups, name];
    this.saveState(this.COLLAPSE_KEY, this.collapsedGroups);
  }

  // ----- pinning -----
  private get pinnableItems(): any[] {
    return this.topGroups.reduce(
      (acc, g) => acc.concat(g.children || []),
      [] as any[],
    );
  }

  get pinnedItems(): any[] {
    return this.pinnedRoutes
      .map((r) => this.pinnableItems.find((i) => i.route === r))
      .filter((i) => !!i);
  }

  isPinned(route?: string): boolean {
    return !!route && this.pinnedRoutes.includes(route);
  }

  togglePin(item: any) {
    const route = item?.route;
    if (!route) return;
    this.pinnedRoutes = this.isPinned(route)
      ? this.pinnedRoutes.filter((r) => r !== route)
      : [...this.pinnedRoutes, route];
    this.saveState(this.PIN_KEY, this.pinnedRoutes);
  }

  // ----- search filter -----
  get isFiltering(): boolean {
    return this.filter.trim().length > 0;
  }

  /**
   * Cocokkan pencarian dengan teks yang tampil, bukan kunci i18n.
   *
   * Nama menu kini berupa kunci ('nav.purchaseOrder'), sehingga mencocokkan
   * nilai mentahnya membuat pencarian dalam bahasa apa pun tidak ketemu.
   */
  matches(item: any): boolean {
    const q = this.filter.trim().toLowerCase();
    if (!q) return true;
    const key = item?.name || '';
    const label = this.translate.instant(key) || key;
    return String(label).toLowerCase().includes(q);
  }

  /**
   * Halaman DI DALAM Data Master yang cocok dengan pencarian menu.
   *
   * Klien, Pemasok, Karyawan, dan lainnya tidak punya butir sendiri di menu
   * samping — mereka tersarang di bawah "Data Master". Tanpa ini, mengetik
   * "klien" di kotak cari menu tidak menemukan apa pun. Daftarnya sama
   * dengan pencarian global (MASTER_NAV), dan hanya yang boleh dibuka.
   */
  get hasilMaster(): { name: string; route: string; icon: string }[] {
    if (!this.isFiltering) return KOSONG;
    const adaMaster = (this.items || []).some((g: any) =>
      (g.children || []).some((c: any) => c.route === '/Master'),
    );
    if (!adaMaster) return KOSONG;
    const q = this.filter.trim().toLowerCase();
    const boleh = MASTER_NAV.filter((m) => this.izin.canRead(m.modul));

    /*
     * LARIK YANG SAMA dikembalikan selama masukannya sama.
     *
     * Getter ini dibaca setiap putaran deteksi perubahan. Dulu ia membuat
     * larik dan objek BARU tiap kali, sehingga `*ngFor` membuang dan membuat
     * ulang seluruh `app-side-nav-item`. Tiap butir baru memasang
     * `routerLinkActive`, yang menjadwalkan pembaruannya di microtask —
     * microtask itu memicu deteksi perubahan lagi, getter membuat larik baru
     * lagi, butirnya dibuat ulang lagi... tanpa ujung. Halamannya membeku
     * begitu satu huruf diketik, dan tombol muat ulang pun tidak sempat
     * dilayani karena antrean microtask tidak pernah kosong.
     */
    const kunci = [q, this.translate.currentLang, ...boleh.map((m) => m.route)].join('|');
    if (this.cacheMaster?.kunci === kunci) return this.cacheMaster.hasil;

    const hasil = boleh
      .filter((m) => {
        const label = String(this.translate.instant(m.name) || m.name).toLowerCase();
        return label.includes(q) || m.route.toLowerCase().includes(q);
      })
      .map((m) => ({ name: m.name, route: '/Master/' + m.route, icon: m.svg }));
    this.cacheMaster = { kunci, hasil };
    return hasil;
  }

  private cacheMaster?: {
    kunci: string;
    hasil: { name: string; route: string; icon: string }[];
  };

  /** Butir menu dikenali dari rutenya — lihat `hasilMaster`. */
  readonly lacakRute = (_: number, i: { route: string }) => i.route;

  groupHasMatch(group: any): boolean {
    if (!this.isFiltering) return true;
    return (group.children || []).some((i: any) => this.matches(i));
  }

  clearFilter() {
    this.filter = '';
  }
}
