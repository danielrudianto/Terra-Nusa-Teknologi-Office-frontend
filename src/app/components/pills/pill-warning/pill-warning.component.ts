import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-pill-warning',
  imports: [],
  templateUrl: './pill-warning.component.html',
  styleUrl: './pill-warning.component.scss',
})
export class PillWarningComponent {
  @Input('label') label!: string;
}
