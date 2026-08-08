import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-top-navigation-bookmark',
  imports: [CommonModule, MatIconModule],
  templateUrl: './top-navigation-bookmark.component.html',
  styleUrl: './top-navigation-bookmark.component.scss',
})
export class TopNavigationBookmarkComponent {
  @Input('label') label!: string;
}
