import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PpnRecapComponent } from '../ppn-recap/ppn-recap.component';

@Component({
  selector: 'app-tax-list',
  standalone: false,
  templateUrl: './tax-list.component.html',
  styleUrl: './tax-list.component.scss',
})
export class TaxListComponent {
  constructor(private dialog: MatDialog) {}

  openPPNReport() {
    this.dialog.open(PpnRecapComponent, {});
  }
}
