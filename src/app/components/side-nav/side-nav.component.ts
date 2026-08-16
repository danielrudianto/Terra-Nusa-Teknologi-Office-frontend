import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { SideNavItemComponent } from './side-nav-item/side-nav-item.component';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LogoComponent } from '../logo/logo.component';
import { VersiService } from 'src/app/services/versi.service';
import { MatIconModule } from '@angular/material/icon';

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

  groupHasMatch(group: any): boolean {
    if (!this.isFiltering) return true;
    return (group.children || []).some((i: any) => this.matches(i));
  }

  clearFilter() {
    this.filter = '';
  }
}
