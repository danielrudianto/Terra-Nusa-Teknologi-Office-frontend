import { Component, Input } from '@angular/core';
import { TopNavigationBookmarkComponent } from './top-navigation-bookmark/top-navigation-bookmark.component';

@Component({
  selector: 'app-top-navigation',
  imports: [TopNavigationBookmarkComponent],
  templateUrl: './top-navigation.component.html',
  styleUrl: './top-navigation.component.scss',
})
export class TopNavigationComponent {
  @Input('label') label!: string;
}
