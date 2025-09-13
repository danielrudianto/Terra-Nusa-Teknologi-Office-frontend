import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PpnRecapComponent } from '../ppn-recap/ppn-recap.component';
import { PphRecapComponent } from '../pph-recap/pph-recap.component';

@Component({
  selector: 'app-tax-list',
  standalone: false,
  templateUrl: './tax-list.component.html',
  styleUrl: './tax-list.component.scss',
})
export class TaxListComponent {
  breakpoint = 3;

  constructor(private dialog: MatDialog) {}

  ngOnInit(): void {
    this.breakpoint =
      window.innerWidth <= 900
        ? 1
        : window.innerWidth <= 1250
        ? 2
        : window.innerWidth <= 1400
        ? 3
        : 4;
  }

  openPPNReport() {
    this.dialog.open(PpnRecapComponent, {});
  }

  openPPHReport() {
    this.dialog.open(PphRecapComponent, {});
  }

  onResize(event: any) {
    this.breakpoint =
      window.innerWidth <= 900
        ? 1
        : window.innerWidth <= 1250
        ? 2
        : window.innerWidth <= 1400
        ? 3
        : 4;
  }
}
