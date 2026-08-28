import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy} from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-side-nav-item',
  imports: [TranslatePipe, CommonModule, RouterModule],
  templateUrl: './side-nav-item.component.html',
  styleUrl: './side-nav-item.component.scss',
})
export class SideNavItemComponent {
  @Input('label') label!: string;
  @Input('icon') icon!: string;
  @Input('routerLink') routerLink?: string;
  @Input('action') action?: () => void;
  @Input('pinned') pinned: boolean = false;
  @Input('showPin') showPin: boolean = true;

  /**
   * Rute lain yang bersarang di bawah rute ini.
   *
   * Dipakai untuk menentukan pencocokan `routerLinkActive`. Tanpa ini,
   * `/Project` ikut menyala saat halaman `/Project/Report` dibuka, sehingga
   * dua butir menu tampak aktif bersamaan dan pengguna tidak tahu ia sedang
   * berada di mana.
   */
  @Input('hasChildRoutes') hasChildRoutes: boolean = false;
  @Output('pinToggle') pinToggle = new EventEmitter<void>();

  get iconSource(): string {
    return '/assets/vector/' + this.icon;
  }

  onActivate() {
    // items without a route (e.g. Logout) run their action instead
    if (!this.routerLink && this.action) {
      this.action();
    }
  }

  onPin(event: Event) {
    event.stopPropagation();
    event.preventDefault();
    this.pinToggle.emit();
  }
}
