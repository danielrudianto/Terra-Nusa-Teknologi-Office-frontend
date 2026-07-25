import { CommonModule } from '@angular/common';
import { Component, Inject, Input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-month-selector',
  imports: [MatDialogModule, MatIconModule, MatButtonModule, CommonModule],
  templateUrl: './month-selector.component.html',
  styleUrl: './month-selector.component.scss',
})
export class MonthSelectorComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { month: number; year: number },
    private dialog: MatDialogRef<MonthSelectorComponent>
  ) {}

  year: number = this.data.year;
  month: number = this.data.month;
  animateUp = false;
  animateDown = false;
  yearAnimating = false;

  isSelected(selectedMonth: number): boolean {
    if (this.month === selectedMonth && this.data.year === this.year) {
      return true;
    }

    return false;
  }

  onYearIncrement() {
    this.animateUp = true;
    this.yearAnimating = true;
    // Optionally: disable buttons during animation
    setTimeout(() => {
      this.animateUp = false;
      this.year++;
      setTimeout(() => (this.yearAnimating = false), 400);
    }, 400); // match transition duration
  }

  onYearDecrement() {
    this.animateDown = true;
    this.yearAnimating = true;
    setTimeout(() => {
      this.animateDown = false;
      this.year--;
      setTimeout(() => (this.yearAnimating = false), 300); // match transition duration
    }, 300);
  }

  onAnimationEnd() {
    this.animateUp = false;
    this.animateDown = false;
  }

  selectMonth(month: number) {
    this.dialog.close({
      month: month,
      year: this.year,
    });
  }
}
