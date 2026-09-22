import { MatTooltipModule } from '@angular/material/tooltip';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy} from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-side-nav-item',
  imports: [TranslatePipe, CommonModule, RouterModule, MatTooltipModule],
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
  /**
   * Jumlah yang MENUNGGU pengguna ini pada menu tersebut.
   *
   * `null` berarti tidak digambar — baik karena memang kosong maupun karena
   * tidak diketahui. Keduanya sengaja terlihat sama: lencana "0" hanya
   * menambah keramaian pada menu yang justru sedang bersih.
   */
  @Input('badge') badge: number | null = null;
  /** Kunci terjemahan yang menjelaskan apa yang dihitung lencananya. */
  @Input() badgeKet: string | null = null;

  /** Lebih dari 99 ditulis "99+"; tiga angka merusak lebar menunya. */
  get badgeText(): string {
    const n = Number(this.badge) || 0;
    return n > 99 ? '99+' : String(n);
  }

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
