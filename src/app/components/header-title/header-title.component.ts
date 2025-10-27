import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-header-title',
  imports: [CommonModule, MatIconModule],
  templateUrl: './header-title.component.html',
  styleUrl: './header-title.component.scss',
})
export class HeaderTitleComponent {
  @Input('title') title!: string;
  @Input('description') description!: string;
  @Input('actionButtonLabel') actionButtonLabel: string | null = null;

  @Output('onActionButtonClicked') onActionButtonClicked: EventEmitter<void> =
    new EventEmitter();

  actionButtonClicked() {
    this.onActionButtonClicked.emit();
  }
}
