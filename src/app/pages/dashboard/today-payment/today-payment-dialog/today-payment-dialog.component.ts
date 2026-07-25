import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';

export type PaymentType =
  | 'purchase'
  | 'expense'
  | 'reimbursement'
  | 'salary'
  | 'loan'
  | 'other';

export interface TodayPaymentItem {
  id: number;
  type: PaymentType;
  typeLabel: string;
  color: string;
  title: string;
  subtitle: string;
  bankLabel: string;
  amount: number;
  isApprove: boolean;
}

export interface TodayPaymentDialogData {
  dateLabel: string;
  items: TodayPaymentItem[];
  total: number;
}

interface BankGroup {
  bankLabel: string;
  items: TodayPaymentItem[];
  subtotal: number;
}

@Component({
  selector: 'app-today-payment-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  templateUrl: './today-payment-dialog.component.html',
  styleUrl: './today-payment-dialog.component.scss',
})
export class TodayPaymentDialogComponent {
  groups: BankGroup[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: TodayPaymentDialogData,
    private dialog: MatDialogRef<TodayPaymentDialogComponent>,
  ) {
    this.groups = this.groupByBank(data.items ?? []);
  }

  private groupByBank(items: TodayPaymentItem[]): BankGroup[] {
    const map = new Map<string, BankGroup>();
    for (const it of items) {
      const key = it.bankLabel || 'Tanpa rekening';
      if (!map.has(key)) {
        map.set(key, { bankLabel: key, items: [], subtotal: 0 });
      }
      const g = map.get(key)!;
      g.items.push(it);
      g.subtotal += it.amount;
    }
    return Array.from(map.values()).sort((a, b) => b.subtotal - a.subtotal);
  }

  formatIDR(n: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(n ?? 0);
  }

  close(): void {
    this.dialog.close();
  }
}
