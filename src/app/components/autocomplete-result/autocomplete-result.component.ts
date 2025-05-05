import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-autocomplete-result',
  templateUrl: './autocomplete-result.component.html',
  styleUrls: ['./autocomplete-result.component.scss'],
})
export class AutocompleteResultComponent {
  @Input('width') width!: number;
  @Input('height') height!: number;
  @Input('x') x!: number;
  @Input('y') y!: number;
  @Input('isFocused') isFocused!: boolean;
  @Input("results") results!: any[];
}
