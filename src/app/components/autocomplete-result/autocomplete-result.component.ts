import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-autocomplete-result',
  templateUrl: './autocomplete-result.component.html',
  styleUrls: ['./autocomplete-result.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class AutocompleteResultComponent {
  constructor(private router: Router) {}

  @Input('width') width!: number;
  @Input('height') height!: number;
  @Input('x') x!: number;
  @Input('y') y!: number;
  @Input('isFocused') isFocused!: boolean;
  @Input('results') results!: any[];

  onClick(event: any) {
    this.router.navigate([event.routerLink]);
  }
}
