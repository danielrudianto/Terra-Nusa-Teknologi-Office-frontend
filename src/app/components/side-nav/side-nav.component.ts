import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Router, RouterModule } from '@angular/router';
import { SideNavItemComponent } from './side-nav-item/side-nav-item.component';

@Component({
  selector: 'app-side-nav',
  imports: [
    CommonModule,
    MatDividerModule,
    RouterModule,
    MatIconModule,
    MatMenuModule,
    SideNavItemComponent,
  ],
  templateUrl: './side-nav.component.html',
  styleUrls: ['./side-nav.component.scss'],
  standalone: true,
})
export class SideNavComponent {
  @Input('items') items!: any[];
  constructor(private router: Router) {}

  // get version from appVersion
  buildStatus: string = 'Alpha';
  version: string = '1.0.0';
  releaseDate: Date = new Date('2025-05-15');

  onItemClick(item: any) {
    if (item.hasOwnProperty('route')) {
      // navigate to route
      this.router.navigate([item.route]);
    } else {
      item.click();
    }
  }
}
