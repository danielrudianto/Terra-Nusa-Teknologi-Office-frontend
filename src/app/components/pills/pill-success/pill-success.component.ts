import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-pill-success',
  imports: [MatIconModule],
  templateUrl: './pill-success.component.html',
  styleUrl: './pill-success.component.scss',
})
export class PillSuccessComponent {
  @Input('label') label!: string;
}
