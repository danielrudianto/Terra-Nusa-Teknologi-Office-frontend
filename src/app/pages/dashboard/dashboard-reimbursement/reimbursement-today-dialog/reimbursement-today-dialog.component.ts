import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';

export interface ReimbursementDialogItem {
  id: number;
  name: string;
  date: string;
  projectName: string;
  amount: number;
}

export interface ReimbursementTodayDialogData {
  items: ReimbursementDialogItem[];
  total: number;
}

@Component({
  selector: 'app-reimbursement-today-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, TranslatePipe],
  templateUrl: './reimbursement-today-dialog.component.html',
  styleUrl: './reimbursement-today-dialog.component.scss',
})
export class ReimbursementTodayDialogComponent {
  items: ReimbursementDialogItem[] = [];
  total = 0;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ReimbursementTodayDialogData,
    private dialogRef: MatDialogRef<ReimbursementTodayDialogComponent>,
  ) {
    this.items = data.items ?? [];
    this.total =
      data.total ?? this.items.reduce((s, it) => s + (it.amount || 0), 0);
  }

  initial(name: string): string {
    return (name || '?').charAt(0).toUpperCase();
  }

  formatIDR(n: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(n ?? 0);
  }

  view(id: number): void {
    this.dialogRef.close({ view: id });
  }

  close(): void {
    this.dialogRef.close();
  }
}
