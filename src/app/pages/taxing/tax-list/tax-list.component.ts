import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PpnRecapComponent } from '../ppn-recap/ppn-recap.component';
import { PphRecapComponent } from '../pph-recap/pph-recap.component';
import { PphSalaryRecapComponent } from '../pph-salary-recap/pph-salary-recap.component';
import { MonthlyRecapComponent } from 'src/app/pages/taxing/monthly-recap/monthly-recap.component';

@Component({
  selector: 'app-tax-list',
  standalone: true,
  templateUrl: './tax-list.component.html',
  styleUrl: './tax-list.component.scss',
})
export class TaxListComponent {
  breakpoint = 3;

  // ---- period chosen once, reused by every report ----
  month: number = new Date().getMonth() + 1;
  year: number = new Date().getFullYear();
  months: { n: number; label: string }[] = [
    { n: 1, label: 'Jan' },
    { n: 2, label: 'Feb' },
    { n: 3, label: 'Mar' },
    { n: 4, label: 'Apr' },
    { n: 5, label: 'Mei' },
    { n: 6, label: 'Jun' },
    { n: 7, label: 'Jul' },
    { n: 8, label: 'Agu' },
    { n: 9, label: 'Sep' },
    { n: 10, label: 'Okt' },
    { n: 11, label: 'Nov' },
    { n: 12, label: 'Des' },
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
