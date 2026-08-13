import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PpnRecapComponent } from '../ppn-recap/ppn-recap.component';
import { PphRecapComponent } from '../pph-recap/pph-recap.component';
import { PphSalaryRecapComponent } from '../pph-salary-recap/pph-salary-recap.component';
import { MonthlyRecapComponent } from 'src/app/pages/taxing/monthly-recap/monthly-recap.component';
import { TranslatePipe } from '@ngx-translate/core';
import { HeaderTitleComponent } from '../../../components/header-title/header-title.component';

@Component({
  selector: 'app-tax-list',
  standalone: true,
  imports: [HeaderTitleComponent, TranslatePipe],
  templateUrl: './tax-list.component.html',
  styleUrl: './tax-list.component.scss',
})
export class TaxListComponent {
  breakpoint = 3;

  // ---- period chosen once, reused by every report ----
  month: number = new Date().getMonth() + 1;
  year: number = new Date().getFullYear();
  /** Label bulan singkat mengikuti bahasa aplikasi. */
  months: { n: number; key: string }[] = [
    { n: 1, key: 'common.janShort' },
    { n: 2, key: 'common.febShort' },
    { n: 3, key: 'common.marShort' },
    { n: 4, key: 'common.aprShort' },
    { n: 5, key: 'common.mayShort' },
    { n: 6, key: 'common.junShort' },
    { n: 7, key: 'common.julShort' },
    { n: 8, key: 'common.augShort' },
    { n: 9, key: 'common.sepShort' },
    { n: 10, key: 'common.octShort' },
    { n: 11, key: 'common.novShort' },
    { n: 12, key: 'common.decShort' },
  ];

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

  selectMonth(n: number) {
    this.month = n;
  }

  prevYear() {
    this.year--;
  }

  nextYear() {
    this.year++;
  }

  private period() {
    return { month: this.month, year: this.year };
  }

  openPPNReport() {
    this.dialog.open(PpnRecapComponent, { data: this.period() });
  }

  openPPHReport() {
    this.dialog.open(PphRecapComponent, { data: this.period() });
  }

  openPPHSalaryReport() {
    this.dialog.open(PphSalaryRecapComponent, { data: this.period() });
  }

  openMonthlyReport() {
    this.dialog.open(MonthlyRecapComponent, { data: this.period() });
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
