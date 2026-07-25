import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { SideNavItemComponent } from './side-nav-item/side-nav-item.component';

@Component({
  selector: 'app-side-nav',
  imports: [CommonModule, FormsModule, RouterModule, SideNavItemComponent],
  templateUrl: './side-nav.component.html',
  styleUrls: ['./side-nav.component.scss'],
  standalone: true,
})
export class SideNavComponent implements OnInit {
  @Input('items') items: any[] = [];

  constructor(private router: Router) {}

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

  get topGroups(): any[] {
    const bottom = this.bottomGroup;
    return (this.items || []).filter((g) => g !== bottom);
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

  matches(item: any): boolean {
    const q = this.filter.trim().toLowerCase();
    return !q || (item?.name || '').toLowerCase().includes(q);
  }

  groupHasMatch(group: any): boolean {
    if (!this.isFiltering) return true;
    return (group.children || []).some((i: any) => this.matches(i));
  }

  clearFilter() {
    this.filter = '';
  }
}
