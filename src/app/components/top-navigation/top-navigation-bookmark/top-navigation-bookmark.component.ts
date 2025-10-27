import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-top-navigation-bookmark',
  imports: [CommonModule],
  templateUrl: './top-navigation-bookmark.component.html',
  styleUrl: './top-navigation-bookmark.component.scss',
})
export class TopNavigationBookmarkComponent {
  @Input('label') label!: string;
}
