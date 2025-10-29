import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TopNavigationBookmarkComponent } from './top-navigation-bookmark/top-navigation-bookmark.component';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-top-navigation',
  imports: [
    TopNavigationBookmarkComponent,
    MatButtonModule,
    MatToolbarModule,
    MatIconModule,
    RouterModule,
  ],
  templateUrl: './top-navigation.component.html',
  styleUrl: './top-navigation.component.scss',
})
export class TopNavigationComponent {
  @Input('label') label!: string;
  @Output('onBookmarkClicked') onBookmarkClicked: EventEmitter<void> =
    new EventEmitter<void>();

  onMenuClicked() {
    this.onBookmarkClicked.emit();
  }
}
