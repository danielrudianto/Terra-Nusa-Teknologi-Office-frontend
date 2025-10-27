import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-pill-danger',
  imports: [],
  templateUrl: './pill-danger.component.html',
  styleUrl: './pill-danger.component.scss',
})
export class PillDangerComponent {
  @Input('label') label!: string;
}
