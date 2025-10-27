import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-side-nav-item',
  imports: [CommonModule, RouterModule],
  templateUrl: './side-nav-item.component.html',
  styleUrl: './side-nav-item.component.scss',
})
export class SideNavItemComponent {
  @Input('label') label!: string;
  @Input('icon') icon!: string;
  @Input('routerLink') routerLink!: string;

  get iconSource(): string {
    return '/assets/vector/' + this.icon;
  }
}
